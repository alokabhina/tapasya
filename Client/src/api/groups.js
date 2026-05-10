// ✅ FIX: Complete rewrite — was using Firebase Firestore, now uses REST API
// Real-time onSnapshot polling ke through simulate kiya hai (setInterval)
import api from './client'

// Naya group create karo
export async function createGroup(uid, displayName, name) {
  const { data } = await api.post('/groups', { name })
  return { groupId: data.groupId, code: data.group.inviteCode }
}

// Invite code se group join karo
export async function joinGroupByCode(uid, displayName, code) {
  const { data } = await api.post('/groups/join', { code })
  return data.groupId
}

// Group leave karo
export async function leaveGroup(uid, groupId) {
  await api.delete(`/groups/${groupId}/leave`)
}

// Members fetch karo (REST — no real-time, use polling via subscribeToGroup)
export async function fetchGroupMembers(groupId) {
  const { data } = await api.get(`/groups/${groupId}/members`)
  return data
}

// Poll every 30s to simulate real-time — returns stop function (same API as Firebase onSnapshot)
export function subscribeToGroup(groupId, callback) {
  let active = true

  async function poll() {
    try {
      const members = await fetchGroupMembers(groupId)
      if (active) callback(members)
    } catch {}
  }

  poll() // immediate first call
  const id = setInterval(poll, 30_000)

  // Unsubscribe fn — same signature as Firebase
  return () => {
    active = false
    clearInterval(id)
  }
}

// Session save ke baad member hours update karo
export async function updateMemberHours(uid, groupId, addSeconds) {
  await api.put(`/groups/${groupId}/hours`, { addSeconds })
}
