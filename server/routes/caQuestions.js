// server/routes/caQuestions.js
// MCQ bank for Current Affairs. GET/practice is open to any logged-in user
// (everyone practices off the same admin-curated pool — consistent with
// Current Affairs itself being global, not personal). Add/edit/delete/
// bulk-import are admin-only via caAdminMiddleware.
import express from 'express'
import authMiddleware from '../middleware/auth.js'
import caAdminMiddleware, { isCaAdmin } from '../middleware/caAdmin.js'
import CAQuestion, { CAQ_CATEGORIES } from '../models/CAQuestion.js'

const router = express.Router()
router.use(authMiddleware)

router.get('/meta', async (req, res) => {
  try {
    const months = await CAQuestion.distinct('month')
    months.sort().reverse()
    res.json({ categories: CAQ_CATEGORIES, months })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

router.get('/is-admin', async (req, res) => {
  try {
    res.json({ isAdmin: await isCaAdmin(req.user.id) })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// GET /api/ca-questions?month=2026-08&category=Banking&page=1 — browse/manage
router.get('/', async (req, res) => {
  try {
    const { month, category } = req.query
    const page = Math.max(1, parseInt(req.query.page) || 1)
    const limit = Math.min(100, parseInt(req.query.limit) || 30)

    const filter = {}
    if (month) filter.month = month
    if (category) filter.category = category

    const [items, total] = await Promise.all([
      CAQuestion.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
      CAQuestion.countDocuments(filter),
    ])
    res.json({ items, total, page, pages: Math.ceil(total / limit) })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// GET /api/ca-questions/practice?month=&category=&count=10 — a random
// practice set. Shuffled server-side so refreshing gives a different order/
// subset each time.
router.get('/practice', async (req, res) => {
  try {
    const { month, category } = req.query
    const count = Math.min(50, parseInt(req.query.count) || 10)

    const match = {}
    if (month) match.month = month
    if (category) match.category = category

    const items = await CAQuestion.aggregate([
      { $match: match },
      { $sample: { size: count } },
    ])
    res.json({ items })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// POST /api/ca-questions/bulk-import — admin pastes a JSON array (from
// PDF export → external AI → JSON, same pipeline as everything else here).
router.post('/bulk-import', caAdminMiddleware, async (req, res) => {
  try {
    const items = req.body.items
    const month = req.body.month || ''
    if (!Array.isArray(items) || !items.length) {
      return res.status(400).json({ error: 'items must be a non-empty array' })
    }
    let inserted = 0, skipped = 0, errors = []
    for (const raw of items) {
      try {
        const options = Array.isArray(raw.options) ? raw.options.map(String).map(s => s.trim()).filter(Boolean) : []
        if (!raw.question || options.length < 2) { skipped++; continue }
        const correctAnswer = String(raw.correctAnswer || '').trim()
        const match = options.find(o => o.toLowerCase() === correctAnswer.toLowerCase())
        if (!match) { skipped++; continue }

        await CAQuestion.create({
          question: raw.question.trim(),
          options,
          correctAnswer: match,
          explanation: raw.explanation?.trim() || '',
          category: CAQ_CATEGORIES.includes(raw.category) ? raw.category : 'Other',
          difficulty: ['easy', 'medium', 'hard'].includes(raw.difficulty) ? raw.difficulty : 'medium',
          month,
          source: 'json-upload',
          createdByEmail: req.caAdminEmail,
        })
        inserted++
      } catch (e) {
        errors.push({ question: raw.question, error: e.message })
      }
    }
    res.json({ inserted, skipped, errors })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// PUT /api/ca-questions/:id
router.put('/:id', caAdminMiddleware, async (req, res) => {
  try {
    const doc = await CAQuestion.findByIdAndUpdate(req.params.id, req.body, { new: true })
    if (!doc) return res.status(404).json({ error: 'Not found' })
    res.json(doc)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// DELETE /api/ca-questions/:id
router.delete('/:id', caAdminMiddleware, async (req, res) => {
  try {
    const doc = await CAQuestion.findByIdAndDelete(req.params.id)
    if (!doc) return res.status(404).json({ error: 'Not found' })
    res.json({ ok: true })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

export default router