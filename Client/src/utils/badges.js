import { getDateString, getStudyDayString } from './time'

// Saare badge definitions — id, name, description, category, condition check fn
// NOTE: ye IDs BadgeGrid.jsx / BadgeCard.jsx ke ALL_BADGES se exactly match
// hone chahiye, warna unlock DB mein save hone ke baad bhi UI mein "locked"
// hi dikhta rahega (pehle yehi bug tha — IDs mismatch the).
export const BADGE_DEFINITIONS = [
  {
    id: 'first_session',
    name: 'पहला कदम',
    description: 'Pehli study session complete ki',
    icon: '🎯',
    category: 'Milestone',
    check: (sessions) => sessions.length >= 1,
  },
  {
    id: 'five_hours_day',
    name: 'Panchsheel',
    description: 'Ek din mein 5+ hours padha',
    icon: '⚡',
    category: 'Intensity',
    check: (sessions) => {
      const byDay = {}
      sessions.forEach((s) => {
        byDay[s.date] = (byDay[s.date] || 0) + s.duration
      })
      return Object.values(byDay).some((sec) => sec >= 5 * 3600)
    },
  },
  {
    id: 'streak_7',
    name: 'Saptah Yoddha',
    description: '7 consecutive days study kiya',
    icon: '📅',
    category: 'Streak',
    // ✅ maxStreak use karta hai (current nahi) — isse agar streak kabhi bhi
    // 7+ tak pahunchi thi (chahe ab tooti hui ho), badge permanently unlock
    // rehta hai. Purane users ke liye retroactive credit ke liye zaroori.
    check: (sessions, userStats) => (userStats?.maxStreak || 0) >= 7,
  },
  {
    id: 'streak_30',
    name: 'Maas Maharathi',
    description: '30 consecutive days study kiya',
    icon: '🏆',
    category: 'Streak',
    check: (sessions, userStats) => (userStats?.maxStreak || 0) >= 30,
  },
  {
    id: 'hours_100',
    name: 'Shataka',
    description: 'Total 100 hours study complete',
    icon: '💯',
    category: 'Milestone',
    check: (sessions) => {
      const total = sessions.reduce((sum, s) => sum + s.duration, 0)
      return total >= 100 * 3600
    },
  },
  {
    id: 'midnight_session',
    name: 'Ratri Yoddha',
    description: 'Midnight ke baad bhi padha (12AM - 2AM)',
    icon: '🌙',
    category: 'Habit',
    check: (sessions) =>
      sessions.some((s) => {
        const start = new Date(s.startTime?.toDate?.() || s.startTime)
        const hour = start.getHours()
        return hour >= 0 && hour < 2
      }),
  },
  {
    id: 'early_bird',
    name: 'Brahma Muhurta',
    description: '6AM se pehle study shuru kiya',
    icon: '🌅',
    category: 'Habit',
    check: (sessions) =>
      sessions.some((s) => {
        const start = new Date(s.startTime?.toDate?.() || s.startTime)
        return start.getHours() < 6
      }),
  },
  {
    id: 'hours_500',
    name: 'Panch Shataka',
    description: 'Total 500 hours study complete',
    icon: '⭐',
    category: 'Milestone',
    check: (sessions) => {
      const total = sessions.reduce((sum, s) => sum + s.duration, 0)
      return total >= 500 * 3600
    },
  },
  {
    id: 'five_subjects',
    name: 'Panchamrit',
    description: '5 alag subjects mein session kiya',
    icon: '📚',
    category: 'Diversity',
    check: (sessions) => {
      const ids = new Set(sessions.map((s) => s.subjectId))
      return ids.size >= 5
    },
  },
  {
    id: 'perfect_week',
    name: 'Perfect Week',
    description: 'Daily goal lagataar 7 din poora kiya',
    icon: '✨',
    category: 'Streak',
    check: (sessions, userStats) => {
      const goal = userStats?.dailyGoalSeconds
      if (!goal) return false
      const byDay = {}
      sessions.forEach((s) => { byDay[s.date] = (byDay[s.date] || 0) + s.duration })
      let d = getStudyDayString()
      for (let i = 0; i < 7; i++) {
        if ((byDay[d] || 0) < goal) return false
        const [y, m, dd] = d.split('-').map(Number)
        d = getDateString(new Date(y, m - 1, dd - 1))
      }
      return true
    },
  },
  {
    id: 'hours_1000',
    name: 'Tapasya Legend',
    description: 'Total 1000 hours — rarest achievement',
    icon: '👑',
    category: 'Milestone',
    check: (sessions) => {
      const total = sessions.reduce((sum, s) => sum + s.duration, 0)
      return total >= 1000 * 3600
    },
  },
  {
    id: 'group_join',
    name: 'Together We Rise',
    description: 'Koi study group join kiya',
    icon: '🤝',
    category: 'Social',
    check: (sessions, userStats) => (userStats?.groupsJoined || 0) >= 1,
  },
  // ── NEW: Consistency category ─────────────────────────────────────────────
  {
    id: 'weekend_warrior',
    name: 'Weekend Warrior',
    description: 'Ek hi weekend (Sat + Sun) dono din padha',
    icon: '🎪',
    category: 'Consistency',
    check: (sessions) => {
      const dates = new Set(sessions.map((s) => s.date))
      for (const d of dates) {
        const dow = new Date(d).getUTCDay() // 0=Sun ... 6=Sat
        if (dow === 6) {
          const sunStr = new Date(new Date(d).getTime() + 86400000).toISOString().slice(0, 10)
          if (dates.has(sunStr)) return true
        }
      }
      return false
    },
  },
  {
    id: 'comeback_kid',
    name: 'Comeback Kid',
    description: '3+ din break ke baad wapas 3 din lagatar padha',
    icon: '💪',
    category: 'Consistency',
    check: (sessions) => {
      const dates = [...new Set(sessions.map((s) => s.date))].sort()
      for (let i = 1; i < dates.length - 2; i++) {
        const gapDays = Math.round((new Date(dates[i]) - new Date(dates[i - 1])) / 86400000)
        if (gapDays < 4) continue // kam se kam 3 poore din ka break chahiye
        const g1 = Math.round((new Date(dates[i + 1]) - new Date(dates[i])) / 86400000)
        const g2 = Math.round((new Date(dates[i + 2]) - new Date(dates[i + 1])) / 86400000)
        if (g1 === 1 && g2 === 1) return true
      }
      return false
    },
  },
]

