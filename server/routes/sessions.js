import express from 'express'
import authMiddleware from '../middleware/auth.js'
import Session from '../models/Session.js'

const router = express.Router()
router.use(authMiddleware)

// ── In-memory active session store (per user) ─────────────────────────────────
// { userId -> { deviceId, subjectId, subjectName, subjectColor, startTime, elapsed, pausedAt, totalPausedSeconds, updatedAt } }
const _activeSessions = new Map()

// ── GET sessions list ─────────────────────────────────────────────────────────
router.get('/', async (req, res) => {
  const { startDate, endDate } = req.query
  const filter = { userId: req.user.id }
  if (startDate) filter.date = { $gte: startDate }
  if (endDate)   filter.date = { ...filter.date, $lte: endDate }
  const sessions = await Session.find(filter).sort('-date')
  res.json(sessions)
})

// ── POST active session heartbeat (timer running on a device) ─────────────────
// Client sends this every 15s while timer is running. Used to detect cross-device conflicts.
router.post('/active', (req, res) => {
  const userId = String(req.user.id)
  const { deviceId, subjectId, subjectName, subjectColor, startTime, elapsed, isPaused, totalPausedSeconds } = req.body
  _activeSessions.set(userId, {
    deviceId, subjectId, subjectName, subjectColor,
    startTime, elapsed: elapsed || 0,
    isPaused: isPaused || false,
    totalPausedSeconds: totalPausedSeconds || 0,
    updatedAt: Date.now(),
  })
  res.json({ ok: true })
})

// ── GET active session for current user (for cross-device detection) ──────────
router.get('/active', (req, res) => {
  const userId = String(req.user.id)
  const active = _activeSessions.get(userId)
  if (!active) return res.json({ active: false })
  // Stale = not updated in 30s (device went offline/crashed)
  const stale = Date.now() - active.updatedAt > 30_000
  if (stale) {
    _activeSessions.delete(userId)
    return res.json({ active: false })
  }
  res.json({ active: true, ...active })
})

// ── DELETE active session (timer stopped) ────────────────────────────────────
router.delete('/active', (req, res) => {
  const userId = String(req.user.id)
  _activeSessions.delete(userId)
  res.json({ ok: true })
})

// ── POST save session ─────────────────────────────────────────────────────────
router.post('/', async (req, res) => {
  const session = await Session.create({ ...req.body, userId: req.user.id })
  res.json(session)
})

router.put('/:id', async (req, res) => {
  const session = await Session.findOneAndUpdate(
    { _id: req.params.id, userId: req.user.id }, req.body, { new: true })
  res.json(session)
})

router.delete('/:id', async (req, res) => {
  await Session.findOneAndDelete({ _id: req.params.id, userId: req.user.id })
  res.json({ ok: true })
})

export default router