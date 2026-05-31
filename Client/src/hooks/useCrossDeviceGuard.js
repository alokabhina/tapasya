// src/hooks/useCrossDeviceGuard.js
// Detects if timer is already running on another device for the same user.
// Call this before starting a new timer. Returns { checkConflict }.

import { getActiveSession } from '@/api/sessions'

function getDeviceId() {
  let id = sessionStorage.getItem('tapasya_device_id')
  if (!id) {
    id = `dev_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
    sessionStorage.setItem('tapasya_device_id', id)
  }
  return id
}

// Returns conflicting active session info, or null if no conflict
export async function checkCrossDeviceConflict() {
  try {
    const active = await getActiveSession()
    if (!active) return null
    // Same device — no conflict (page reload case)
    if (active.deviceId === getDeviceId()) return null
    return active // { subjectName, subjectColor, elapsed, isPaused, startTime, deviceId }
  } catch (_) {
    return null
  }
}