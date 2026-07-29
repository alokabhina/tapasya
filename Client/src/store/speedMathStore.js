// src/store/speedMathStore.js
// Zustand store for the active Speed Math test — mirrors gameStore.js pattern
// Not persisted — an in-progress test resets on page reload (intentional)

import { create } from 'zustand'

const useSpeedMathStore = create((set, get) => ({
  // ── Config (carried from Config screen into Play screen) ──────────────────
  modules:  [],     // e.g. ['table'] or ['table','square','cube','percent']
  config:   null,   // { tableRange, squareRange, cubeRange, percentTier, questionCount, timePerQuestion }

  // ── Active test state ───────────────────────────────────────────────────
  questions:    [],
  currentIndex: 0,
  breakdown:    [], // [{ module, itemKey, questionText, userAnswer, correctAnswer, isCorrect, timeTakenMs }]
  isPlaying:    false,
  isFinished:   false,
  lastResult:   null, // response from POST /submit

  // ── Actions ─────────────────────────────────────────────────────────────
  startTest: (modules, config, questions) => set({
    modules, config, questions,
    currentIndex: 0,
    breakdown: [],
    isPlaying: true,
    isFinished: false,
    lastResult: null,
  }),

  recordAnswer: ({ module, itemKey, questionText, userAnswer, correctAnswer, isCorrect, timeTakenMs }) =>
    set((state) => ({
      breakdown: [
        ...state.breakdown,
        { module, itemKey, questionText, userAnswer, correctAnswer, isCorrect, timeTakenMs },
      ],
    })),

  nextQuestion: () =>
    set((state) => {
      const next = state.currentIndex + 1
      if (next >= state.questions.length) {
        return { isFinished: true, isPlaying: false }
      }
      return { currentIndex: next }
    }),

  setLastResult: (result) => set({ lastResult: result }),

  resetTest: () => set({
    modules: [], config: null, questions: [], currentIndex: 0,
    breakdown: [], isPlaying: false, isFinished: false, lastResult: null,
  }),
}))

export default useSpeedMathStore