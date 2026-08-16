// server/routes/folders.js
// CRUD for the user's own custom watch folders (e.g. "Physics", "Static GK").
// Deleting a folder also cleans up the watch items and channel subscriptions
// that were tagged to it, so nothing is left orphaned.

import express from 'express'
import authMiddleware from '../middleware/auth.js'
import WatchFolder from '../models/WatchFolder.js'
import WatchItem from '../models/WatchItem.js'
import Subscription from '../models/Subscription.js'

const router = express.Router()
router.use(authMiddleware)

// GET /api/folders
router.get('/', async (req, res) => {
  try {
    const folders = await WatchFolder.find({ userId: req.user.id }).sort({ createdAt: -1 })
    res.json(folders)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// POST /api/folders   { name }
router.post('/', async (req, res) => {
  try {
    const { name } = req.body
    if (!name || !name.trim()) return res.status(400).json({ error: 'name is required' })

    const folder = await WatchFolder.create({ userId: req.user.id, name: name.trim() })
    res.json(folder)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// DELETE /api/folders/:id
router.delete('/:id', async (req, res) => {
  try {
    const folder = await WatchFolder.findOneAndDelete({ _id: req.params.id, userId: req.user.id })
    if (!folder) return res.status(404).json({ error: 'Not found' })

    await Promise.all([
      WatchItem.deleteMany({ userId: req.user.id, folderId: folder._id }),
      Subscription.deleteMany({ userId: req.user.id, folderId: folder._id }),
    ])

    res.json({ ok: true })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

export default router