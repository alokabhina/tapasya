// server/routes/speedmath.js
// Speed Math — Tables / Squares / Cubes / %-Fraction quiz engine
// Fully separate from Practice Arena's games.js (own models, own stats page)

import express from 'express'
import authMiddleware from '../middleware/auth.js'
import SpeedMathSession  from '../models/SpeedMathSession.js'
import SpeedMathProgress from '../models/SpeedMathProgress.js'

const router = express.Router()
router.use(authMiddleware)

// ── POST /api/speedmath/submit ───────────────────────────────────────────────
// body: { modules, config, breakdown: [{ module, itemKey, questionText, userAnswer, correctAnswer, isCorrect, timeTakenMs }] }
router.post('/submit', async (req, res) => {
  try {
    const { modules, config, breakdown = [] } = req.body
    if (!Array.isArray(modules) || modules.length === 0 || !Array.isArray(breakdown) || breakdown.length === 0) {
      return res.status(400).json({ error: 'modules[] and breakdown[] are required' })
    }

    const correctCount = breakdown.filter((b) => b.isCorrect).length
    const wrongCount   = breakdown.length - correctCount
    const avgTimeMs    = Math.round(breakdown.reduce((s, b) => s + (b.timeTakenMs || 0), 0) / breakdown.length)
    const accuracy     = Math.round((correctCount / breakdown.length) * 100)

    const session = await SpeedMathSession.create({
      userId: req.user.id,
      modules,
      config,
      totalQuestions: breakdown.length,
      correctCount,
      wrongCount,
      avgTimeMs,
      accuracy,
      breakdown,
    })

    // ── Update / create the user's progress doc ──────────────────────────────
    let progress = await SpeedMathProgress.findOne({ userId: req.user.id })
    if (!progress) progress = new SpeedMathProgress({ userId: req.user.id })

    for (const b of breakdown) {
      const item = progress.findOrCreateItem(b.module, b.itemKey)
      item.attempts += 1
      if (b.isCorrect) item.correctCount += 1
      else item.wrongCount += 1
      item.totalTimeMs   += (b.timeTakenMs || 0)
      item.lastAttempted = new Date()
    }

    progress.totalTests     += 1
    progress.totalQuestions += breakdown.length
    progress.totalCorrect   += correctCount

    // Daily streak — one test on a new calendar day extends it
    const today = new Date(); today.setHours(0, 0, 0, 0)
    const last  = progress.lastTestDate ? new Date(progress.lastTestDate) : null
    if (last) last.setHours(0, 0, 0, 0)
    if (!last || today.getTime() !== last.getTime()) {
      const oneDayMs = 24 * 60 * 60 * 1000
      const isConsecutive = last && (today.getTime() - last.getTime() === oneDayMs)
      progress.currentStreak = isConsecutive ? progress.currentStreak + 1 : 1
      progress.bestStreak    = Math.max(progress.bestStreak, progress.currentStreak)
    }
    progress.lastTestDate = new Date()

    await progress.save()

    // ── Build this-session weak-item suggestions (item-level, within this test only) ──
    const perItem = {}
    for (const b of breakdown) {
      const key = `${b.module}:${b.itemKey}`
      if (!perItem[key]) perItem[key] = { module: b.module, itemKey: b.itemKey, wrong: 0, total: 0, timeMs: 0 }
      perItem[key].total += 1
      perItem[key].timeMs += (b.timeTakenMs || 0)
      if (!b.isCorrect) perItem[key].wrong += 1
    }
    const suggestions = Object.values(perItem)
      .filter((it) => it.wrong > 0)
      .sort((a, b) => b.wrong - a.wrong || (b.timeMs / b.total) - (a.timeMs / a.total))
      .slice(0, 5)
      .map((it) => ({
        module: it.module,
        itemKey: it.itemKey,
        wrong: it.wrong,
        total: it.total,
        avgTimeMs: Math.round(it.timeMs / it.total),
      }))

    res.json({
      sessionId: session._id,
      correctCount,
      wrongCount,
      accuracy,
      avgTimeMs,
      currentStreak: progress.currentStreak,
      suggestions,
    })
  } catch (err) {
    console.error('speedmath/submit error:', err)
    res.status(500).json({ error: 'Failed to submit test' })
  }
})

// ── GET /api/speedmath/profile ───────────────────────────────────────────────
// Returns raw item stats (for heatmaps) + top weak items (for stats page + suggestions)
router.get('/profile', async (req, res) => {
  try {
    const progress = await SpeedMathProgress.findOne({ userId: req.user.id })
    if (!progress) {
      return res.json({
        totalTests: 0, totalQuestions: 0, totalCorrect: 0,
        overallAccuracy: 0, currentStreak: 0, bestStreak: 0,
        items: [], weakItems: [],
      })
    }

    const items = progress.items.map((i) => ({
      module: i.module,
      itemKey: i.itemKey,
      attempts: i.attempts,
      correctCount: i.correctCount,
      wrongCount: i.wrongCount,
      accuracy: i.attempts ? Math.round((i.correctCount / i.attempts) * 100) : null,
      avgTimeMs: i.attempts ? Math.round(i.totalTimeMs / i.attempts) : null,
      lastAttempted: i.lastAttempted,
    }))

    const weakItems = [...items]
      .filter((i) => i.attempts >= 2) // enough data to be meaningful
      .sort((a, b) => a.accuracy - b.accuracy || b.wrongCount - a.wrongCount)
      .slice(0, 8)

    res.json({
      totalTests:     progress.totalTests,
      totalQuestions: progress.totalQuestions,
      totalCorrect:   progress.totalCorrect,
      overallAccuracy: progress.totalQuestions ? Math.round((progress.totalCorrect / progress.totalQuestions) * 100) : 0,
      currentStreak:  progress.currentStreak,
      bestStreak:     progress.bestStreak,
      items,
      weakItems,
    })
  } catch (err) {
    console.error('speedmath/profile error:', err)
    res.status(500).json({ error: 'Failed to load profile' })
  }
})

// ── GET /api/speedmath/sessions ──────────────────────────────────────────────
router.get('/sessions', async (req, res) => {
  try {
    const sessions = await SpeedMathSession
      .find({ userId: req.user.id })
      .sort({ createdAt: -1 })
      .limit(20)
      .select('-breakdown') // history list doesn't need full breakdown
    res.json(sessions)
  } catch (err) {
    console.error('speedmath/sessions error:', err)
    res.status(500).json({ error: 'Failed to load history' })
  }
})

export default router