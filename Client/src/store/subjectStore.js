import { create } from 'zustand'
import { persist } from 'zustand/middleware'

const useSubjectStore = create(
  persist(
    (set) => ({
      subjects: [], // [{ id, name, color, todaySeconds }]

      setSubjects: (subjects) => set({ subjects }),

      addSubject: (subject) =>
        set((state) => ({
          subjects: [...state.subjects, { ...subject, todaySeconds: 0 }],
        })),

      updateSubject: (id, data) =>
        set((state) => ({
          subjects: state.subjects.map((s) =>
            s.id === id ? { ...s, ...data } : s
          ),
        })),

      deleteSubject: (id) =>
        set((state) => ({
          subjects: state.subjects.filter((s) => s.id !== id),
        })),

      // Timer stop hone ke baad today's time update karo
      updateTodayTime: (id, addSeconds) =>
        set((state) => ({
          subjects: state.subjects.map((s) =>
            s.id === id
              ? { ...s, todaySeconds: (s.todaySeconds || 0) + addSeconds }
              : s
          ),
        })),

      // Midnight pe reset karo
      resetTodayTime: () =>
        set((state) => ({
          subjects: state.subjects.map((s) => ({ ...s, todaySeconds: 0 })),
        })),
    }),
    {
      name: 'tapasya_subjects',
      // Only persist subjects list — todaySeconds will be refreshed from IndexedDB on mount
      partialize: (state) => ({ subjects: state.subjects }),
    }
  )
)

// BUG 2 FIX: Named export added so both `import useSubjectStore` and
// `import { useSubjectStore }` work across the codebase
export { useSubjectStore }
export default useSubjectStore