// src/store/breakUIStore.js
// Deliberately NOT persisted — this is just "is the overlay open right now",
// not something that should survive a reload. Separate from breakLogStore
// (which holds the actual running-break data) and breakReminderStore (the
// auto-nudge data) so none of them get tangled together.

import { create } from 'zustand'

const useBreakUIStore = create((set) => ({
  overlayOpen: false,
  openOverlay: () => set({ overlayOpen: true }),
  closeOverlay: () => set({ overlayOpen: false }),
}))

export default useBreakUIStore