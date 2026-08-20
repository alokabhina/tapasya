// src/api/channels.js
import api from './client'

export async function searchChannels(query) {
  const res = await api.get('/channels/search', { params: { q: query } })
  return res.data // [{ channelId, channelTitle, channelThumbnail }]
}

// Open video search — any video, not just from subscribed channels.
export async function searchVideos(query) {
  const res = await api.get('/channels/search-videos', { params: { q: query } })
  return res.data // [{ videoId, title, thumbnail, channelTitle, publishedAt, durationSec, isLive, isUpcoming }]
}

export async function subscribeChannel({ channelId, channelTitle, channelThumbnail, folderId }) {
  const res = await api.post('/channels/subscribe', { channelId, channelTitle, channelThumbnail, folderId })
  return res.data
}

export async function getMySubscriptions() {
  const res = await api.get('/channels/my')
  return res.data
}

export async function unsubscribeChannel(id) {
  const res = await api.delete(`/channels/${id}`)
  return res.data
}

export async function getChannelFeed(channelId) {
  const res = await api.get('/channels/feed', { params: { channelId } })
  return res.data // [{ videoId, title, thumbnail, publishedAt, channelTitle, folderId }]
}

// Curated, motivation/education-only Shorts feed for the Shorts tab.
export async function getShorts() {
  const res = await api.get('/channels/shorts')
  return res.data // [{ youtubeId, title, thumbnail, channelTitle, durationSec }]
}

// Daily Shorts watch cap (50/day) — see server routes/channels.js.
export async function getShortsUsage() {
  const res = await api.get('/channels/shorts/usage')
  return res.data // { count, limit, date }
}

export async function incrementShortsUsage() {
  try {
    const res = await api.post('/channels/shorts/usage/increment')
    return res.data // { count, limit, limitReached }
  } catch (err) {
    // 429 = limit reached — this is an expected state, not a failure; the
    // server still sends the same { count, limit, limitReached } payload.
    if (err.response?.status === 429 && err.response.data) return err.response.data
    throw err
  }
}

export async function addFeedVideoToWatchlist(videoId, { folderId, title, thumbnail, channelTitle }) {
  const res = await api.post('/channels/feed/add', { videoId, folderId, title, thumbnail, channelTitle })
  return res.data
}