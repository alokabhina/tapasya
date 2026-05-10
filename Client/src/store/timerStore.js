import { create } from 'zustand'
import { persist } from 'zustand/middleware'

const useTimerStore = create(
  persist(
    (set) => ({
      isRunning: false, isPaused: false, elapsed: 0,
      subjectId: null, subjectName: '', subjectColor: '#f97316', sessionStartTime: null,

      setSubject: (s) => set({ subjectId: s.id||s._id, subjectName: s.name, subjectColor: s.color }),

      start: (s) => set({
        isRunning: true, isPaused: false, elapsed: 0,
        subjectId: s.id||s._id, subjectName: s.name, subjectColor: s.color,
        sessionStartTime: new Date().toISOString(),
      }),

      tick:       ()        => set((state) => ({ elapsed: state.elapsed + 1 })),
      setElapsed: (elapsed) => set({ elapsed }),  // FIX: worker se exact value
      pause:  () => set({ isPaused: true,  isRunning: false }),
      resume: () => set({ isPaused: false, isRunning: true  }),
      reset:  () => set({ isRunning: false, isPaused: false, elapsed: 0, subjectId: null, subjectName: '', subjectColor: '#f97316', sessionStartTime: null }),
    }),
    {
      name: 'tapasya_timer',
      partialize: (state) => ({
        isRunning: state.isRunning, isPaused: state.isPaused, elapsed: state.elapsed,
        subjectId: state.subjectId, subjectName: state.subjectName,
        subjectColor: state.subjectColor, sessionStartTime: state.sessionStartTime,
      }),
    }
  )
)
export { useTimerStore }
export default useTimerStore
