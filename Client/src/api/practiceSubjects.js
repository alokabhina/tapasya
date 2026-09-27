// src/api/practiceSubjects.js
import api from './client'

export async function getPracticeSubjects() {
  const res = await api.get('/practice-subjects')
  return res.data
}

export async function getPracticeSubject(id) {
  const res = await api.get(`/practice-subjects/${id}`)
  return res.data
}

// Frontend uses this to decide whether to show admin-only buttons
// (Upload Test, Leaderboard link) without 403-ing a regular user.
export async function isPracticeAdmin() {
  const res = await api.get('/practice-subjects/is-admin')
  return res.data.isAdmin
}

export async function createPracticeSubject({ name, examCategory, color, order }) {
  const res = await api.post('/practice-subjects', { name, examCategory, color, order })
  return res.data
}

export async function updatePracticeSubject(id, updates) {
  const res = await api.patch(`/practice-subjects/${id}`, updates)
  return res.data
}

export async function deletePracticeSubject(id) {
  const res = await api.delete(`/practice-subjects/${id}`)
  return res.data
}