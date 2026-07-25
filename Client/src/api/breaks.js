// src/api/breaks.js
// Completely separate from api/sessions.js — talks to /api/breaks only,
// never touches the study session endpoints.

import api from './client'

export async function saveBreak({ type, label, startTime, endTime, duration, date }) {
  const res = await api.post('/breaks', { type, label, startTime, endTime, duration, date })
  return res.data
}

export async function fetchBreaks({ range = '30d', page = 1, limit = 30 } = {}) {
  const res = await api.get('/breaks', { params: { range, page, limit } })
  return res.data // { breaks[], total, page, pages }
}

export async function fetchBreakStats() {
  const res = await api.get('/breaks/stats')
  return res.data // { todayTotal, todayCount, byDay, byType }
}

export async function deleteBreak(id) {
  const res = await api.delete(`/breaks/${id}`)
  return res.data
}