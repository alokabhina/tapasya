// server/utils/youtube.js
// All YouTube Data API v3 calls live here so quota usage stays predictable
// and every route just calls a plain function.
//
// Needs env var: YOUTUBE_API_KEY
// (Google Cloud Console → enable "YouTube Data API v3" → Credentials → API Key)

const API_BASE = 'https://www.googleapis.com/youtube/v3'
const KEY = () => process.env.YOUTUBE_API_KEY

function assertKey() {
  if (!KEY()) {
    const err = new Error('YOUTUBE_API_KEY is not set on the server')
    err.code = 'NO_YT_KEY'
    throw err
  }
}

async function ytFetch(path, params) {
  assertKey()
  const url = new URL(`${API_BASE}/${path}`)
  Object.entries(params).forEach(([k, v]) => v != null && url.searchParams.set(k, v))
  url.searchParams.set('key', KEY())

  const res = await fetch(url)
  const data = await res.json()
  if (!res.ok) {
    const msg = data?.error?.message || `YouTube API error (${res.status})`
    const err = new Error(msg)
    err.status = res.status
    throw err
  }
  return data
}

// ISO 8601 duration ("PT1H2M3S") → seconds
function parseISODuration(iso) {
  if (!iso) return 0
  const m = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/)
  if (!m) return 0
  const [, h, mnt, s] = m
  return (parseInt(h || 0) * 3600) + (parseInt(mnt || 0) * 60) + parseInt(s || 0)
}

// ── Link parsing ─────────────────────────────────────────────────────────

/**
 * Detects a YouTube video / playlist link and extracts its ID.
 * Rejects Shorts links on purpose (distraction-free requirement).
 * Returns { type: 'video' | 'playlist', id: string } or throws.
 */
export function parseYoutubeUrl(rawUrl) {
  let url
  try {
    url = new URL(rawUrl.trim())
  } catch {
    throw Object.assign(new Error('Invalid URL'), { code: 'BAD_URL' })
  }

  const host = url.hostname.replace(/^www\./, '')
  if (!['youtube.com', 'youtu.be', 'm.youtube.com', 'music.youtube.com'].includes(host)) {
    throw Object.assign(new Error('Not a YouTube link'), { code: 'NOT_YOUTUBE' })
  }

  if (url.pathname.startsWith('/shorts/')) {
    throw Object.assign(new Error('Shorts links are not allowed here'), { code: 'SHORTS_REJECTED' })
  }

  // Playlist (either a bare playlist link, or a video link that also carries &list=)
  const listId = url.searchParams.get('list')
  if (url.pathname === '/playlist' && listId) {
    return { type: 'playlist', id: listId }
  }

  // Standalone video
  if (host === 'youtu.be') {
    const id = url.pathname.slice(1)
    if (id) return { type: 'video', id }
  }
  if (url.pathname === '/watch') {
    const v = url.searchParams.get('v')
    if (v) return { type: 'video', id: v }
  }
  if (url.pathname.startsWith('/embed/')) {
    const id = url.pathname.split('/embed/')[1]
    if (id) return { type: 'video', id }
  }

  // Fallback: video link that also has a list param → treat as playlist import
  if (listId) return { type: 'playlist', id: listId }

  throw Object.assign(new Error('Could not detect a video or playlist in that link'), { code: 'UNRECOGNIZED' })
}

// ── Video ────────────────────────────────────────────────────────────────

export async function fetchVideoMeta(videoId) {
  const data = await ytFetch('videos', {
    part: 'snippet,contentDetails',
    id: videoId,
  })
  const item = data.items?.[0]
  if (!item) throw Object.assign(new Error('Video not found'), { code: 'NOT_FOUND' })

  return {
    youtubeId: videoId,
    title: item.snippet.title,
    thumbnail: item.snippet.thumbnails?.medium?.url || item.snippet.thumbnails?.default?.url || '',
    channelTitle: item.snippet.channelTitle,
    durationSec: parseISODuration(item.contentDetails.duration),
  }
}

// ── Playlist ─────────────────────────────────────────────────────────────

export async function fetchPlaylistMeta(playlistId) {
  const data = await ytFetch('playlists', { part: 'snippet', id: playlistId })
  const item = data.items?.[0]
  if (!item) throw Object.assign(new Error('Playlist not found'), { code: 'NOT_FOUND' })
  return {
    youtubeId: playlistId,
    title: item.snippet.title,
    thumbnail: item.snippet.thumbnails?.medium?.url || item.snippet.thumbnails?.default?.url || '',
    channelTitle: item.snippet.channelTitle,
  }
}

/**
 * Fetches every video in a playlist (paginated, 50 at a time).
 * Returns array of { youtubeId, title, thumbnail, channelTitle }.
 * Duration is not included here (would cost an extra call per page) —
 * call fetchVideoMeta per-item later only if per-video duration is needed.
 */
