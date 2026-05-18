import { create } from 'zustand'
import { persist } from 'zustand/middleware'

const useUserStore = create(
  persist(
    (set) => ({
      uid: null,
      displayName: '',
      photoURL: null,
      email: '',
      isGuest: false,
      dailyGoalSeconds: 6 * 3600, // default 6 hours
      theme: 'dark',
      bgImageUrl: null,
      streakDays: 0,
      totalHoursAllTime: 0,
      // groupId removed — users can now join/create unlimited groups

      setUser: (user) =>
        set((state) => ({
          uid: user.uid,
          // Only use server value if user hasn't set a custom local name
          displayName: state.displayName && state.displayName !== 'Aspirant'
            ? state.displayName
            : (user.displayName || 'Aspirant'),
          // Only use server photoURL if user hasn't set a custom local photo
          photoURL: state.photoURL
            ? state.photoURL
            : (user.photoURL || null),
          email: user.email || state.email || '',
          isGuest: user.isAnonymous || user.isGuest || false,
        })),

      setGoal: (seconds) => set({ dailyGoalSeconds: seconds }),

      setDisplayName: (name) => set({ displayName: name }),

      setPhotoURL: (url) => set({ photoURL: url }),

      setTheme: (theme) => {
        document.documentElement.classList.toggle('dark', theme === 'dark')
        set({ theme })
      },

      setBgImage: (url) => set({ bgImageUrl: url }),

      setStreak: (days) => set({ streakDays: days }),

      setTotalHours: (hours) => set({ totalHoursAllTime: hours }),

      clearUser: () =>
        set({
          uid: null,
          email: '',
          isGuest: false,
          // displayName and photoURL intentionally kept — user set them locally
        }),
    }),
    {
      name: 'tapasya_user',
      partialize: (state) => ({
        uid: state.uid,                        // offline reload ke liye — uid persist karo
        email: state.email,
        isGuest: state.isGuest,
        theme: state.theme,
        bgImageUrl: state.bgImageUrl,
        dailyGoalSeconds: state.dailyGoalSeconds,
        displayName: state.displayName,
        photoURL: state.photoURL,
      }),
    }
  )
)

// BUG 2 FIX: Named export added so both `import useUserStore` and
// `import { useUserStore }` work across the codebase
export { useUserStore }
export default useUserStore