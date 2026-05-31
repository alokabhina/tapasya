import { create } from 'zustand'
import { persist } from 'zustand/middleware'

const useTimerStore = create(
  persist(
    (set) => ({
      isRunning: false, isPaused: false, elapsed: 0,
      subjectId: null, subjectName: '', subjectColor: '#f97316', sessionStartTime: null,
      miniPlayerMinimized: false,
      // ── FIX: track paused time so wall-clock sync doesn't count pause durations ──
      totalPausedSeconds: 0,  // cumulative seconds spent in paused state
      pausedAt: null,         // ISO timestamp of when current pause started

      setSubject: (s) => set({ subjectId: s.id||s._id, subjectName: s.name, subjectColor: s.color }),

      start: (s) => set({
        isRunning: true, isPaused: false, elapsed: 0,
        subjectId: s.id||s._id, subjectName: s.name, subjectColor: s.color,
        sessionStartTime: new Date().toISOString(),
        miniPlayerMinimized: false,
        totalPausedSeconds: 0,
        pausedAt: null,
      }),

      tick:       ()        => set((state) => ({ elapsed: state.elapsed + 1 })),
      setElapsed: (elapsed) => set({ elapsed }),  // worker se exact value

      // FIX: record when pause started
      pause:  () => set({ isPaused: true,  isRunning: true, pausedAt: new Date().toISOString() }),

      // FIX: accumulate pause duration on resume
      resume: (pausedAt) => set((state) => {
        const pauseStart = pausedAt || state.pausedAt
        const addedPause = pauseStart
          ? Math.round((Date.now() - new Date(pauseStart).getTime()) / 1000)
          : 0
        return {
          isPaused: false,
          isRunning: true,
          pausedAt: null,
          totalPausedSeconds: (state.totalPausedSeconds || 0) + addedPause,
        }
      }),

      setMiniPlayerMinimized: (val) => set({ miniPlayerMinimized: val }),

      reset:  () => set({
        isRunning: false, isPaused: false, elapsed: 0,
        subjectId: null, subjectName: '', subjectColor: '#f97316',
        sessionStartTime: null, miniPlayerMinimized: false,
        totalPausedSeconds: 0, pausedAt: null,
      }),
    }),
    {
      name: 'tapasya_timer',
      partialize: (state) => ({
        isRunning: state.isRunning, isPaused: state.isPaused, elapsed: state.elapsed,
        subjectId: state.subjectId, subjectName: state.subjectName,
        subjectColor: state.subjectColor, sessionStartTime: state.sessionStartTime,
        miniPlayerMinimized: state.miniPlayerMinimized,
        totalPausedSeconds: state.totalPausedSeconds,
        pausedAt: state.pausedAt,
      }),
    }
  )
)
export { useTimerStore }
export default useTimerStore