// src/api/sessions.js — offline-first

import api from './client'
import {
  saveSessionOffline, getSessionsOffline,
  saveSessionsOffline, deleteSessionOffline,
} from '@/utils/offlineDB'
import { queueSession } from '@/utils/syncQueue'

// ── GET sessions — offline fallback ──────────────────────────────────────────
export async function getSessions(startDate, endDate) {
  if (navigator.onLine) {
    try {
      const data = await api.get('/sessions', { params: { startDate, endDate } }).then(r => r.data)
      // Cache for offline
      const all = await getSessionsOffline()
      const outside = all.filter(s => {
        const d = s.date || ''
        return !(!startDate || d >= startDate) || !(!endDate || d <= endDate)
      })
      await saveSessionsOffline([
        ...outside,
        ...data.map(s => ({ ...s, id: String(s._id || s.id) })),
      ])
      return data
    } catch (err) {
      console.warn('[Sessions] Server failed, using cache:', err.message)
      return getSessionsOffline(startDate, endDate)
    }
  }
  return getSessionsOffline(startDate, endDate)
}

// ── SAVE session — offline queue ──────────────────────────────────────────────
export async function saveSession(data) {
  const id = `local_${Date.now()}_${Math.random().toString(36).slice(2)}`
  const sessionWithId = { ...data, id }

  // Always save offline immediately
  await saveSessionOffline(sessionWithId)

  if (navigator.onLine) {
    try {
      const saved = await api.post('/sessions', data).then(r => r.data)
      // Update offline store with server id
      await saveSessionOffline({ ...saved, id: String(saved._id || saved.id) })
      return saved
    } catch (err) {
      console.warn('[Sessions] Save failed, queued:', err.message)
      queueSession(data)
      return sessionWithId
    }
  } else {
    queueSession(data)
    return sessionWithId
  }
}

export async function updateSession(id, data) {
  if (navigator.onLine) {
    return api.put(`/sessions/${id}`, data).then(r => r.data)
  }
  // Offline: update local only
  const sessions = await getSessionsOffline()
  const updated = sessions.map(s => s.id === id ? { ...s, ...data } : s)
  await saveSessionsOffline(updated)
  return { ...data, id }
}

export async function deleteSession(id) {
  await deleteSessionOffline(id)
  if (navigator.onLine) {
    return api.delete(`/sessions/${id}`).then(r => r.data)
  }
  return { ok: true }
}

// ── Active session (cross-device conflict detection) ─────────────────────────

// Send heartbeat — call every 15s while timer is running
export async function sendActiveHeartbeat(payload) {
  if (!navigator.onLine) return
  try {
    await api.post('/sessions/active', payload)
  } catch (_) {}
}

// Get active session on another device for same user
export async function getActiveSession() {
  if (!navigator.onLine) return null
  try {
    const data = await api.get('/sessions/active').then(r => r.data)
    return data.active ? data : null
  } catch (_) { return null }
}

// Clear active session from server (on timer stop)
export async function clearActiveSession() {
  if (!navigator.onLine) return
  try {
    await api.delete('/sessions/active')
  } catch (_) {}
}

// ── Pending sync (legacy — still used by old code) ────────────────────────────
const PENDING_KEY = 'tapasya_pending_sessions'
export function getPendingSync() {
  try { return JSON.parse(localStorage.getItem(PENDING_KEY) || '[]') } catch { return [] }
}
export function addPendingSync(session) {
  queueSession(session) // delegate to new queue
}
export function clearPendingSync() {
  localStorage.removeItem(PENDING_KEY)
}