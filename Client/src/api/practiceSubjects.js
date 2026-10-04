// src/api/practiceSubjects.js
import api from './client'

// Subjects list + admin flag bahut kam badalte hain — memory me rakhte hain taaki
// Practice Tests page dobara kholne pe turant dikhe (skeleton nahi), aur peeche
// se fresh data aake update kar de (stale-while-revalidate).
let subjectsCache = null
let adminCache = null

export function peekPracticeSubjects() {
  return subjectsCache
}

export async function getPracticeSubjects() {
  const res = await api.get('/practice-subjects')
  subjectsCache = res.data
  return res.data
}

export async function getPracticeSubject(id) {
  const res = await api.get(`/practice-subjects/${id}`)
  return res.data
}

// Frontend uses this to decide whether to show admin-only buttons
// (Upload Test, Leaderboard link) without 403-ing a regular user.
export function peekPracticeAdmin() {
  return adminCache
}

export async function isPracticeAdmin() {
  const res = await api.get('/practice-subjects/is-admin')
  adminCache = !!res.data.isAdmin
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