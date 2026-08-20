// src/store/clockTimerStore.js
// Clock-type countdown timer (miniplayer) — question-solving ke liye alag stopwatch
// (stopwatchStore.js) ke jaisa hi independent hai, study timer (timerStore.js) ko
// bilkul affect nahi karta. User duration set krke start krta hai, wall-clock
// (endAt timestamp) based hai isliye background tab me bhi accurate rehta hai.

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

const DEFAULT_DURATION = 10 * 60 // 10 min default

const useClockTimerStore = create(
  persist(
    (set, get) => ({
      open: false,
      minimized: false,

      durationSec: DEFAULT_DURATION,
      remaining: DEFAULT_DURATION,

      isRunning: false,
      isPaused: false,
      endAt: null,       // ISO — jab timer khatam hoga (running state me)
      finished: false,   // ek baar 0 pe pahuchne par true, alarm ke liye

      // ── Widget visibility ──────────────────────────────────────────────
      openWidget: () => set({ open: true }),
      closeWidget: () => set((s) => ({
        open: false, isRunning: false, isPaused: false,
        endAt: null, finished: false, remaining: s.durationSec,
      })),
      toggleMinimized: () => set((s) => ({ minimized: !s.minimized })),
      setMinimized: (val) => set({ minimized: val }),

      // ── Duration setup (widget open hone se pehle ya reset ke baad) ─────
      setDuration: (sec) => set({ durationSec: sec, remaining: sec, finished: false }),

      // ── Controls ────────────────────────────────────────────────────────
      start: () => set((s) => ({
        open: true, isRunning: true, isPaused: false, finished: false,
        endAt: new Date(Date.now() + s.remaining * 1000).toISOString(),
      })),

      tick: () => {
        const s = get()
        if (!s.isRunning || s.isPaused || !s.endAt) return
        const left = Math.max(0, Math.round((new Date(s.endAt).getTime() - Date.now()) / 1000))
        if (left <= 0) {
          set({ remaining: 0, isRunning: false, isPaused: false, endAt: null, finished: true })
        } else {
          set({ remaining: left })
        }
      },

      pause: () => set({ isPaused: true, endAt: null }),
      resume: () => set((s) => ({
        isPaused: false,
        endAt: new Date(Date.now() + s.remaining * 1000).toISOString(),
      })),

      reset: () => set((s) => ({
        isRunning: false, isPaused: false, endAt: null,
        finished: false, remaining: s.durationSec,
      })),

      acknowledgeFinish: () => set({ finished: false }),
    }),
    {
      name: 'tapasya_clock_timer',
      partialize: (s) => ({
        open: s.open, minimized: s.minimized,
        durationSec: s.durationSec, remaining: s.remaining,
        isRunning: s.isRunning, isPaused: s.isPaused,
        endAt: s.endAt, finished: s.finished,
      }),
    }
  )
)

export { useClockTimerStore }
export default useClockTimerStore