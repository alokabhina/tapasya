// src/hooks/gameScoreHelper.js
// Mirrors server/utils/xpCalculator.js logic on the client
// Used for instant live score display during gameplay

/**
 * Calculate points for a single answer (mirrors server formula)
 * @param {boolean} isCorrect
 * @param {number}  timeTaken  - seconds
 * @param {number}  streak     - streak BEFORE this answer
 */
export function calcAnswerPoints(isCorrect, timeTaken, streak) {
  if (!isCorrect) return -3

  let base = 10
  if (timeTaken < 3)      base = 20
  else if (timeTaken < 5) base = 15

  const newStreak = streak + 1
  let multiplier = 1
  if (newStreak >= 10)     multiplier = 3
  else if (newStreak >= 5) multiplier = 2
  else if (newStreak >= 3) multiplier = 1.5

  return Math.round(base * multiplier)
}

export const LEVEL_LABELS = {
  aspirant:   { label: '🌱 Aspirant',   color: 'text-green-400'  },
  learner:    { label: '📖 Learner',    color: 'text-blue-400'   },
  contender:  { label: '⚡ Contender',  color: 'text-yellow-400' },
  achiever:   { label: '🔥 Achiever',   color: 'text-orange-400' },
  champion:   { label: '🏆 Champion',   color: 'text-amber-400'  },
  legend:     { label: '👑 Legend',     color: 'text-purple-400' },
}

export const RANK_LABELS = {
  bronze:   { label: '🥉 Bronze',   color: 'text-amber-700'  },
  silver:   { label: '🥈 Silver',   color: 'text-slate-300'  },
  gold:     { label: '🥇 Gold',     color: 'text-yellow-400' },
  platinum: { label: '💎 Platinum', color: 'text-cyan-400'   },
  diamond:  { label: '👑 Diamond',  color: 'text-purple-400' },
}

export const GAME_META = {
  calculation: { icon: '⚡', title: 'Calculation Climb', color: 'from-orange-500 to-amber-500', desc: 'Speed maths — L1 to L6 BODMAS' },
  series:      { icon: '📈', title: 'Number Series Rush', color: 'from-blue-500 to-cyan-500',   desc: 'Find the pattern, tap the answer' },
  vocab:       { icon: '📖', title: 'Vocab Blitz',        color: 'from-purple-500 to-pink-500', desc: 'Synonym · Antonym · One-word' },
  syllogism:   { icon: '🧠', title: 'Syllogism Strike',   color: 'from-green-500 to-teal-500',  desc: 'Logic rapid fire — True or False' },
  survival:    { icon: '💀', title: 'Survival Arena',     color: 'from-red-500 to-rose-500',    desc: '3 lives · Mixed · How far can you go?' },
  grammar:     { icon: '✍️', title: 'Grammar Gladiator',  color: 'from-indigo-500 to-violet-500', desc: 'Articles · Tenses · Error Spotting · More' },
}