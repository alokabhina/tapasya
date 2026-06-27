// src/api/vocab.js
// All API calls for Vocab Master — personal dictionary + quiz tool
// Matches existing api/client.js axios pattern

import api from './client'

// ── GET /api/vocab/words — paginated dictionary (search + filters) ───────────
export async function fetchWords({ search = '', wordType = 'all', difficulty = 'all', tag = '', attempted = false, page = 1, limit = 30 } = {}) {
  const res = await api.get('/vocab/words', { params: { search, wordType, difficulty, tag, attempted, page, limit } })
  return res.data // { words[], total, page, pages }
}

// ── POST /api/vocab/add — single word manual add ─────────────────────────────
export async function addWord(payload) {
  const res = await api.post('/vocab/add', payload)
  return res.data
}

// ── POST /api/vocab/upload — bulk add via pasted ChatGPT JSON array ──────────
export async function uploadWords(words) {
  const res = await api.post('/vocab/upload', words)
  return res.data // { upserted, matched }
}

// ── DELETE /api/vocab/word/:id ────────────────────────────────────────────────
export async function deleteWord(id) {
  const res = await api.delete(`/vocab/word/${id}`)
  return res.data
}

// ── GET /api/vocab/quiz — smart 80/20 word selection ──────────────────────────
export async function fetchQuiz({ n = 10, pool = 'all', tag } = {}) {
  const res = await api.get('/vocab/quiz', { params: { n, pool, tag } })
  return res.data // { words[] }
}

// ── POST /api/vocab/progress — save a quiz answer ─────────────────────────────
export async function saveProgress(wordId, correct) {
  const res = await api.post('/vocab/progress', { wordId, correct })
  return res.data // { ok, progress }
}

// ── GET /api/vocab/stats — overall dictionary + mastery stats ────────────────
export async function fetchVocabStats() {
  const res = await api.get('/vocab/stats')
  return res.data // { totalWords, seen, mastered, weak, unseen }
}

// ── GET /api/vocab/word-of-day ────────────────────────────────────────────────
export async function fetchWordOfDay() {
  const res = await api.get('/vocab/word-of-day')
  return res.data // { word }
}