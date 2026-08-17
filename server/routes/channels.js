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
import ShortsUsage from '../models/ShortsUsage.js'
import { searchChannels, getChannelUploadsPlaylist, fetchLatestUploads, fetchVideoDurations, searchShorts } from '../utils/youtube.js'
import { getStudyDayString } from '../utils/dayBoundary.js'

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
// entertainment-y slips in. Weighted toward Hindi-language motivational
// content (North Indian speakers/creators), bank/SSC exam prep, and
// relatable struggle → success life-story shorts — this is the actual
// content the user wants, not generic English "study tips" clips.
const SHORTS_QUERIES = [
  'motivational speech hindi students',
  'success story motivation hindi',
  'struggle success story motivation hindi',
  'bank exam motivation shorts hindi',
  'SSC exam motivation shorts hindi',
  'IBPS SBI motivation shorts hindi',
  'garib se success story hindi motivation',
  'sandeep maheshwari motivation shorts',
  'padhai motivation shorts hindi',
  'competitive exam success story hindi',
  'IAS IPS success story motivation hindi',
  'discipline motivation hindi shorts',
  'topper interview motivation hindi',
  'exam preparation motivation hindi',
  'life changing motivation speech hindi',
]

// 30-min in-memory cache per query — search.list costs 100 quota units, so
// repeat requests within the window are served from cache instead of
// hitting the API again. Resets on server restart, which is fine here.
const shortsCache = new Map() // query -> { data, at }
const SHORTS_CACHE_TTL = 30 * 60 * 1000
const DAILY_SHORTS_LIMIT = 50

// Time-bucketed pick instead of Math.random(): everyone hitting the feed
// within the same 30-min window gets the SAME query, so after the first
// person warms the cache, everyone else (and the same user re-opening the
// tab) gets a near-instant cache hit instead of a fresh ~10-15s YouTube
// API round trip every single time.
function currentShortsQuery() {
  const bucket = Math.floor(Date.now() / SHORTS_CACHE_TTL)
  return SHORTS_QUERIES[bucket % SHORTS_QUERIES.length]
}

async function getShortsForQuery(query) {
  const cached = shortsCache.get(query)
  if (cached && Date.now() - cached.at < SHORTS_CACHE_TTL) return cached.data

  const shorts = await searchShorts(query)
  const shuffled = [...shorts].sort(() => Math.random() - 0.5) // light shuffle, avoids identical order every time
  shortsCache.set(query, { data: shuffled, at: Date.now() })
  return shuffled
}

// GET /api/channels/shorts/usage → { count, limit, date }
// Called by the frontend on load to show "X/50 dekhe" and to know upfront
// whether the feed should even open today.
router.get('/shorts/usage', async (req, res) => {
  try {
    const date = getStudyDayString()
    const usage = await ShortsUsage.findOne({ userId: req.user.id, date })
    res.json({ count: usage?.count || 0, limit: DAILY_SHORTS_LIMIT, date })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// POST /api/channels/shorts/usage/increment → call once per Short actually
// opened/played (not per scroll-past). Rejects once the daily cap is hit,
// so this is the actual enforcement point, not just the display counter.
router.post('/shorts/usage/increment', async (req, res) => {
  try {
    const date = getStudyDayString()
    const existing = await ShortsUsage.findOne({ userId: req.user.id, date })

    if (existing && existing.count >= DAILY_SHORTS_LIMIT) {
      return res.status(429).json({ count: existing.count, limit: DAILY_SHORTS_LIMIT, limitReached: true })
    }

    const usage = await ShortsUsage.findOneAndUpdate(
      { userId: req.user.id, date },
      { $inc: { count: 1 } },
      { new: true, upsert: true }
    )
    res.json({ count: usage.count, limit: DAILY_SHORTS_LIMIT, limitReached: usage.count >= DAILY_SHORTS_LIMIT })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// GET /api/channels/shorts   → curated motivation/education Shorts feed
router.get('/shorts', async (req, res) => {
  try {
    const date = getStudyDayString()
    const usage = await ShortsUsage.findOne({ userId: req.user.id, date })
    if (usage && usage.count >= DAILY_SHORTS_LIMIT) {
      return res.status(429).json({ error: 'Aaj ka Shorts limit khatam ho gaya', limitReached: true, count: usage.count, limit: DAILY_SHORTS_LIMIT })
    }

    const shorts = await getShortsForQuery(currentShortsQuery())
    res.json(shorts)

    // Fire-and-forget: warm next bucket's query in the background so that
    // when the 30-min window rolls over, the FIRST request after it still
    // hits a warm cache instead of everyone waiting on a fresh search again.
    const nextBucket = Math.floor(Date.now() / SHORTS_CACHE_TTL) + 1
    const nextQuery = SHORTS_QUERIES[nextBucket % SHORTS_QUERIES.length]
    if (!shortsCache.has(nextQuery)) getShortsForQuery(nextQuery).catch(() => {})
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