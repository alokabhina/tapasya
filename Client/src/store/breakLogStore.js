// src/store/breakLogStore.js
// Manual break tracker (Lunch/Walk/Nap/Rest/Custom) — user starts/stops this
// themselves. Fully independent of the study timer: starting or stopping a
// break never reads from or writes to timerStore, and the completed break
// is saved to its own /api/breaks endpoint / BreakSession collection.

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

const useBreakLogStore = create(
  persist(
    (set) => ({
      isBreakRunning: false,
      breakType: 'lunch',   // 'lunch' | 'walk' | 'nap' | 'rest' | 'custom'
      breakLabel: '',       // used when breakType === 'custom'
      breakStartTime: null, // ISO

      startBreak: (type, label = '') => set({
        isBreakRunning: true, breakType: type, breakLabel: label,
        breakStartTime: new Date().toISOString(),
      }),

      stopBreak: () => set({
        isBreakRunning: false, breakType: 'lunch', breakLabel: '', breakStartTime: null,
      }),
    }),
    { name: 'tapasya_break_log' }
  )
)

export { useBreakLogStore }
export default useBreakLogStore