// server/routes/classNotes.js
// Global class-notes feed. GET is open to any logged-in user. Notes are
// never generated in-app — the admin runs a live-class PDF through an
// external AI by hand and pastes back JSON matching ClassNote's shape (see
// BulkJsonImporter.jsx for the exact schema shown to the admin).
import express from 'express'
import authMiddleware from '../middleware/auth.js'
import caAdminMiddleware, { isCaAdmin } from '../middleware/caAdmin.js'
import ClassNote from '../models/ClassNote.js'

const router = express.Router()
router.use(authMiddleware)

router.get('/is-admin', async (req, res) => {
  try {
    res.json({ isAdmin: await isCaAdmin(req.user.id) })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// GET /api/class-notes/meta — distinct subjects, for the filter dropdown
router.get('/meta', async (req, res) => {
  try {
    const subjects = await ClassNote.distinct('subject')
    res.json({ subjects: subjects.sort() })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// GET /api/class-notes?subject=Economy&q=repo&page=1
router.get('/', async (req, res) => {
  try {
    const { subject, q } = req.query
    const page = Math.max(1, parseInt(req.query.page) || 1)
    const limit = Math.min(50, parseInt(req.query.limit) || 20)

    const filter = {}
    if (subject) filter.subject = subject
    if (q) filter.$text = { $search: q }

    const [items, total] = await Promise.all([
      ClassNote.find(filter).sort({ date: -1 }).skip((page - 1) * limit).limit(limit),
      ClassNote.countDocuments(filter),
    ])
    res.json({ items, total, page, pages: Math.ceil(total / limit) })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// POST /api/class-notes/bulk-import — admin pastes ONE note object or an
// array of note objects (single class or a batch at once, both supported).
router.post('/bulk-import', caAdminMiddleware, async (req, res) => {
  try {
    const raw = req.body.items
    const items = Array.isArray(raw) ? raw : [raw]
    if (!items.length || !items[0]) {
      return res.status(400).json({ error: 'items must be an object or non-empty array' })
    }
    let inserted = 0, skipped = 0, errors = []
    for (const note of items) {
      try {
        if (!note.subject || !note.topic || !note.date) { skipped++; continue }
        await ClassNote.create({ ...note, createdByEmail: req.caAdminEmail })
        inserted++
      } catch (e) {
        errors.push({ topic: note.topic, error: e.message })
      }
    }
    res.json({ inserted, skipped, errors })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// PUT /api/class-notes/:id — admin edit
router.put('/:id', caAdminMiddleware, async (req, res) => {
  try {
    const doc = await ClassNote.findByIdAndUpdate(req.params.id, req.body, { new: true })
    if (!doc) return res.status(404).json({ error: 'Not found' })
    res.json(doc)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// DELETE /api/class-notes/:id — admin only
router.delete('/:id', caAdminMiddleware, async (req, res) => {
  try {
    const doc = await ClassNote.findByIdAndDelete(req.params.id)
    if (!doc) return res.status(404).json({ error: 'Not found' })
    res.json({ ok: true })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

export default router
