// src/api/practiceTests.js
import api from './client'

// ── Student-facing ───────────────────────────────────────────────────────

export async function getPracticeTests(subjectId) {
  const res = await api.get('/practice-tests', { params: subjectId ? { subjectId } : {} })
  return res.data
}

// Instructions-page metadata (no questions yet — those only load once the
// attempt actually starts, via api/practiceAttempts.js).
export async function getPracticeTest(id) {
  const res = await api.get(`/practice-tests/${id}`)
  return res.data
}

// Full question set for a preview render, answers already stripped
// server-side. The live engine itself gets its copy via startPracticeAttempt
// instead — this one is for admin "Preview" mode.
export async function getPracticeTestAttemptPayload(id) {
  const res = await api.get(`/practice-tests/${id}/attempt-payload`)
  return res.data
}

// ── Admin ─────────────────────────────────────────────────────────────────

export async function getAdminPracticeTests(subjectId) {
  const res = await api.get('/practice-tests/admin/all', { params: subjectId ? { subjectId } : {} })
  return res.data
}

// Everything including correctKey/explanation — admin edit/preview screen only.
export async function getPracticeTestFull(id) {
  const res = await api.get(`/practice-tests/${id}/full`)
  return res.data
}

// Dry-run validate — no save. Returns { valid, errors, topicSuggestions, normalized }.
export async function validatePracticeTestPayload(payload, subjectId) {
  const res = await api.post('/practice-tests/validate', { payload, subjectId })
  return res.data
}

export async function createPracticeTest({ subjectId, payload, publish }) {
  const res = await api.post('/practice-tests', { subjectId, payload, publish })
  return res.data
}

export async function updatePracticeTest(id, updates) {
  const res = await api.patch(`/practice-tests/${id}`, updates)
  return res.data
}

// Escape hatch once a test already has attempts — see plan doc Section 8.3.
export async function clonePracticeTest(id) {
  const res = await api.post(`/practice-tests/${id}/clone`)
  return res.data
}

export async function deletePracticeTest(id) {
  const res = await api.delete(`/practice-tests/${id}`)
  return res.data
}