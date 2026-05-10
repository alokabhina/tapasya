// ✅ FIX: Added pendingSync helpers (getPendingSync, clearPendingSync, addPendingSync)
// useSession.js and useTimer.js inhe import karte hain — pehle exist hi nahi karte the
import api from './client'

const PENDING_KEY = 'tapasya_pending_sessions'

export const getSessions   = (startDate, endDate) =>
  api.get('/sessions', { params: { startDate, endDate } }).then(r => r.data)

export const saveSession   = (data)     => api.post('/sessions', data).then(r => r.data)
export const updateSession = (id, data) => api.put(`/sessions/${id}`, data).then(r => r.data)
export const deleteSession = (id)       => api.delete(`/sessions/${id}`).then(r => r.data)

// Offline pending sync helpers (localStorage based)
export function getPendingSync() {
  try { return JSON.parse(localStorage.getItem(PENDING_KEY) || '[]') } catch { return [] }
}

export function addPendingSync(session) {
  const pending = getPendingSync()
  pending.push(session)
  localStorage.setItem(PENDING_KEY, JSON.stringify(pending))
}

export function clearPendingSync() {
  localStorage.removeItem(PENDING_KEY)
}
