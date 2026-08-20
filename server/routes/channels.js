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
import { searchChannels, getChannelUploadsPlaylist, fetchLatestUploads, fetchVideoDurations, searchShorts, searchVideos } from '../utils/youtube.js'
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

// GET /api/channels/search-videos?q=
// Open video search (not limited to subscribed channels) — powers the
// "search any video" bar on the Channel Feed tab. Short-lived per-query
// cache since search.list costs 100 quota units per call.
const videoSearchCache = new Map() // query -> { data, at }
const VIDEO_SEARCH_CACHE_TTL = 10 * 60 * 1000
router.get('/search-videos', async (req, res) => {
  try {
    const { q } = req.query
    if (!q || q.trim().length < 2) return res.json([])
    const key = q.trim().toLowerCase()
    const cached = videoSearchCache.get(key)
    if (cached && Date.now() - cached.at < VIDEO_SEARCH_CACHE_TTL) return res.json(cached.data)

    const results = await searchVideos(q.trim())
    videoSearchCache.set(key, { data: results, at: Date.now() })
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
        // Shorts are always <=60s — but a scheduled/upcoming stream often
        // reports 0 duration until it actually airs, so it must be kept
        // regardless of durationSec, not just live ones.
        return meta.isLive || meta.isUpcoming || meta.durationSec > 60
      })
      .slice(0, 24)
      .map((v) => ({
        ...v,
        durationSec: info[v.videoId]?.durationSec || 0,
        isLive: info[v.videoId]?.isLive || false,
        isUpcoming: info[v.videoId]?.isUpcoming || false,
        scheduledStartTime: info[v.videoId]?.scheduledStartTime || null,
        publishedAt: info[v.videoId]?.publishedAt || v.publishedAt,
        channelTitle: sub.channelTitle,
        folderId: sub.folderId,
      }))
      // Priority: truly live first, then most recently uploaded — a
      // 10-day-out scheduled stream should NOT jump the queue just for
      // being "upcoming", only genuinely live or freshly-published content does.
      .sort((a, b) => {
        if (a.isLive !== b.isLive) return a.isLive ? -1 : 1
        return new Date(b.publishedAt || 0) - new Date(a.publishedAt || 0)
      })

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
const DAILY_SHORTS_LIMIT = 40
const BATCH_SIZE = 10
const BATCH_COOLDOWN_MS = 2 * 60 * 60 * 1000 // 2 hours between batches of 10

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

  // Fetch enough for a whole day's worth of batches (4 × 10), not just one
  // batch's worth — so later batches in the same day are actually
  // different videos, not the same 10 repeated.
  const shorts = await searchShorts(query, { maxResults: 40 })
  const shuffled = [...shorts].sort(() => Math.random() - 0.5) // light shuffle, avoids identical order every time
  shortsCache.set(query, { data: shuffled, at: Date.now() })
  return shuffled
}

// Slices `count` items starting at `offset`, wrapping around if the pool
// is smaller than needed — guarantees a full batch even on a thin day.
function sliceWithWrap(arr, offset, count) {
  if (!arr.length) return []
  const out = []
  for (let i = 0; i < count; i++) out.push(arr[(offset + i) % arr.length])
  return out
}

// GET /api/channels/shorts/usage → { count, limit, date, batchOnCooldown, nextBatchAt }
// Called by the frontend on load to show "X/40 dekhe" and to know upfront
// whether the feed should even open today / this batch window.
router.get('/shorts/usage', async (req, res) => {
  try {
    const date = getStudyDayString()
    const usage = await ShortsUsage.findOne({ userId: req.user.id, date })
    const nextBatchAt = usage?.lastBatchAt ? new Date(usage.lastBatchAt.getTime() + BATCH_COOLDOWN_MS) : null
    res.json({
      count: usage?.count || 0,
      limit: DAILY_SHORTS_LIMIT,
      date,
      batchOnCooldown: !!(nextBatchAt && nextBatchAt > new Date()),
      nextBatchAt,
    })
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

// GET /api/channels/shorts   → curated motivation/education Shorts feed,
// max 10 at a time (see BATCH_SIZE) — next batch only after BATCH_COOLDOWN_MS
// of the PREVIOUS batch being fully watched (reloading mid-batch just
// re-serves the same unfinished batch, it doesn't reset any cooldown).
router.get('/shorts', async (req, res) => {
  try {
    const date = getStudyDayString()
    const usage = await ShortsUsage.findOne({ userId: req.user.id, date })

    if (usage && usage.count >= DAILY_SHORTS_LIMIT) {
      return res.status(429).json({ error: 'Aaj ka Shorts limit khatam ho gaya', limitReached: true, count: usage.count, limit: DAILY_SHORTS_LIMIT })
    }

    const watchedInBatch = (usage?.count || 0) - (usage?.lastBatchStartCount || 0)
    const batchExhausted = !usage?.lastBatchAt || watchedInBatch >= (usage?.lastBatchSize || 0)

    if (!batchExhausted) {
      // Still videos left in the current batch — just re-serve it, no
      // cooldown involved (this is what makes a page reload mid-batch safe).
      const all = await getShortsForQuery(currentShortsQuery())
      const offset = (usage.batchesIssuedToday - 1) * BATCH_SIZE
      return res.json(sliceWithWrap(all, offset, usage.lastBatchSize))
    }

    // Current batch is fully watched — a NEW batch needs the cooldown to have passed.
    if (usage?.lastBatchAt) {
      const nextBatchAt = new Date(usage.lastBatchAt.getTime() + BATCH_COOLDOWN_MS)
      if (nextBatchAt > new Date()) {
        return res.status(429).json({ error: '2 ghante baad agla batch milega', batchOnCooldown: true, nextBatchAt, count: usage.count, limit: DAILY_SHORTS_LIMIT })
      }
    }

    const remaining = DAILY_SHORTS_LIMIT - (usage?.count || 0)
    const batchSize = Math.max(1, Math.min(BATCH_SIZE, remaining))
    const batchesIssuedToday = (usage?.batchesIssuedToday || 0) + 1

    const all = await getShortsForQuery(currentShortsQuery())
    const offset = (batchesIssuedToday - 1) * BATCH_SIZE
    const shorts = sliceWithWrap(all, offset, batchSize)

    await ShortsUsage.findOneAndUpdate(
      { userId: req.user.id, date },
      {
        lastBatchAt: new Date(),
        lastBatchStartCount: usage?.count || 0,
        lastBatchSize: batchSize,
        batchesIssuedToday,
      },
      { upsert: true }
    )

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