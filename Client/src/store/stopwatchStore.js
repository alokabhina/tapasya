// src/store/stopwatchStore.js
// Question-solving stopwatch — bilkul alag store hai study timer (timerStore.js) se,
// isliye ye kabhi bhi study timer ko affect nahi karega. Real stopwatch ki tarah:
// Start -> chalu, Lap -> current time save (split) but chalta rahta hai, Stop -> ruk jata hai.
// Wall-clock (Date.now diff) based ticking, so background tab throttle se bhi accurate rehta hai.

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

const useStopwatchStore = create(
  persist(
    (set, get) => ({
      open: false,              // widget kabhi dikhna chahiye ya nahi
      minimized: false,         // chota pill vs full panel (laps ke saath)

      isRunning: false,
      isPaused: false,
      startedAt: null,          // ISO — jab current running segment shuru hua
      baseElapsed: 0,           // pause/lap se pehle tak ka accumulated seconds
      elapsed: 0,               // live seconds (UI ke liye)

      laps: [],                 // [{ id, no, lapTime, totalTime, at }]

      // ── Widget visibility ──────────────────────────────────────────────
      openWidget: () => set({ open: true }),
      closeWidget: () => set({
        open: false, isRunning: false, isPaused: false,
        elapsed: 0, baseElapsed: 0, startedAt: null, laps: [],
      }),
      toggleMinimized: () => set((s) => ({ minimized: !s.minimized })),
      setMinimized: (val) => set({ minimized: val }),

      // ── Controls ────────────────────────────────────────────────────────
      start: () => set({
        open: true, isRunning: true, isPaused: false,
        startedAt: new Date().toISOString(),
        baseElapsed: 0, elapsed: 0, laps: [],
      }),

      // Har ~250ms UI se call hoga jab running ho — Date.now() diff se recompute,
      // isliye tab minimize/background hone par bhi sahi time dikhega.
      tick: () => {
        const s = get()
        if (!s.isRunning || s.isPaused || !s.startedAt) return
        const diff = Math.floor((Date.now() - new Date(s.startedAt).getTime()) / 1000)
        set({ elapsed: s.baseElapsed + diff })
      },

      pause: () => set((s) => ({ isPaused: true, baseElapsed: s.elapsed, startedAt: null })),
      resume: () => set({ isPaused: false, startedAt: new Date().toISOString() }),

      // Lap: current elapsed ko record kr leta hai, stopwatch chalta rehta hai
      lap: () => set((s) => {
        const lastTotal = s.laps.length ? s.laps[s.laps.length - 1].totalTime : 0
        const newLap = {
          id: `${Date.now()}_${s.laps.length}`,
          no: s.laps.length + 1,
          lapTime: s.elapsed - lastTotal,
          totalTime: s.elapsed,
          at: new Date().toISOString(),
        }
        return { laps: [...s.laps, newLap] }
      }),

      // Stop: rok deta hai, laps/elapsed review ke liye rehte hain
      stop: () => set({ isRunning: false, isPaused: false, startedAt: null }),

      // Reset: sab clear kr deta hai (widget bandh nahi hota, bas 00:00 pe wapas)
      reset: () => set({
        isRunning: false, isPaused: false, elapsed: 0, baseElapsed: 0,
        startedAt: null, laps: [],
      }),
    }),
    {
      name: 'tapasya_stopwatch',
      partialize: (s) => ({
        open: s.open, minimized: s.minimized,
        isRunning: s.isRunning, isPaused: s.isPaused,
        startedAt: s.startedAt, baseElapsed: s.baseElapsed, elapsed: s.elapsed,
        laps: s.laps,
      }),
    }
  )
)

export { useStopwatchStore }
export default useStopwatchStore