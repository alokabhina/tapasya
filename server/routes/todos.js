import express from 'express'
import authMiddleware from '../middleware/auth.js'
import Todo from '../models/Todo.js'
import WatchItem from '../models/WatchItem.js'
import { getStudyDayString } from '../utils/dayBoundary.js'

const router = express.Router()
router.use(authMiddleware) // global middleware to protect all routes

const CLOCK_RE = /^([01]\d|2[0-3]):[0-5]\d$/

// Clients never get to set server-owned fields, and the optional time limit
// is normalised: invalid/blank -> null, endTime without startTime -> null,
// endTime that isn't after startTime -> null (never throws, so an offline
// sync-queue replay can't get stuck on a bad payload).
function sanitizeTodoBody(body = {}) {
  const out = { ...body }
  delete out.userId
  delete out.remindedAt
  if ('startTime' in out || 'endTime' in out) {
    const start = CLOCK_RE.test(out.startTime || '') ? out.startTime : null
    let end = CLOCK_RE.test(out.endTime || '') ? out.endTime : null
    if (!start || (end && end <= start)) end = null
    if ('startTime' in out) out.startTime = start
    if ('endTime' in out || start === null) out.endTime = end
  }
  return out
}

// GET /api/todos?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
router.get('/', async (req, res) => {
  try {
    const { startDate, endDate, date } = req.query
    const filter = { userId: req.user.id }

    if (date) {
      filter.date = date
    } else {
      if (startDate) filter.date = { $gte: startDate }
      if (endDate)   filter.date = { ...filter.date, $lte: endDate }
    }

    const todos = await Todo.find(filter).sort({ createdAt: 1 })
    res.json(todos)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// POST /api/todos
router.post('/', async (req, res) => {
  try {
    const todo = await Todo.create({ ...sanitizeTodoBody(req.body), userId: req.user.id })
    res.json(todo)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// PUT /api/todos/:id
router.put('/:id', async (req, res) => {
  try {
    const updates = sanitizeTodoBody(req.body)

    // Moving the date or changing the start time = a fresh reminder should
    // fire for the new slot, so clear the "already reminded" marker — but
    // only when the value really changed (a client re-sending the same
    // date/startTime must not trigger a second push).
    if ('startTime' in updates || 'date' in updates) {
      const existing = await Todo.findOne({ _id: req.params.id, userId: req.user.id }).select('date startTime').lean()
      if (existing) {
        const dateChanged  = 'date' in updates && updates.date !== existing.date
        const startChanged = 'startTime' in updates && (updates.startTime || null) !== (existing.startTime || null)
        if (dateChanged || startChanged) updates.remindedAt = null
      }
    }
    // Auto-set completedAt when marking done
    if (updates.done === true && !updates.completedAt) {
      // Study-day rule (3am IST cutoff) — see server/utils/dayBoundary.js.
      // Used to check `now.getHours() < 4` directly, which ran in the
      // server's own timezone (usually UTC on most hosts) instead of IST —
      // completely different cutoff moment than the client's.
      updates.completedAt = getStudyDayString()
    }
    if (updates.done === false) {
      updates.completedAt = null
    }

    const todo = await Todo.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      updates,
      { new: true }
    )
    if (!todo) return res.status(404).json({ error: 'Todo not found' })

    // Two-way sync: if this todo is linked to a watchlist video, ticking
    // the todo done/undone also flips that video's `completed` flag — so
    // whichever side the user finishes from, both stay in sync. Best-effort:
    // never let a WatchItem sync failure fail the todo update itself.
    if (typeof updates.done === 'boolean' && todo.linkedWatchItem?.itemId) {
      WatchItem.findOneAndUpdate(
        { _id: todo.linkedWatchItem.itemId, userId: req.user.id },
        { completed: updates.done, completedAt: updates.done ? new Date() : null }
      ).catch(() => {})
    }

    res.json(todo)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// DELETE /api/todos/:id
router.delete('/:id', async (req, res) => {
  try {
    await Todo.findOneAndDelete({ _id: req.params.id, userId: req.user.id })
    res.json({ ok: true })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

export default router