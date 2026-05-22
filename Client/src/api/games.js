// src/api/games.js
// All API calls for the Practice Arena game system
// Matches existing api/client.js axios pattern

import api from './client'

// ── GET /api/games/questions/:type ────────────────────────────────────────────
// Fetch a smart-selected question batch (spaced repetition)
// level: 1–6 for calculation climb
export async function fetchQuestions(gameType, { level = 1, size = 20 } = {}) {
  const res = await api.get(`/games/questions/${gameType}`, { params: { level, size } })
  return res.data // { questions[], sessionId }
}

// ── POST /api/games/submit ────────────────────────────────────────────────────
// Submit completed game result — awards XP, updates rank + weak topics
// breakdown: [{ questionId, topic, isCorrect, timeTaken, pointsEarned, userAnswer, correctAnswer }]
export async function submitGame(payload) {
  const res = await api.post('/games/submit', payload)
  return res.data // { sessionId, finalScore, xpEarned, newLevel, newRank, weakTopics, ... }
}

// ── GET /api/games/profile ────────────────────────────────────────────────────
// Current user's XP, level, all game ranks and stats
export async function fetchGameProfile() {
  const res = await api.get('/games/profile')
  return res.data // { totalXP, level, gameStats, dailyStreak, lastGameDate }
}

// ── GET /api/games/stats/:type ────────────────────────────────────────────────
// Analytics for a specific game type: weak topics, speed, score history
export async function fetchGameStats(gameType) {
  const res = await api.get(`/games/stats/${gameType}`)
  return res.data // { weakTopics, speedStats, recentScores, wrongWords, ... }
}

// ── GET /api/games/history ────────────────────────────────────────────────────
// Last 20 sessions across all game types
export async function fetchGameHistory() {
  const res = await api.get('/games/history')
  return res.data // [{ gameType, score, xpEarned, correctCount, wrongCount, date }]
}