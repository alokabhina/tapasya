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
      groupId: null, // joined group ka id

      setUser: (user) =>
        set({
          uid: user.uid,
          displayName: user.displayName || 'Aspirant',
          photoURL: user.photoURL || null,
          email: user.email || '',
          isGuest: user.isAnonymous || false,
        }),

      setGoal: (seconds) => set({ dailyGoalSeconds: seconds }),

      setTheme: (theme) => {
        document.documentElement.classList.toggle('dark', theme === 'dark')
        set({ theme })
      },

      setBgImage: (url) => set({ bgImageUrl: url }),

      setStreak: (days) => set({ streakDays: days }),

      setTotalHours: (hours) => set({ totalHoursAllTime: hours }),

      setGroupId: (id) => set({ groupId: id }),

      clearUser: () =>
        set({
          uid: null,
          displayName: '',
          photoURL: null,
          email: '',
          isGuest: false,
          groupId: null,
        }),
    }),
    {
      name: 'tapasya_user',
      partialize: (state) => ({
        theme: state.theme,
        bgImageUrl: state.bgImageUrl,
        dailyGoalSeconds: state.dailyGoalSeconds,
        groupId: state.groupId,
      }),
    }
  )
)

// BUG 2 FIX: Named export added so both `import useUserStore` and
// `import { useUserStore }` work across the codebase
export { useUserStore }
export default useUserStore