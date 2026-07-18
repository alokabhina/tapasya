import express from 'express'
import authMiddleware from '../middleware/auth.js'
import Question       from '../models/Question.js'
import GameSession    from '../models/GameSession.js'
import UserGameProfile from '../models/UserGameProfile.js'
import { selectQuestions }            from '../utils/questionSelector.js'
import { calcFinalScore, getLevel, getRank } from '../utils/xpCalculator.js'
import { getStudyDayString, addDays } from '../utils/dayBoundary.js'

const router = express.Router()
router.use(authMiddleware)

// ─── helpers ────────────────────────────────────────────────────────────────

function todayStr() {
  return getStudyDayString()
}

/** Get or create the UserGameProfile for the current user */
async function getOrCreateProfile(userId) {
  let profile = await UserGameProfile.findOne({ userId })
  if (!profile) profile = await UserGameProfile.create({ userId })
  return profile
}

/** Update weak topics array in a gameStats entry */
function updateWeakTopics(weakTopics = [], breakdown = []) {
  const map = {}
  for (const wt of weakTopics) map[wt.topic] = { ...wt }

  for (const q of breakdown) {
    if (!q.topic) continue
    if (!map[q.topic]) map[q.topic] = { topic: q.topic, wrongCount: 0, totalAttempts: 0 }
    map[q.topic].totalAttempts++
    if (!q.isCorrect) map[q.topic].wrongCount++
  }

  return Object.values(map)
}

/** Update question history for spaced repetition */
function mergeHistory(existing = [], breakdown = []) {
  const map = {}
  for (const h of existing) {
    const id = h.questionId?.toString()
    if (id) map[id] = { ...h }
  }

  for (const q of breakdown) {
    const id = q.questionId?.toString()
    if (!id) continue
    if (!map[id]) {
      map[id] = { questionId: q.questionId, topic: q.topic, gameType: q.gameType, wrongCount: 0, attemptCount: 0, lastAttempted: new Date() }
    }
    map[id].attemptCount++
    if (!q.isCorrect) map[id].wrongCount++
    else if (map[id].wrongCount > 0) map[id].wrongCount-- // spaced rep: decay on correct
    map[id].lastAttempted = new Date()
  }

  // Keep max 500 entries to avoid unbounded growth
  return Object.values(map).slice(-500)
}

