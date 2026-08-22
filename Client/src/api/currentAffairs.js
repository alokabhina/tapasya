// src/api/currentAffairs.js
import api from './client'

export async function getCurrentAffairs({ month, category, source, q, page = 1, limit = 30 } = {}) {
  const res = await api.get('/current-affairs', { params: { month, category, source, q, page, limit } })
  return res.data // { items, total, page, pages }
}

export async function getCurrentAffairsMeta() {
  const res = await api.get('/current-affairs/meta')
  return res.data // { categories, months }
}

export async function checkCaAdmin() {
  const res = await api.get('/current-affairs/is-admin')
  return res.data.isAdmin
}

export async function addCurrentAffair(item) {
  const res = await api.post('/current-affairs', item)
  return res.data
}

export async function bulkImportCurrentAffairs(items) {
  const res = await api.post('/current-affairs/bulk-import', { items })
  return res.data // { inserted, skipped, errors }
}

export async function fetchCurrentAffairsNow() {
  const res = await api.post('/current-affairs/fetch-now')
  return res.data // { ok, fetched, inserted, skipped }
}

export async function updateCurrentAffair(id, update) {
  const res = await api.put(`/current-affairs/${id}`, update)
  return res.data
}

export async function deleteCurrentAffair(id) {
  const res = await api.delete(`/current-affairs/${id}`)
  return res.data
}