// src/api/QuestionBank.js
// Personal question bank — mcq / fill-blank / true-false practice questions,
// separate from the auto-generated word↔meaning quiz in api/Vocab.js.
// Matches existing api/client.js axios pattern.

import api from './client'

// ── POST /api/vocab/questions/upload — bulk add via pasted ChatGPT JSON array ──
export async function uploadQuestions(questions) {
  const res = await api.post('/vocab/questions/upload', questions)
  return res.data // { inserted, skipped, errors[] }
}

// ── POST /api/vocab/questions/add — single manual add ────────────────────────
export async function addQuestion(payload) {
  const res = await api.post('/vocab/questions/add', payload)
  return res.data
}

// ── GET /api/vocab/questions — browse/manage the bank (paginated, filterable) ──
export async function fetchQuestions({ search = '', format = 'all', vocabType = 'all', difficulty = 'all', studyDate = 'all', mine = false, page = 1, limit = 30 } = {}) {
  const res = await api.get('/vocab/questions', { params: { search, format, vocabType, difficulty, studyDate, mine, page, limit } })
  return res.data // { questions[], total, page, pages }
}

// ── GET /api/vocab/questions/stats ────────────────────────────────────────────
export async function fetchQuestionStats() {
  const res = await api.get('/vocab/questions/stats')
  return res.data // { total, byFormat, seen, mastered, weak, unseen }
}

// ── GET /api/vocab/questions/practice — smart due-based practice session ─────
// format/vocabType: optional arrays to restrict the session (e.g. ['fill-blank'], ['idiom','root-word'])
// studyDate: 'all' | 'today' | 'YYYY-MM-DD'
// questionIds: optional array of specific _ids for a custom session (skips smart selection)
export async function fetchQuestionPractice({ n = 10, format, vocabType, difficulty = 'all', studyDate = 'all', questionIds } = {}) {
  const params = { n, difficulty, studyDate }
  if (format?.length) params.format = format.join(',')
  if (vocabType?.length) params.vocabType = vocabType.join(',')
  if (questionIds?.length) params.questionIds = questionIds.join(',')
  const res = await api.get('/vocab/questions/practice', { params })
  return res.data // { questions[] }
}

// ── POST /api/vocab/questions/progress — save a practice answer ──────────────
export async function saveQuestionProgress(questionId, correct) {
  const res = await api.post('/vocab/questions/progress', { questionId, correct })
  return res.data // { ok, progress, streak }
}

// ── DELETE /api/vocab/questions/:id ───────────────────────────────────────────
export async function deleteQuestion(id) {
  const res = await api.delete(`/vocab/questions/${id}`)
  return res.data
}