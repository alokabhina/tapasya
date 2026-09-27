// src/api/practiceAttempts.js
import api from './client'

// Starts a fresh attempt, or resumes an already-in-progress one for this
// user+test (server dedupes — see routes/practiceAttempts.js POST /).
// Returns { attempt, test } — test's questions have no correctKey/explanation.
export async function startPracticeAttempt(testId) {
  const res = await api.post('/practice-attempts', { testId })
  return res.data
}

// Resume payload after a refresh/close mid-test.
export async function getPracticeAttempt(id) {
  const res = await api.get(`/practice-attempts/${id}`)
  return res.data
}

// Periodic autosave (plan doc Section 13). `responses[].timeSpentSec` must
// be a *delta* to add server-side, never an absolute value.
export async function savePracticeProgress(id, { sectionIndex, responses, currentSectionIndex }) {
  const res = await api.patch(`/practice-attempts/${id}/progress`, { sectionIndex, responses, currentSectionIndex })
  return res.data
}

// Submits the current section. On the last section this also finalizes the
// whole attempt (scores `overall`, syncs into Mock Tracker). `auto: true`
// for a time's-up auto-submit vs a manual button click.
export async function submitPracticeSection(id, { sectionIndex, timeLeftAtSubmitSec, auto = false }) {
  const res = await api.post(`/practice-attempts/${id}/submit-section`, { sectionIndex, timeLeftAtSubmitSec, auto })
  return res.data // { attempt, isLastSection }
}

export async function getPracticeResult(id) {
  const res = await api.get(`/practice-attempts/${id}/result`)
  return res.data
}

export async function getPracticeAnalysis(id) {
  const res = await api.get(`/practice-attempts/${id}/analysis`)
  return res.data
}

// Answers/explanations only ever come from this endpoint, post-submit.
export async function getPracticeSolutions(id) {
  const res = await api.get(`/practice-attempts/${id}/solutions`)
  return res.data
}

export async function getPracticeAttemptHistory(testId) {
  const res = await api.get(`/practice-attempts/history/${testId}`)
  return res.data
}

// Admin-only — 403s for a regular user, so callers should gate the UI with
// isPracticeAdmin() from api/practiceSubjects.js before rendering a link to this.
export async function getPracticeLeaderboard(testId) {
  const res = await api.get(`/practice-leaderboard/${testId}`)
  return res.data
}

// Red-flag button in TestHeader — flag the current question or the whole
// paper as having an issue. scope: 'question' | 'test'.
export async function reportPracticeIssue(attemptId, { scope, sectionIndex, qNo, message }) {
  const res = await api.post(`/practice-attempts/${attemptId}/report`, { scope, sectionIndex, qNo, message })
  return res.data
}

// Generic "Report" bottom-nav button (see BottomNav.jsx) — not tied to a
// test/attempt, just a page path + free-text message.
export async function reportAppIssue(page, message) {
  const res = await api.post('/practice-attempts/report-general', { page, message })
  return res.data
}

// Admin-only — list/resolve red-flag reports (practice-tests/admin/reports).
export async function getPracticeReports(status) {
  const res = await api.get('/practice-attempts/admin/reports', { params: status ? { status } : {} })
  return res.data
}

export async function resolvePracticeReport(reportId, status) {
  const res = await api.patch(`/practice-attempts/admin/reports/${reportId}`, { status })
  return res.data
}