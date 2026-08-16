// src/api/channels.js
import api from './client'

export async function searchChannels(query) {
  const res = await api.get('/channels/search', { params: { q: query } })
  return res.data // [{ channelId, channelTitle, channelThumbnail }]
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

export async function addFeedVideoToWatchlist(videoId, { folderId, title, thumbnail, channelTitle }) {
  const res = await api.post('/channels/feed/add', { videoId, folderId, title, thumbnail, channelTitle })
  return res.data
}