// src/store/gameStore.js
// Zustand store for active game session state
// Matches timerStore.js pattern — create + persist

import { create } from 'zustand'

// Not persisted — active game resets on page reload (intentional)
const useGameStore = create((set, get) => ({
  // ── Active game ──────────────────────────────────────────────────────────
  gameType:      null,   // 'calculation' | 'series' | 'vocab' | 'syllogism' | 'survival'
  questions:     [],
  currentIndex:  0,
  score:         0,
  rawScore:      0,      // sum of per-answer points before bonuses
  xpEarned:      0,
  streak:        0,      // current correct streak
  maxStreak:     0,
  lives:         3,      // survival mode
  currentLevel:  1,      // calculation climb L1–L6
  correctInRow:  0,      // for level-up (3 correct = level up)
  wrongInRow:    0,      // for staying (2 wrong = stay)
  breakdown:     [],     // per-question results for submission
  isPlaying:     false,
  isGameOver:    false,
  showResult:    false,
  lastResult:    null,   // response from POST /submit

  // ── Actions ──────────────────────────────────────────────────────────────
  startGame: (gameType, questions) => set({
    gameType,
    questions,
    currentIndex:  0,
    score:         0,
    rawScore:      0,
    xpEarned:      0,
    streak:        0,
    maxStreak:     0,
    lives:         3,
    currentLevel:  1,
    correctInRow:  0,
    wrongInRow:    0,
    breakdown:     [],
    isPlaying:     true,
    isGameOver:    false,
    showResult:    false,
    lastResult:    null,
  }),

  recordAnswer: ({ questionId, topic, isCorrect, timeTaken, pointsEarned, userAnswer, correctAnswer }) =>
    set((state) => {
      const newStreak        = isCorrect ? state.streak + 1 : 0
      const newCorrectInRow  = isCorrect ? state.correctInRow + 1 : 0
      const newWrongInRow    = isCorrect ? 0 : state.wrongInRow + 1
      const newRawScore      = Math.max(0, state.rawScore + pointsEarned)

      // Calculation climb level logic: 3 correct = up, 2 wrong = stay enforced
      let newLevel = state.currentLevel
      if (state.gameType === 'calculation') {
        if (newCorrectInRow >= 3 && newLevel < 6) {
          newLevel = newLevel + 1
        }
        // 2 wrong in a row: level already capped — just reset correctInRow
      }

      // Survival mode: lose a life on wrong
      const newLives = (state.gameType === 'survival' && !isCorrect)
        ? state.lives - 1
        : state.lives

      const isGameOver = (state.gameType === 'survival' && newLives <= 0)
        || (state.currentIndex >= state.questions.length - 1 && !( state.gameType === 'survival' && newLives > 0))

      return {
        streak:        newStreak,
        maxStreak:     Math.max(state.maxStreak, newStreak),
        correctInRow:  newCorrectInRow,
        wrongInRow:    newWrongInRow,
        rawScore:      newRawScore,
        currentLevel:  newLevel,
        lives:         newLives,
        isGameOver,
        breakdown: [
          ...state.breakdown,
          { questionId, topic, isCorrect, timeTaken, pointsEarned, userAnswer, correctAnswer, gameType: state.gameType },
        ],
      }
    }),

  nextQuestion: () =>
    set((state) => {
      const next = state.currentIndex + 1
      if (next >= state.questions.length) {
        return { isGameOver: true }
      }
      return { currentIndex: next }
    }),

  setGameOver: () => set({ isGameOver: true }),

  setLastResult: (result) => set({ lastResult: result, showResult: true, isPlaying: false }),

  resetGame: () => set({
    gameType:     null,
    questions:    [],
    currentIndex: 0,
    score: 0, rawScore: 0, xpEarned: 0,
    streak: 0, maxStreak: 0,
    lives: 3, currentLevel: 1,
    correctInRow: 0, wrongInRow: 0,
    breakdown: [],
    isPlaying: false, isGameOver: false, showResult: false, lastResult: null,
  }),

  // Selectors
  currentQuestion: () => {
    const s = get()
    return s.questions[s.currentIndex] || null
  },
}))

export { useGameStore }
export default useGameStore