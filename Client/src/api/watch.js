// src/api/watch.js
import api from './client'

export async function addWatchLink({ url, folderId }) {
  const res = await api.post('/watch/add', { url, folderId })
  return res.data // { added, skipped, items[], folder? }
}

export async function getWatchList({ folderId, completed } = {}) {
  const res = await api.get('/watch', { params: { folderId, completed } })
  return res.data // WatchItem[]
}

export async function toggleWatchComplete(id, completed) {
  const res = await api.patch(`/watch/${id}/complete`, { completed })
  return res.data
}

export async function updateWatchProgress(id, { watchedSeconds, deltaSeconds }) {
  const res = await api.patch(`/watch/${id}/progress`, { watchedSeconds, deltaSeconds })
  return res.data
}

export async function deleteWatchItem(id) {
  const res = await api.delete(`/watch/${id}`)
  return res.data
}

export async function bulkDeleteWatchItems(itemIds) {
  const res = await api.post('/watch/bulk-delete', { itemIds })
  return res.data // { deleted }
}

export async function getWatchStats() {
  const res = await api.get('/watch/stats/summary')
  return res.data // { total, completed, todayWatchHours, weekWatchHours }
}

export async function shareWatchItems(itemIds) {
  const res = await api.post('/watch/share', { itemIds })
  return res.data // { code, itemCount }
}

export async function redeemShareCode({ code, folderId }) {
  const res = await api.post('/watch/redeem', { code, folderId })
  return res.data // { added, skipped, items[] }
}