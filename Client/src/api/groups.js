// src/api/groups.js
import api from './client'

export async function createGroup(name) {
  const { data } = await api.post('/groups', { name })
  return {
    groupId: data.groupId,
    group: normalizeGroup(data.group),
  }
}

export async function joinGroupByCode(code) {
  const { data } = await api.post('/groups/join', { code })
  return {
    groupId: data.groupId,
    group: normalizeGroup(data.group),
  }
}

export async function fetchMyGroups() {
  const { data } = await api.get('/groups/mine')
  return data.map(normalizeGroup)
}

export async function fetchGroup(groupId) {
  const { data } = await api.get(`/groups/${groupId}`)
  return normalizeGroup(data)
}

// Normalize a group from the server — keep ALL member fields intact
function normalizeGroup(g) {
  return {
    _id: g._id,
    name: g.name,
    inviteCode: g.inviteCode,
    ownerUserId: g.ownerUserId,
    memberCount: g.members?.length || 0,
    // Keep full member objects so weeklySeconds, totalSeconds, isStudying, etc. are available
    members: (g.members || []).map(normalizeMember),
  }
}

function normalizeMember(m) {
  return {
    userId: m.userId,
    displayName: m.displayName || 'Anonymous',
    photoURL: m.photoURL || null,
    weeklySeconds: m.weeklySeconds || 0,
    totalSeconds: m.totalSeconds || 0,
    isStudying: Boolean(m.isStudying),
    studyingSubject: m.studyingSubject || null,
    studyingColor: m.studyingColor || null,
    liveElapsed: m.liveElapsed || 0,
    lastHeartbeat: m.lastHeartbeat || null,
    subjectBreakdown: m.subjectBreakdown || [],
    joinedAt: m.joinedAt || null,
  }
}

export async function leaveGroup(groupId) {
  await api.delete(`/groups/${groupId}/leave`)
}

export async function deleteGroup(groupId) {
  await api.delete(`/groups/${groupId}`)
}

export async function kickMember(groupId, userId) {
  await api.delete(`/groups/${groupId}/kick/${userId}`)
}

export async function fetchGroupMembers(groupId) {
  const { data } = await api.get(`/groups/${groupId}/members`)
  return data.map(normalizeMember)
}

export async function fetchMemberStats(groupId, userId) {
  const { data } = await api.get(`/groups/${groupId}/members/${userId}/stats`)
  return data
}

export async function updateMemberHours(groupId, addSeconds) {
  await api.put(`/groups/${groupId}/hours`, { addSeconds })
}

export async function fetchGroupMessages(groupId, before = null, limit = 50) {
  const params = { limit }
  if (before) params.before = before
  const { data } = await api.get(`/groups/${groupId}/messages`, { params })
  return data
}

export async function sendGroupMessage(groupId, text) {
  const { data } = await api.post(`/groups/${groupId}/messages`, { text })
  return data
}

export async function sendHeartbeat(groupId, { isStudying, subjectName, subjectColor, elapsed }) {
  await api.put(`/groups/${groupId}/heartbeat`, { isStudying, subjectName, subjectColor, elapsed })
}

export async function sendOffline(groupId) {
  await api.put(`/groups/${groupId}/offline`)
}

export async function fetchMemberTodos(groupId, userId) {
  const { data } = await api.get(`/groups/${groupId}/members/${userId}/todos`)
  return data
}

export async function fetchGroupDailySummary(groupId) {
  const { data } = await api.get(`/groups/${groupId}/daily-summary`)
  return data
}