// server/routes/money.js
// CRUD for the Money module — same simple shape as routes/todos.js
// (authMiddleware → scoped by req.user.id, no separate controller layer).

import express from 'express'
import authMiddleware from '../middleware/auth.js'
import Transaction from '../models/Transaction.js'
import MoneyCategory from '../models/MoneyCategory.js'
import QuickExpense from '../models/QuickExpense.js'
import { getStudyDayString } from '../utils/dayBoundary.js'

const router = express.Router()
router.use(authMiddleware)

// Remember a category the first time it's used, so it shows up as a chip
// next time without a separate "add category" step. Duplicates are fine
// — the unique index just means this upsert quietly no-ops.
async function rememberCategory(userId, name, type) {
  if (!name) return
  try {
    await MoneyCategory.findOneAndUpdate(
      { userId, type, name },
      { userId, type, name },
      { upsert: true }
    )
  } catch {
    // Race with another request creating the same category — harmless
  }
}

// GET /api/money/categories?type=expense
router.get('/categories', async (req, res) => {
  try {
    const filter = { userId: req.user.id }
    if (req.query.type) filter.type = req.query.type
    const cats = await MoneyCategory.find(filter).sort({ name: 1 })
    res.json(cats)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// GET /api/money/quick — saved one-tap expense presets
router.get('/quick', async (req, res) => {
  try {
    const items = await QuickExpense.find({ userId: req.user.id }).sort({ order: 1, createdAt: 1 })
    res.json(items)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// POST /api/money/quick — save a new preset
router.post('/quick', async (req, res) => {
  try {
    const { label, amount, category, type } = req.body

    if (!label || !label.trim()) return res.status(400).json({ error: 'Label is required' })
    if (!amount || amount <= 0) return res.status(400).json({ error: 'Amount must be greater than 0' })
    if (!category || !category.trim()) return res.status(400).json({ error: 'Category is required' })

    const count = await QuickExpense.countDocuments({ userId: req.user.id })
    const item = await QuickExpense.create({
      userId: req.user.id,
      label: label.trim(),
      amount,
      category: category.trim(),
      type: type === 'income' ? 'income' : 'expense',
      order: count,
    })

    await rememberCategory(req.user.id, item.category, item.type)
    res.json(item)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// DELETE /api/money/quick/:id — remove a preset (doesn't touch past transactions)
router.delete('/quick/:id', async (req, res) => {
  try {
    await QuickExpense.findOneAndDelete({ _id: req.params.id, userId: req.user.id })
    res.json({ ok: true })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// GET /api/money?startDate=&endDate=&type=&category=
router.get('/', async (req, res) => {
  try {
    const { startDate, endDate, type, category } = req.query
    const filter = { userId: req.user.id }
    if (type) filter.type = type
    if (category) filter.category = category
    if (startDate) filter.date = { $gte: startDate }
    if (endDate) filter.date = { ...filter.date, $lte: endDate }

    const txns = await Transaction.find(filter).sort({ date: -1, createdAt: -1 })
    res.json(txns)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// POST /api/money
router.post('/', async (req, res) => {
  try {
    const { type, amount, category, note, date } = req.body

    if (!['income', 'expense'].includes(type)) {
      return res.status(400).json({ error: 'Type must be income or expense' })
    }
    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Amount must be greater than 0' })
    }
    if (!category || !category.trim()) {
      return res.status(400).json({ error: 'Category is required' })
    }

    const txn = await Transaction.create({
      userId: req.user.id,
      type,
      amount,
      category: category.trim(),
      note: (note || '').trim(),
      date: date || getStudyDayString(),
    })

    await rememberCategory(req.user.id, txn.category, type)
    res.json(txn)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// PUT /api/money/:id
router.put('/:id', async (req, res) => {
  try {
    const updates = { ...req.body }
    if (updates.category) updates.category = updates.category.trim()
    if (updates.note != null) updates.note = updates.note.trim()

    const txn = await Transaction.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      updates,
      { new: true }
    )
    if (!txn) return res.status(404).json({ error: 'Transaction not found' })

    if (updates.category && (updates.type || txn.type)) {
      await rememberCategory(req.user.id, updates.category, updates.type || txn.type)
    }
    res.json(txn)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// DELETE /api/money/:id
router.delete('/:id', async (req, res) => {
  try {
    await Transaction.findOneAndDelete({ _id: req.params.id, userId: req.user.id })
    res.json({ ok: true })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

export default router