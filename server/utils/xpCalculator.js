// utils/xpCalculator.js
// Score & XP formula per the Tapasya Game System Plan

const LEVEL_THRESHOLDS = [
  { level: 'aspirant',   min: 0 },
  { level: 'learner',    min: 500 },
  { level: 'contender',  min: 1500 },
  { level: 'achiever',   min: 4000 },
  { level: 'champion',   min: 8000 },
  { level: 'legend',     min: 15000 },
]

const RANK_THRESHOLDS = [
  { rank: 'bronze',   min: 0 },
  { rank: 'silver',   min: 1000 },
  { rank: 'gold',     min: 3000 },
  { rank: 'platinum', min: 6000 },
  { rank: 'diamond',  min: 10000 },
]

/**
 * Calculate points earned for a single answer
 * @param {boolean} isCorrect
 * @param {number}  timeTaken  - seconds taken to answer
 * @param {number}  streak     - current correct streak BEFORE this answer
 * @returns {number} points (min 0)
 */
export function calcAnswerPoints(isCorrect, timeTaken, streak) {
  if (!isCorrect) return -3

  // Base points by speed
  let base = 10
  if (timeTaken < 3)      base = 20
  else if (timeTaken < 5) base = 15

  // Streak multiplier applied AFTER this answer increments streak
  const newStreak = streak + 1
  let multiplier = 1
  if (newStreak >= 10)     multiplier = 3
  else if (newStreak >= 5) multiplier = 2
  else if (newStreak >= 3) multiplier = 1.5

  return Math.round(base * multiplier)
}

/**
 * Calculate final game score including mode bonuses
 * @param {object} params
 * @param {number} params.rawScore       - sum of per-answer points (min 0)
 * @param {number} params.correctCount
 * @param {number} params.wrongCount
 * @param {string} params.mode           - 'normal' | 'sprint' | 'survival'
 * @param {number} params.survivalCount  - questions survived (survival mode)
 * @returns {{ finalScore: number, xpEarned: number }}
 */
export function calcFinalScore({ rawScore, correctCount, wrongCount, mode = 'normal', survivalCount = 0 }) {
  let score = Math.max(0, rawScore)

  // Mode bonus
  if (mode === 'sprint') {
    score = Math.round(score * 1.20)
  }

  // Perfect round bonus
  if (wrongCount === 0 && correctCount > 0) {
    score += 50
  }

  // Survival bonus: +5 per 10 questions survived
  if (mode === 'survival') {
    score += Math.floor(survivalCount / 10) * 5
  }

  // XP = score 1:1
  return { finalScore: score, xpEarned: score }
}

/**
 * Derive global level from total XP
 * @param {number} totalXP
 * @returns {string} level name
 */
export function getLevel(totalXP) {
  let level = 'aspirant'
  for (const t of LEVEL_THRESHOLDS) {
    if (totalXP >= t.min) level = t.level
  }
  return level
}

/**
 * Derive per-game rank from rank points
 * @param {number} rankPoints
 * @returns {string} rank name
 */
export function getRank(rankPoints) {
  let rank = 'bronze'
  for (const t of RANK_THRESHOLDS) {
    if (rankPoints >= t.min) rank = t.rank
  }
  return rank
}