// Naye earned badges check karo — already unlocked wale exclude karo
// alreadyUnlocked: array of badgeId strings (jo pehle se DB mein hain)
export function checkAllBadges(sessions, userStats, alreadyUnlocked = []) {
  const newBadges = []
  for (const badge of BADGE_DEFINITIONS) {
    if (alreadyUnlocked.includes(badge.id)) continue
    if (badge.check(sessions, userStats)) {
      newBadges.push(badge.id)
    }
  }
  return newBadges
}

// Badge id se definition get karo
export function getBadgeById(id) {
  return BADGE_DEFINITIONS.find((b) => b.id === id) || null
}

// ── Progress helper — Home page pe "next badge" teaser ke liye ─────────────
// Kuch numeric/measurable badges ke liye current/target return karta hai,
// taaki UI mein "X hours aur chahiye" jaisa dikha sakein.
export function getBadgeProgress(badgeId, sessions = [], userStats = {}) {
  // Agar sessions available hain (jaise Achievements page pe) to unse exact
  // nikalo; warna userStats ke aggregate totals se approximate karo (Home
  // page ke liye — poori sessions list fetch kiye bina bhi progress dikha
  // sakein).
  const totalHours = sessions.length
    ? sessions.reduce((sum, s) => sum + (s.duration || 0), 0) / 3600
    : (userStats?.totalHours || 0)
  const subjectCount = sessions.length
    ? new Set(sessions.map((s) => s.subjectId)).size
    : (userStats?.subjectCount || 0)
  const streak = userStats?.maxStreak || userStats?.streak || 0

  switch (badgeId) {
    case 'first_session':
      return { current: sessions.length ? sessions.length : (totalHours > 0 ? 1 : 0), target: 1, unit: 'session' }
    case 'hours_100':
      return { current: Math.min(totalHours, 100), target: 100, unit: 'hours' }
    case 'hours_500':
      return { current: Math.min(totalHours, 500), target: 500, unit: 'hours' }
    case 'hours_1000':
      return { current: Math.min(totalHours, 1000), target: 1000, unit: 'hours' }
    case 'streak_7':
      return { current: Math.min(streak, 7), target: 7, unit: 'day streak' }
    case 'streak_30':
      return { current: Math.min(streak, 30), target: 30, unit: 'day streak' }
    case 'five_subjects':
      return { current: Math.min(subjectCount, 5), target: 5, unit: 'subjects' }
    default:
      return null // condition-based badges (midnight/early-bird/weekend/comeback/etc) — no numeric progress
  }
}