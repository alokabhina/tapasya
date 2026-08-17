// server/routes/channels.js
// Search + subscribe to YouTube channels, tagged into the user's own folder.
// No caching/cron here anymore — the frontend embeds the channel's uploads
// playlist directly from YouTube using uploadsPlaylistId (see
// utils/youtube.js parseYoutubeUrl/getChannelUploadsPlaylist), so browsing
// a subscribed channel always shows their real, current video list without
// us storing or duplicating it.

import express from 'express'
import authMiddleware from '../middleware/auth.js'
import Subscription from '../models/Subscription.js'
import WatchItem from '../models/WatchItem.js'
import { searchChannels, getChannelUploadsPlaylist, fetchLatestUploads, fetchVideoDurations, searchShorts } from '../utils/youtube.js'

const router = express.Router()
router.use(authMiddleware)

// GET /api/channels/search?q=
router.get('/search', async (req, res) => {
  try {
    const { q } = req.query
    if (!q || q.trim().length < 2) return res.json([])
    const results = await searchChannels(q.trim())
    res.json(results)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// POST /api/channels/subscribe   { channelId, channelTitle, channelThumbnail, folderId }
router.post('/subscribe', async (req, res) => {
  try {
    const { channelId, channelTitle, channelThumbnail, folderId } = req.body
    if (!channelId || !folderId) return res.status(400).json({ error: 'channelId and folderId are required' })

    const existing = await Subscription.findOne({ userId: req.user.id, channelId })
    if (existing) return res.json(existing)

    const uploadsPlaylistId = await getChannelUploadsPlaylist(channelId)

    const sub = await Subscription.create({
      userId: req.user.id,
      folderId,
      channelId,
      channelTitle,
      channelThumbnail,
      uploadsPlaylistId,
    })
    res.json(sub)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// GET /api/channels/my
router.get('/my', async (req, res) => {
  try {
    const subs = await Subscription.find({ userId: req.user.id }).sort({ createdAt: -1 })
    res.json(subs)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// GET /api/channels/feed?channelId=   → latest uploads for one subscribed channel
router.get('/feed', async (req, res) => {
  try {
    const { channelId } = req.query
    if (!channelId) return res.status(400).json({ error: 'channelId is required' })

    const sub = await Subscription.findOne({ userId: req.user.id, channelId })
    if (!sub) return res.status(404).json({ error: 'Not subscribed to this channel' })
    if (!sub.uploadsPlaylistId) return res.json([])

    // fetch extra since Shorts (<=60s) get filtered out below
    const videos = await fetchLatestUploads(sub.uploadsPlaylistId, 40)
    const info = await fetchVideoDurations(videos.map((v) => v.videoId))

    const fullVideosOnly = videos
      .filter((v) => {
        const meta = info[v.videoId]
        if (!meta) return false
        return meta.isLive || meta.durationSec > 60 // Shorts are always <=60s
      })
      .slice(0, 24)
      .map((v) => ({
        ...v,
        durationSec: info[v.videoId]?.durationSec || 0,
        isLive: info[v.videoId]?.isLive || false,
        channelTitle: sub.channelTitle,
        folderId: sub.folderId,
      }))

    res.json(fullVideosOnly)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// ── Shorts feed — motivation/education only ────────────────────────────
// Curated queries only — never a generic/open search, so nothing random or
// entertainment-y slips in. Mix of Hinglish since that's what actually
// returns relevant results for this audience (banking-exam aspirants).
const SHORTS_QUERIES = [
  'study motivation for exam',
  'success mindset motivation shorts',
  'discipline motivation students',
  'IBPS SBI exam preparation tips shorts',
  'padhai motivation shorts',
  'competitive exam strategy tips',
  'time management for students shorts',
  'self improvement habits shorts',
  'topper study tips shorts',
  'exam preparation motivation hindi',
]

// 30-min in-memory cache per query — search.list costs 100 quota units, so
// repeat requests within the window are served from cache instead of
// hitting the API again. Resets on server restart, which is fine here.
const shortsCache = new Map() // query -> { data, at }
const SHORTS_CACHE_TTL = 30 * 60 * 1000

// GET /api/channels/shorts   → curated motivation/education Shorts feed
router.get('/shorts', async (req, res) => {
  try {
    const query = SHORTS_QUERIES[Math.floor(Math.random() * SHORTS_QUERIES.length)]

    const cached = shortsCache.get(query)
    if (cached && Date.now() - cached.at < SHORTS_CACHE_TTL) {
      return res.json(cached.data)
    }

    const shorts = await searchShorts(query)
    // light shuffle so it doesn't feel like the exact same order every time
    const shuffled = [...shorts].sort(() => Math.random() - 0.5)

    shortsCache.set(query, { data: shuffled, at: Date.now() })
    res.json(shuffled)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// POST /api/channels/feed/add   { videoId, folderId, title, thumbnail, channelTitle }
router.post('/feed/add', async (req, res) => {
  try {
    const { videoId, folderId, title, thumbnail, channelTitle } = req.body
    if (!videoId || !folderId) return res.status(400).json({ error: 'videoId and folderId are required' })

    const item = await WatchItem.create({
      userId: req.user.id,
      folderId,
      type: 'video',
      youtubeId: videoId,
      title,
      thumbnail,
      channelTitle,
      source: 'manual',
    })
    res.json(item)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// DELETE /api/channels/:id
router.delete('/:id', async (req, res) => {
  try {
    await Subscription.findOneAndDelete({ _id: req.params.id, userId: req.user.id })
    res.json({ ok: true })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

export default router