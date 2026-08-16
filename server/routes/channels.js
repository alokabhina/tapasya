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
import { searchChannels, getChannelUploadsPlaylist, fetchLatestUploads, fetchVideoDurations } from '../utils/youtube.js'

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