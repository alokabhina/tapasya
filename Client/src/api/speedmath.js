// src/api/speedmath.js
// All API calls for Speed Math (Tables/Squares/Cubes/%-Fraction) — separate from api/games.js

import api from './client'

// ── POST /api/speedmath/submit ────────────────────────────────────────────────
export async function submitSpeedMathTest(payload) {
  const res = await api.post('/speedmath/submit', payload)
  return res.data // { sessionId, correctCount, wrongCount, accuracy, avgTimeMs, currentStreak, suggestions[] }
}

// ── GET /api/speedmath/profile ────────────────────────────────────────────────
export async function fetchSpeedMathProfile() {
  const res = await api.get('/speedmath/profile')
  return res.data // { totalTests, totalQuestions, overallAccuracy, currentStreak, bestStreak, items[], weakItems[] }
}

// ── GET /api/speedmath/sessions ───────────────────────────────────────────────
export async function fetchSpeedMathSessions() {
  const res = await api.get('/speedmath/sessions')
  return res.data
}