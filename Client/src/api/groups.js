// src/api/groups.js
import api from './client'

export async function createGroup(name) {
  const { data } = await api.post('/groups', { name })
  return { groupId: data.groupId, group: { _id: data.groupId, name: data.group.name, inviteCode: data.group.inviteCode, memberCount: data.group.members?.length || 1, ownerUserId: data.group.ownerUserId, members: data.group.members || [] } }
}

export async function joinGroupByCode(code) {
  const { data } = await api.post('/groups/join', { code })
  return { groupId: data.groupId, group: { _id: data.groupId, name: data.group.name, inviteCode: data.group.inviteCode, memberCount: data.group.members?.length || 1, ownerUserId: data.group.ownerUserId, members: data.group.members || [] } }
}

export async function fetchMyGroups() {
  const { data } = await api.get('/groups/mine')
  return data.map(g => ({ _id: g._id, name: g.name, inviteCode: g.inviteCode, memberCount: g.members?.length || 0, ownerUserId: g.ownerUserId, members: g.members || [] }))
}

export async function fetchGroup(groupId) {
  const { data } = await api.get(`/groups/${groupId}`)
  return { _id: data._id, name: data.name, inviteCode: data.inviteCode, memberCount: data.members?.length || 0, ownerUserId: data.ownerUserId, members: data.members || [] }
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
  return data
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