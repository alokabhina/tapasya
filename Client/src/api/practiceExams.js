// src/api/practiceExams.js
// Exam level of Exam -> Subject -> Test. List is tiny and rarely changes, so
// it's cached in memory (stale-while-revalidate) exactly like practiceSubjects.js.
import api from './client'

let examsCache = null

export function peekPracticeExams() {
  return examsCache
}

export async function getPracticeExams() {
  const res = await api.get('/practice-exams')
  examsCache = res.data
  return res.data
}

export async function getPracticeExam(id) {
  const res = await api.get(`/practice-exams/${id}`)
  return res.data
}

export async function createPracticeExam({ name, color, order }) {
  const res = await api.post('/practice-exams', { name, color, order })
  examsCache = null
  return res.data
}

export async function updatePracticeExam(id, updates) {
  const res = await api.patch(`/practice-exams/${id}`, updates)
  examsCache = null
  return res.data
}

export async function deletePracticeExam(id) {
  const res = await api.delete(`/practice-exams/${id}`)
  examsCache = null
  return res.data
}