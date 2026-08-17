// server/routes/watch.js
// Personal watchlist: add a video/playlist link, list it folder-wise,
// mark complete, track watch progress, bulk delete, and stats.

import express from 'express'
import authMiddleware from '../middleware/auth.js'
import WatchItem from '../models/WatchItem.js'
import WatchFolder from '../models/WatchFolder.js'
import WatchLog from '../models/WatchLog.js'
import Todo from '../models/Todo.js'
import { parseYoutubeUrl, fetchVideoMeta, fetchPlaylistMeta, fetchPlaylistItems } from '../utils/youtube.js'
import { getStudyDayString } from '../utils/dayBoundary.js'

const router = express.Router()
router.use(authMiddleware)

// POST /api/watch/add   { url, folderId? }
// Video → goes into the given folderId (required for videos).
// Playlist → folderId is ignored; a NEW folder is auto-created named after
// the playlist title, and every video in it goes into that new folder.
router.post('/add', async (req, res) => {
  try {
    const { url, folderId } = req.body
    if (!url) return res.status(400).json({ error: 'url is required' })

    let parsed
    try {
      parsed = parseYoutubeUrl(url)
    } catch (e) {
      return res.status(400).json({ error: e.message, code: e.code })
    }

    if (parsed.type === 'video') {
      if (!folderId) return res.status(400).json({ error: 'folderId is required for a single video' })
      const meta = await fetchVideoMeta(parsed.id)
      const item = await WatchItem.create({
        userId: req.user.id,
        folderId,
        type: 'video',
        ...meta,
        source: 'manual',
      })
      return res.json({ added: 1, items: [item], folder: null })
    }

    // ── Playlist: auto-create its own folder ──────────────────────────
    const [playlistMeta, videos] = await Promise.all([
      fetchPlaylistMeta(parsed.id).catch(() => null),
      fetchPlaylistItems(parsed.id),
    ])

    if (!videos.length) {
      return res.status(400).json({ error: 'Playlist is empty or unavailable' })
    }

    const folderName = playlistMeta?.title || `Playlist ${parsed.id.slice(0, 6)}`
    let folder = await WatchFolder.findOne({ userId: req.user.id, name: folderName })
    if (!folder) {
      folder = await WatchFolder.create({ userId: req.user.id, name: folderName, fromPlaylist: true })
    }

    const existing = await WatchItem.find({
      userId: req.user.id,
      youtubeId: { $in: videos.map((v) => v.youtubeId) },
    }).select('youtubeId').lean()
    const existingIds = new Set(existing.map((e) => e.youtubeId))

    const toInsert = videos
      .filter((v) => !existingIds.has(v.youtubeId))
      .map((v) => ({
        userId: req.user.id,
        folderId: folder._id,
        type: 'video',
        youtubeId: v.youtubeId,
        title: v.title,
        thumbnail: v.thumbnail,
        channelTitle: v.channelTitle || playlistMeta?.channelTitle || '',
        source: 'manual',
      }))

    const items = toInsert.length ? await WatchItem.insertMany(toInsert) : []
    res.json({ added: items.length, skipped: videos.length - items.length, items, folder })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// GET /api/watch?folderId=&completed=true|false
router.get('/', async (req, res) => {
  try {
    const { folderId, completed } = req.query
    const filter = { userId: req.user.id }
    if (folderId) filter.folderId = folderId
    if (completed === 'true') filter.completed = true
    if (completed === 'false') filter.completed = false

    const items = await WatchItem.find(filter).sort({ createdAt: -1 }).populate('folderId', 'name fromPlaylist')
    res.json(items)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// PATCH /api/watch/:id/complete   { completed: true|false }
router.patch('/:id/complete', async (req, res) => {
  try {
    const completed = !!req.body.completed
    const item = await WatchItem.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      { completed, completedAt: completed ? new Date() : null },
      { new: true }
    )
    if (!item) return res.status(404).json({ error: 'Not found' })

    // Two-way sync: mirror onto any todo(s) linked to this video (see
    // routes/todos.js for the other direction). Best-effort — a sync
    // failure here shouldn't fail the watch-item update itself.
    Todo.updateMany(
      { userId: req.user.id, 'linkedWatchItem.itemId': item._id },
      { done: completed, completedAt: completed ? getStudyDayString() : null }
    ).catch(() => {})

    res.json(item)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// PATCH /api/watch/:id/progress   { watchedSeconds, deltaSeconds }
router.patch('/:id/progress', async (req, res) => {
  try {
    const { watchedSeconds, deltaSeconds } = req.body
    const item = await WatchItem.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      { watchedSeconds: Math.max(0, watchedSeconds || 0) },
      { new: true }
    )
    if (!item) return res.status(404).json({ error: 'Not found' })

    if (deltaSeconds > 0) {
      const date = getStudyDayString()
      await WatchLog.findOneAndUpdate(
        { userId: req.user.id, date },
        { $inc: { seconds: deltaSeconds } },
        { upsert: true }
      )
    }

    res.json(item)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// DELETE /api/watch/:id
router.delete('/:id', async (req, res) => {
  try {
    await WatchItem.findOneAndDelete({ _id: req.params.id, userId: req.user.id })
    res.json({ ok: true })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// POST /api/watch/bulk-delete   { itemIds: [] }
router.post('/bulk-delete', async (req, res) => {
  try {
    const { itemIds } = req.body
    if (!Array.isArray(itemIds) || !itemIds.length) {
      return res.status(400).json({ error: 'itemIds required' })
    }
    const result = await WatchItem.deleteMany({ _id: { $in: itemIds }, userId: req.user.id })
    res.json({ deleted: result.deletedCount })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// GET /api/watch/stats/summary
router.get('/stats/summary', async (req, res) => {
  try {
    const userId = req.user.id
    const [total, completed, todayLog] = await Promise.all([
      WatchItem.countDocuments({ userId }),
      WatchItem.countDocuments({ userId, completed: true }),
      WatchLog.findOne({ userId, date: getStudyDayString() }).lean(),
    ])

    const since = new Date()
    since.setDate(since.getDate() - 7)
    const weekLogs = await WatchLog.find({ userId, createdAt: { $gte: since } }).lean()
    const weekSeconds = weekLogs.reduce((sum, l) => sum + (l.seconds || 0), 0)

    res.json({
      total,
      completed,
      todayWatchHours: +(((todayLog?.seconds) || 0) / 3600).toFixed(1),
      weekWatchHours: +(weekSeconds / 3600).toFixed(1),
    })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

export default router