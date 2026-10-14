// src/api/practiceSubjects.js
import api from './client'

// Subjects list + admin flag bahut kam badalte hain — memory me rakhte hain taaki
// Practice Tests page dobara kholne pe turant dikhe (skeleton nahi), aur peeche
// se fresh data aake update kar de (stale-while-revalidate).
// Cache ab exam ke hisaab se alag-alag (key = examId, ya 'all' bina filter ke).
const subjectsCache = new Map()
let adminCache = null

export function peekPracticeSubjects(examId) {
  return subjectsCache.get(examId || 'all') ?? null
}

export async function getPracticeSubjects(examId) {
  const res = await api.get('/practice-subjects', { params: examId ? { examId } : {} })
  subjectsCache.set(examId || 'all', res.data)
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

// Kisi subject ke andar ke folders (sub-subjects). Chhota list hai, cache nahi.
export async function getPracticeFolders(parentId) {
  const res = await api.get('/practice-subjects', { params: { parentId } })
  return res.data
}

// parentId dene par yeh subject nahi, us subject ke andar ka FOLDER banta hai.
// isOptional = true to subject/folder "Optional" section me dikhta hai.
export async function createPracticeSubject({ name, examId, parentId, isOptional, color, order }) {
  const res = await api.post('/practice-subjects', { name, examId, parentId, isOptional, color, order })
  subjectsCache.clear()
  return res.data
}

export async function updatePracticeSubject(id, updates) {
  const res = await api.patch(`/practice-subjects/${id}`, updates)
  subjectsCache.clear()
  return res.data
}

export async function deletePracticeSubject(id) {
  const res = await api.delete(`/practice-subjects/${id}`)
  subjectsCache.clear()
  return res.data
}