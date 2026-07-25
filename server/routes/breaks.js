import express from 'express'
import mongoose from 'mongoose'
import authMiddleware from '../middleware/auth.js'
import BreakSession from '../models/BreakSession.js'
import { getStudyDayString, addDays } from '../utils/dayBoundary.js'

const router = express.Router()
router.use(authMiddleware)

const TYPES = ['lunch', 'walk', 'nap', 'rest', 'custom']

// ── POST /api/breaks — save a completed break ──────────────────────────────
router.post('/', async (req, res) => {
  try {
    const { type, label, startTime, endTime, duration, date } = req.body
    if (!startTime || !endTime || !duration || duration < 1) {
      return res.status(400).json({ error: 'Invalid break payload' })
    }
    const brk = await BreakSession.create({
      userId: req.user.id,
      type: TYPES.includes(type) ? type : 'rest',
      label: type === 'custom' ? String(label || '').slice(0, 40) : '',
      startTime, endTime, duration,
      date: date || getStudyDayString(),
    })
    res.json(brk)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// ── GET /api/breaks — history, optionally scoped by range ─────────────────
router.get('/', async (req, res) => {
  try {
    const { range = '30d', page = 1, limit = 30 } = req.query
    const filter = { userId: req.user.id }
    if (range !== 'all') {
      const days = range === '7d' ? 6 : range === '30d' ? 29 : 29
      filter.date = { $gte: addDays(getStudyDayString(), -days) }
    }
    const total = await BreakSession.countDocuments(filter)
    const breaks = await BreakSession.find(filter)
      .sort({ startTime: -1 })
      .skip((+page - 1) * +limit)
      .limit(+limit)
      .lean()
    res.json({ breaks, total, page: +page, pages: Math.max(1, Math.ceil(total / +limit)) })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// ── GET /api/breaks/stats — aggregates for the Wellbeing tab ──────────────
router.get('/stats', async (req, res) => {
  try {
    const today = getStudyDayString()
    const last7Start = addDays(today, -6)

    const [todayBreaks, last7Breaks, byTypeAgg] = await Promise.all([
      BreakSession.find({ userId: req.user.id, date: today }).lean(),
      BreakSession.find({ userId: req.user.id, date: { $gte: last7Start } }).lean(),
      BreakSession.aggregate([
        { $match: { userId: new mongoose.Types.ObjectId(req.user.id), date: { $gte: last7Start } } },
        { $group: { _id: '$type', totalDuration: { $sum: '$duration' }, count: { $sum: 1 } } },
      ]),
    ])

    // Per-day totals for the last 7 days (for the trend chart)
    const byDay = {}
    for (const b of last7Breaks) byDay[b.date] = (byDay[b.date] || 0) + b.duration

    const todayTotal = todayBreaks.reduce((s, b) => s + b.duration, 0)
    const byType = Object.fromEntries(byTypeAgg.map(g => [g._id, { totalDuration: g.totalDuration, count: g.count }]))

    res.json({
      todayTotal,
      todayCount: todayBreaks.length,
      byDay,       // { "2026-07-24": 1800, ... } seconds
      byType,      // { lunch: { totalDuration, count }, ... }
    })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

router.delete('/:id', async (req, res) => {
  await BreakSession.findOneAndDelete({ _id: req.params.id, userId: req.user.id })
  res.json({ ok: true })
})

export default router