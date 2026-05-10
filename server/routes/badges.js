import express from 'express'
import authMiddleware from '../middleware/auth.js'
import Badge from '../models/Badge.js'

const router = express.Router()
router.use(authMiddleware)

// GET /api/badges — all unlocked badges for user
router.get('/', async (req, res) => {
  try {
    const badges = await Badge.find({ userId: req.user.id }).sort({ createdAt: 1 })
    res.json(badges)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// POST /api/badges/unlock — unlock a badge (idempotent)
router.post('/unlock', async (req, res) => {
  try {
    const { badgeId } = req.body
    if (!badgeId) return res.status(400).json({ error: 'badgeId required' })

    // Upsert — ignore duplicate (already unlocked)
    const existing = await Badge.findOne({ userId: req.user.id, badgeId })
    if (existing) return res.json({ alreadyUnlocked: true, badge: existing })

    const badge = await Badge.create({ userId: req.user.id, badgeId })
    res.json({ newUnlock: true, badge })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

export default router