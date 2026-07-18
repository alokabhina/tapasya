import express from 'express'
import authMiddleware from '../middleware/auth.js'
import Todo from '../models/Todo.js'
import { getStudyDayString } from '../utils/dayBoundary.js'

const router = express.Router()
router.use(authMiddleware) // global middleware to protect all routes

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
    const todo = await Todo.create({ ...req.body, userId: req.user.id })
    res.json(todo)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// PUT /api/todos/:id
router.put('/:id', async (req, res) => {
  try {
    const updates = { ...req.body }
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