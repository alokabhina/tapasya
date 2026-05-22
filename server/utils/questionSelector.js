// utils/questionSelector.js
// Smart question selection with spaced repetition
// Per plan: 40% weak + 40% unseen + 20% previously correct
// Excludes questions seen in last 24 hours

import Question from '../models/Question.js'

/**
 * Select a personalized batch of questions for a game session
 * @param {object} params
 * @param {string}   params.gameType      - 'calculation' | 'series' | 'vocab' | 'syllogism' | 'survival'
 * @param {object[]} params.questionHistory - user's questionHistory array from UserGameProfile
 * @param {number}   params.level         - current difficulty level (for calculation)
 * @param {number}   params.batchSize     - how many questions to return (default 20)
 * @returns {Promise<object[]>} shuffled question array
 */
export async function selectQuestions({ gameType, questionHistory = [], level = 1, batchSize = 20 }) {
  const cutoff24h = new Date(Date.now() - 24 * 60 * 60 * 1000)

  // Build lookup maps from history
  const historyMap = {}
  const recentIds = new Set()

  for (const h of questionHistory) {
    const id = h.questionId?.toString()
    if (!id) continue
    historyMap[id] = h
    if (new Date(h.lastAttempted) > cutoff24h) {
      recentIds.add(id)
    }
  }

  const weakIds    = new Set()
  const seenIds    = new Set()
  const correctIds = new Set()

  for (const [id, h] of Object.entries(historyMap)) {
    if (recentIds.has(id)) continue // skip last 24h
    if (h.wrongCount > 0)          weakIds.add(id)
    else if (h.attemptCount > 0)   correctIds.add(id)
    seenIds.add(id)
  }

  // Build base filter for this game type
  // Survival = mixed questions from all other types (no 'survival' docs in DB)
  const baseFilter = gameType === 'survival'
    ? { gameType: { $in: ['calculation', 'series', 'vocab', 'syllogism'] } }
    : { gameType }

  // Calculation: filter by exact level
  if (gameType === 'calculation' && level) {
    baseFilter.level = level
  }

  // Helper: fetch from a given id set (sliced to limit)
  async function fetchByIds(ids, limit) {
    if (ids.size === 0 || limit <= 0) return []
    const arr = [...ids].slice(0, limit * 3) // over-fetch for variety
    const docs = await Question.find({ ...baseFilter, _id: { $in: arr } }).limit(limit * 2).lean()
    return shuffle(docs).slice(0, limit)
  }

  // Fetch unseen questions
  async function fetchUnseen(limit, ignoreRecent = false) {
    if (limit <= 0) return []
    const exclude = ignoreRecent ? [...seenIds] : [...seenIds, ...recentIds]
    const docs = await Question.find({
      ...baseFilter,
      ...(exclude.length ? { _id: { $nin: exclude } } : {}),
    }).limit(limit * 2).lean()
    return shuffle(docs).slice(0, limit)
  }

  const weakCount    = Math.round(batchSize * 0.40)
  const unseenCount  = Math.round(batchSize * 0.40)
  const correctCount = batchSize - weakCount - unseenCount // ~20%

  const [weakQ, unseenQ, correctQ] = await Promise.all([
    fetchByIds(weakIds, weakCount),
    fetchUnseen(unseenCount),
    fetchByIds(correctIds, correctCount),
  ])

  let batch = [...weakQ, ...unseenQ, ...correctQ]

  // If we didn't get enough, top up with any available questions (excluding recent)
  if (batch.length < batchSize) {
    const existingIds = new Set(batch.map(q => q._id.toString()))
    const exclude = [...existingIds, ...recentIds]
    const topUp = await Question.find({
      ...baseFilter,
      ...(exclude.length ? { _id: { $nin: exclude } } : {}),
    }).limit(batchSize - batch.length).lean()
    batch = [...batch, ...topUp]
  }

  // FALLBACK: if still not enough (all questions in 24h cooldown), ignore cooldown
  // This happens when question pool is small (e.g. only 9 level-1 questions)
  if (batch.length === 0) {
    const existingIds = new Set(batch.map(q => q._id.toString()))
    const exclude = [...existingIds]
    const fallback = await Question.find({
      ...baseFilter,
      ...(exclude.length ? { _id: { $nin: exclude } } : {}),
    }).limit(batchSize).lean()
    batch = shuffle(fallback)
  }

  return shuffle(batch).slice(0, batchSize)
}

function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}