// src/api/mockExams.js
import api from './client'

// Preset platform options shown in the dropdown — "Other" lets the user
// type a custom name, stored as plain text either way (no enum on backend).
export const MOCK_PLATFORMS = ['Testbook', 'Guidely', 'Yes Officer', 'Oliveboard', 'Other']

export async function createMockExam({ name, sections, linkedExamId }) {
  const res = await api.post('/mock-exams', { name, sections, linkedExamId })
  return res.data
}

export async function getMockExams() {
  const res = await api.get('/mock-exams')
  return res.data
}

export async function getMockExam(id) {
  const res = await api.get(`/mock-exams/${id}`)
  return res.data
}

export async function updateMockExam(id, updates) {
  const res = await api.patch(`/mock-exams/${id}`, updates)
  return res.data
}

export async function deleteMockExam(id) {
  const res = await api.delete(`/mock-exams/${id}`)
  return res.data
}

export async function addMockAttempt(examId, attempt) {
  const res = await api.post(`/mock-exams/${examId}/attempts`, attempt)
  return res.data
}

export async function getMockAttempts(examId, mode) {
  const res = await api.get(`/mock-exams/${examId}/attempts`, { params: mode ? { mode } : {} })
  return res.data
}

export async function getMockAttempt(examId, attemptId) {
  const res = await api.get(`/mock-exams/${examId}/attempts/${attemptId}`)
  return res.data
}

export async function updateMockAttempt(examId, attemptId, updates) {
  const res = await api.patch(`/mock-exams/${examId}/attempts/${attemptId}`, updates)
  return res.data
}

export async function deleteMockAttempt(examId, attemptId) {
  const res = await api.delete(`/mock-exams/${examId}/attempts/${attemptId}`)
  return res.data
}

export async function getMockDashboard(examId) {
  const res = await api.get(`/mock-exams/${examId}/dashboard`)
  return res.data
}