export async function fetchPlaylistItems(playlistId, { maxPages = 4 } = {}) {
  const items = []
  let pageToken = undefined
  let pages = 0

  do {
    const data = await ytFetch('playlistItems', {
      part: 'snippet',
      playlistId,
      maxResults: 50,
      pageToken,
    })
    for (const it of data.items || []) {
      // deleted/private videos show up with a placeholder title — skip them
      if (it.snippet?.title === 'Deleted video' || it.snippet?.title === 'Private video') continue
      items.push({
        youtubeId: it.snippet.resourceId.videoId,
        title: it.snippet.title,
        thumbnail: it.snippet.thumbnails?.medium?.url || it.snippet.thumbnails?.default?.url || '',
        channelTitle: it.snippet.videoOwnerChannelTitle || it.snippet.channelTitle || '',
      })
    }
    pageToken = data.nextPageToken
    pages++
  } while (pageToken && pages < maxPages)

  return items
}

/**
 * Given a list of videoIds, returns a map { videoId: { durationSec, isLive } }.
 * Batches 50 ids per call (YouTube's max for the videos.list endpoint).
 */
export async function fetchVideoDurations(videoIds = []) {
  const info = {}
  for (let i = 0; i < videoIds.length; i += 50) {
    const chunk = videoIds.slice(i, i + 50)
    if (!chunk.length) continue
    const data = await ytFetch('videos', {
      part: 'contentDetails,snippet',
      id: chunk.join(','),
    })
    for (const it of data.items || []) {
      info[it.id] = {
        durationSec: parseISODuration(it.contentDetails.duration),
        isLive: it.snippet?.liveBroadcastContent === 'live' || it.snippet?.liveBroadcastContent === 'upcoming',
      }
    }
  }
  return info
}

/**
 * Searches for genuine YouTube Shorts (vertical, <=60s) matching a query.
 * Uses search.list with videoDuration=short (YouTube's own "<4min" bucket)
 * then narrows to true Shorts length via fetchVideoDurations, since the
 * Shorts feed here must stay distraction-free — motivation/education only,
 * nothing random. safeSearch=strict as an extra content-quality guard.
 */
export async function searchShorts(query, { maxResults = 18 } = {}) {
  const data = await ytFetch('search', {
    part: 'snippet',
    type: 'video',
    q: query,
    videoDuration: 'short',
    safeSearch: 'strict',
    relevanceLanguage: 'hi',
    regionCode: 'IN',
    order: 'relevance',
    maxResults,
  })
  const candidates = (data.items || [])
    .filter((it) => it.id?.videoId)
    .map((it) => ({
      youtubeId: it.id.videoId,
      title: it.snippet.title,
      thumbnail: it.snippet.thumbnails?.high?.url || it.snippet.thumbnails?.medium?.url || '',
      channelTitle: it.snippet.channelTitle,
    }))
  if (!candidates.length) return []

  const info = await fetchVideoDurations(candidates.map((v) => v.youtubeId))
  return candidates
    .map((v) => ({ ...v, durationSec: info[v.youtubeId]?.durationSec || 0 }))
    .filter((v) => v.durationSec > 0 && v.durationSec <= 60) // real Shorts only
}

export async function searchChannels(query, { maxResults = 8 } = {}) {
  const data = await ytFetch('search', {
    part: 'snippet',
    type: 'channel',
    q: query,
    maxResults,
  })
  return (data.items || []).map((it) => ({
    channelId: it.snippet.channelId,
    channelTitle: it.snippet.channelTitle,
    channelThumbnail: it.snippet.thumbnails?.medium?.url || it.snippet.thumbnails?.default?.url || '',
  }))
}

/**
 * Given a channelId, returns its "uploads" playlist ID — every channel has
 * one automatically. Fetching this playlist is 1 unit vs 100 for search,
 * so we always go through this for repeated/cron fetches.
 */
export async function getChannelUploadsPlaylist(channelId) {
  const data = await ytFetch('channels', {
    part: 'contentDetails',
    id: channelId,
  })
  const item = data.items?.[0]
  if (!item) throw Object.assign(new Error('Channel not found'), { code: 'NOT_FOUND' })
  return item.contentDetails.relatedPlaylists.uploads
}

/**
 * Latest N uploads for a channel via its uploads playlist (cheap — 1 unit).
 * Used by the sync cron, not per-user requests.
 */
export async function fetchLatestUploads(uploadsPlaylistId, maxResults = 10) {
  const data = await ytFetch('playlistItems', {
    part: 'snippet,contentDetails',
    playlistId: uploadsPlaylistId,
    maxResults,
  })
  return (data.items || []).map((it) => ({
    videoId: it.contentDetails.videoId,
    title: it.snippet.title,
    thumbnail: it.snippet.thumbnails?.medium?.url || it.snippet.thumbnails?.default?.url || '',
    publishedAt: it.contentDetails.videoPublishedAt || it.snippet.publishedAt,
  }))
}

/**
 * Checks which of the given channelIds are currently live.
 * Expensive (100 units per call) — cron should call this sparingly
 * (e.g. once/hour in a single batched pass), not per user.
 */
export async function checkLiveChannels(channelIds = []) {
  const liveChannelIds = new Set()
  for (const channelId of channelIds) {
    try {
      const data = await ytFetch('search', {
        part: 'snippet',
        channelId,
        eventType: 'live',
        type: 'video',
        maxResults: 1,
      })
      if (data.items?.length) liveChannelIds.add(channelId)
    } catch {
      // ignore individual failures, don't block the batch
    }
  }
  return liveChannelIds
}