// ─── GET /api/games/questions/:type ─────────────────────────────────────────
// Smart-selected question batch using spaced repetition
router.get('/questions/:type', async (req, res) => {
  try {
    const { type } = req.params
    const level    = parseInt(req.query.level) || 1
    const size     = parseInt(req.query.size)  || 20

    const validTypes = ['calculation', 'series', 'vocab', 'syllogism', 'survival', 'grammar']
    if (!validTypes.includes(type)) return res.status(400).json({ error: 'Invalid game type' })

    const profile   = await getOrCreateProfile(req.user.id)
    const questions = await selectQuestions({
      gameType: type,
      questionHistory: profile.questionHistory,
      level,
      batchSize: size,
    })

    res.json({ questions, sessionId: null }) // sessionId reserved for future use
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// ─── POST /api/games/submit ──────────────────────────────────────────────────
// Save result, award XP, update rank, update weak topics
// Body: { gameType, breakdown[], rawScore, correctCount, wrongCount, maxStreak, avgTimeSecs, maxLevel?, survivalCount?, mode? }
router.post('/submit', async (req, res) => {
  try {
    const {
      gameType, breakdown = [], rawScore = 0,
      correctCount = 0, wrongCount = 0,
      maxStreak = 0, avgTimeSecs = 0,
      maxLevel = 1, survivalCount = 0,
      mode = 'normal',
    } = req.body

    const { finalScore, xpEarned } = calcFinalScore({ rawScore, correctCount, wrongCount, mode, survivalCount })

    // Save game session
    const session = await GameSession.create({
      userId:        req.user.id,
      gameType,
      score:         finalScore,
      xpEarned,
      correctCount,
      wrongCount,
      totalQuestions: correctCount + wrongCount,
      avgTimeSecs,
      maxStreak,
      maxLevel,
      survivalCount,
      date:          todayStr(),
      breakdown,
    })

    // Update user game profile
    const profile = await getOrCreateProfile(req.user.id)
    const stats   = profile.gameStats[gameType] || {}

    const newRankPoints = (stats.rankPoints || 0) + finalScore
    const newRank       = getRank(newRankPoints)
    const newTotalXP    = profile.totalXP + xpEarned
    const newLevel      = getLevel(newTotalXP)

    // Update daily streak
    const today     = todayStr()
    const yesterday = addDays(today, -1)
    let dailyStreak = profile.dailyStreak || 0
    if (profile.lastGameDate === yesterday) dailyStreak++
    else if (profile.lastGameDate !== today) dailyStreak = 1

    await UserGameProfile.findOneAndUpdate(
      { userId: req.user.id },
      {
        $set: {
          totalXP:                    newTotalXP,
          level:                      newLevel,
          lastGameDate:               today,
          dailyStreak,
          [`gameStats.${gameType}.rankPoints`]:  newRankPoints,
          [`gameStats.${gameType}.rank`]:        newRank,
          [`gameStats.${gameType}.weakTopics`]:  updateWeakTopics(stats.weakTopics, breakdown),
          questionHistory:            mergeHistory(profile.questionHistory, breakdown),
        },
        $inc: {
          [`gameStats.${gameType}.gamesPlayed`]: 1,
        },
        $max: {
          [`gameStats.${gameType}.bestScore`]:   finalScore,
          [`gameStats.${gameType}.bestStreak`]:  maxStreak,
        },
      },
      { new: true, upsert: true }
    )

    const weakTopics = updateWeakTopics(stats.weakTopics, breakdown)
      .filter(w => w.wrongCount > 0)
      .sort((a, b) => b.wrongCount - a.wrongCount)
      .slice(0, 5)

    res.json({
      sessionId: session._id,
      finalScore,
      xpEarned,
      newTotalXP,
      newLevel,
      prevLevel: profile.level,
      newRank,
      prevRank:  stats.rank || 'bronze',
      rankPoints: newRankPoints,
      weakTopics,
      dailyStreak,
    })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// ─── GET /api/games/profile ──────────────────────────────────────────────────
// User XP, level, all game ranks
router.get('/profile', async (req, res) => {
  try {
    const profile = await getOrCreateProfile(req.user.id)
    res.json({
      totalXP:     profile.totalXP,
      level:       profile.level,
      gameStats:   profile.gameStats,
      dailyStreak: profile.dailyStreak,
      lastGameDate:profile.lastGameDate,
    })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// ─── GET /api/games/stats/:type ──────────────────────────────────────────────
// Analytics: weak topics, speed, score history (last 7)
router.get('/stats/:type', async (req, res) => {
  try {
    const { type } = req.params
    const validTypes = ['calculation', 'series', 'vocab', 'syllogism', 'survival', 'grammar']
    if (!validTypes.includes(type)) return res.status(400).json({ error: 'Invalid game type' })

    const [profile, sessions] = await Promise.all([
      getOrCreateProfile(req.user.id),
      GameSession.find({ userId: req.user.id, gameType: type })
        .sort({ createdAt: -1 })
        .limit(20)
        .lean(),
    ])

    const stats     = profile.gameStats?.[type] || {}
    const recentSessions = sessions.slice(0, 7)

    // Speed analysis from last 20 sessions breakdown
    let under5 = 0, between5_10 = 0, over10 = 0, total = 0
    for (const s of sessions) {
      for (const q of s.breakdown || []) {
        total++
        if (q.timeTaken < 5)       under5++
        else if (q.timeTaken < 10) between5_10++
        else                        over10++
      }
    }

    const speedStats = total > 0 ? {
      under5Pct:     Math.round((under5 / total) * 100),
      mid5to10Pct:   Math.round((between5_10 / total) * 100),
      over10Pct:     Math.round((over10 / total) * 100),
    } : { under5Pct: 0, mid5to10Pct: 0, over10Pct: 0 }

    // Wrong vocab words for Vocab Blitz chip display
    let wrongWords = []
    if (type === 'vocab') {
      for (const s of sessions) {
        for (const q of s.breakdown || []) {
          if (!q.isCorrect) wrongWords.push(q.topic || q.correctAnswer || '')
        }
      }
      wrongWords = [...new Set(wrongWords)].filter(Boolean).slice(0, 20)
    }

    res.json({
      weakTopics:   (stats.weakTopics || []).filter(w => w.wrongCount > 0).sort((a, b) => b.wrongCount - a.wrongCount),
      speedStats,
      recentScores: recentSessions.map(s => ({ score: s.score, date: s.date, correctCount: s.correctCount })),
      wrongWords,
      gamesPlayed:  stats.gamesPlayed || 0,
      bestScore:    stats.bestScore || 0,
      bestStreak:   stats.bestStreak || 0,
      rank:         stats.rank || 'bronze',
      rankPoints:   stats.rankPoints || 0,
    })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// ─── GET /api/games/history ──────────────────────────────────────────────────
// Last 20 game sessions across all types
router.get('/history', async (req, res) => {
  try {
    const sessions = await GameSession.find({ userId: req.user.id })
      .sort({ createdAt: -1 })
      .limit(20)
      .select('gameType score xpEarned correctCount wrongCount date maxStreak createdAt')
      .lean()
    res.json(sessions)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

export default router