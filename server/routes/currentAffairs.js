// server/routes/currentAffairs.js
// Global current-affairs feed. GET is open to any logged-in user (it's a
// shared feed, not per-user data). Add/edit/delete/bulk-import are gated
// to the two admin emails via caAdminMiddleware — see middleware/caAdmin.js.
import express from 'express'
import authMiddleware from '../middleware/auth.js'
import caAdminMiddleware, { isCaAdmin } from '../middleware/caAdmin.js'
import CurrentAffair, { CA_CATEGORIES } from '../models/CurrentAffair.js'
import { toMonthKey } from '../utils/caCategorizer.js'
import { syncCurrentAffairsFromFeeds } from '../services/currentAffairsSync.js'

const router = express.Router()
router.use(authMiddleware)

// GET /api/current-affairs/meta — categories list + distinct months that
// actually have data, for the frontend's filter dropdowns.
router.get('/meta', async (req, res) => {
  try {
    const months = await CurrentAffair.distinct('month')
    months.sort().reverse()
    res.json({ categories: CA_CATEGORIES, months })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// GET /api/current-affairs/is-admin
router.get('/is-admin', async (req, res) => {
  try {
    res.json({ isAdmin: await isCaAdmin(req.user.id) })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// GET /api/current-affairs?month=2026-08&category=Banking&source=RBI&q=repo&page=1&limit=30
router.get('/', async (req, res) => {
  try {
    const { month, category, source, q } = req.query
    const page = Math.max(1, parseInt(req.query.page) || 1)
    const limit = Math.min(100, parseInt(req.query.limit) || 30)

    const filter = {}
    if (month) filter.month = month
    if (category) filter.category = category
    if (source) filter.source = source
    if (q) filter.$text = { $search: q }

    const [items, total] = await Promise.all([
      CurrentAffair.find(filter).sort({ date: -1 }).skip((page - 1) * limit).limit(limit),
      CurrentAffair.countDocuments(filter),
    ])
    res.json({ items, total, page, pages: Math.ceil(total / limit) })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// POST /api/current-affairs/fetch-now — admin manually triggers the same
// RSS fetch the daily cron does. Needed for local dev (Vercel Cron never
// fires there) and for pulling fresh items immediately instead of waiting
// for the next scheduled run.
router.post('/fetch-now', caAdminMiddleware, async (req, res) => {
  try {
    const result = await syncCurrentAffairsFromFeeds()
    res.json({ ok: true, ...result })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// POST /api/current-affairs — manual single add (admin only)
router.post('/', caAdminMiddleware, async (req, res) => {
  try {
    const body = req.body
    if (!body.headline || !body.oneLiner || !body.date) {
      return res.status(400).json({ error: 'headline, oneLiner, date required' })
    }
    const doc = await CurrentAffair.create({
      ...body,
      month: toMonthKey(body.date),
      source: body.source || 'Admin',
      addedBy: 'admin',
      createdByEmail: req.caAdminEmail,
    })
    res.json(doc)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// POST /api/current-affairs/bulk-import — admin pastes a JSON array
// (built by hand: PDF → external AI → JSON, following the schema shown in
// the importer UI). Skips items whose dedupeKey/sourceUrl already exists,
// so re-pasting the same batch twice is harmless.
router.post('/bulk-import', caAdminMiddleware, async (req, res) => {
  try {
    const items = req.body.items
    if (!Array.isArray(items) || !items.length) {
      return res.status(400).json({ error: 'items must be a non-empty array' })
    }
    let inserted = 0, skipped = 0, errors = []
    for (const raw of items) {
      try {
        if (!raw.headline || !raw.oneLiner || !raw.date) { skipped++; continue }
        const dedupeKey = raw.sourceUrl || `${raw.headline}-${raw.date}`
        const exists = await CurrentAffair.findOne({ dedupeKey })
        if (exists) { skipped++; continue }
        await CurrentAffair.create({
          ...raw,
          month: toMonthKey(raw.date),
          source: raw.source || 'Admin',
          addedBy: 'admin',
          createdByEmail: req.caAdminEmail,
          dedupeKey,
        })
        inserted++
      } catch (e) {
        errors.push({ headline: raw.headline, error: e.message })
      }
    }
    res.json({ inserted, skipped, errors })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// PUT /api/current-affairs/:id — admin edit
router.put('/:id', caAdminMiddleware, async (req, res) => {
  try {
    const update = { ...req.body }
    if (update.date) update.month = toMonthKey(update.date)
    const doc = await CurrentAffair.findByIdAndUpdate(req.params.id, update, { new: true })
    if (!doc) return res.status(404).json({ error: 'Not found' })
    res.json(doc)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// DELETE /api/current-affairs/:id — admin only
router.delete('/:id', caAdminMiddleware, async (req, res) => {
  try {
    const doc = await CurrentAffair.findByIdAndDelete(req.params.id)
    if (!doc) return res.status(404).json({ error: 'Not found' })
    res.json({ ok: true })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

export default router