// src/store/breakReminderStore.js
// The auto "5-min nudge" that appears on Home after a study session ends.
// Deliberately tiny and DB-free — this never gets saved anywhere, it's a
// pure ambient UI reminder derived from a single wall-clock timestamp so
// it survives reloads/tab-switches the same way timerStore's session does.

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

const useBreakReminderStore = create(
  persist(
    (set) => ({
      anchorAt: null,     // ISO timestamp of when the last study session ended
      extraSeconds: 0,    // manual extensions added via the ring's "+" control

      // Called right after a study session is saved (see useTimer.js _saveAndReset)
      startReminder: () => set({ anchorAt: new Date().toISOString(), extraSeconds: 0 }),

      // Called right when a new study session starts (see useTimer.js start)
      clearReminder: () => set({ anchorAt: null, extraSeconds: 0 }),

      // Called from the ring's "+30s / +1m / +2m / +5m" control once the
      // nudge has run out — pushes the countdown/overdue boundary further
      // out instead of forcing the person back to study immediately.
      addExtension: (seconds) => set((s) => ({ extraSeconds: s.extraSeconds + seconds })),
    }),
    { name: 'tapasya_break_reminder' }
  )
)

export { useBreakReminderStore }
export default useBreakReminderStore