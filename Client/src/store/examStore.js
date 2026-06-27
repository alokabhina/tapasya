// src/store/examStore.js
// Stores multiple target exams (e.g. IBPS PO, SSC CGL) with their exam date,
// so Home screen can show a live countdown. Pure client-side, persisted
// to localStorage — same pattern as userStore / subjectStore.

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

const useExamStore = create(
  persist(
    (set, get) => ({
      exams: [], // [{ id, name, date: 'YYYY-MM-DD', color }]

      addExam: (exam) =>
        set((state) => ({
          exams: [
            ...state.exams,
            {
              id: `exam_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
              name: exam.name,
              date: exam.date,
              color: exam.color || '#a855f7',
            },
          ],
        })),

      updateExam: (id, data) =>
        set((state) => ({
          exams: state.exams.map((e) => (e.id === id ? { ...e, ...data } : e)),
        })),

      deleteExam: (id) =>
        set((state) => ({
          exams: state.exams.filter((e) => e.id !== id),
        })),

      // Exams sorted by nearest upcoming first; past exams pushed to bottom
      getSortedExams: () => {
        const today = new Date(); today.setHours(0, 0, 0, 0)
        return [...get().exams].sort((a, b) => {
          const da = new Date(a.date) - today
          const db = new Date(b.date) - today
          const aPast = da < 0, bPast = db < 0
          if (aPast !== bPast) return aPast ? 1 : -1
          return da - db
        })
      },
    }),
    {
      name: 'tapasya_exams',
      partialize: (state) => ({ exams: state.exams }),
    }
  )
)

export { useExamStore }
export default useExamStore