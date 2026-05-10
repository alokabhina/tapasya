import { getDateString } from './time'

// Saare badge definitions — id, name, description, condition check fn
export const BADGE_DEFINITIONS = [
  {
    id: 'first_session',
    name: 'पहला कदम',
    description: 'Pehli study session complete ki',
    icon: '🎯',
    check: (sessions) => sessions.length >= 1,
  },
  {
    id: 'five_hours_day',
    name: 'Panchsheel',
    description: 'Ek din mein 5+ hours padha',
    icon: '⚡',
    check: (sessions) => {
      const byDay = {}
      sessions.forEach((s) => {
        byDay[s.date] = (byDay[s.date] || 0) + s.duration
      })
      return Object.values(byDay).some((sec) => sec >= 5 * 3600)
    },
  },
  {
    id: 'eight_hours_day',
    name: 'Tapasvi',
    description: 'Ek din mein 8+ hours padha',
    icon: '🔥',
    check: (sessions) => {
      const byDay = {}
      sessions.forEach((s) => {
        byDay[s.date] = (byDay[s.date] || 0) + s.duration
      })
      return Object.values(byDay).some((sec) => sec >= 8 * 3600)
    },
  },
  {
    id: 'seven_day_streak',
    name: 'Saptah Yoddha',
    description: '7 consecutive days study kiya',
    icon: '📅',
    check: (sessions, userStats) => (userStats?.streak || 0) >= 7,
  },
  {
    id: 'thirty_day_streak',
    name: 'Maas Maharathi',
    description: '30 consecutive days study kiya',
    icon: '🏆',
    check: (sessions, userStats) => (userStats?.streak || 0) >= 30,
  },
  {
    id: 'hundred_hours',
    name: 'Shataka',
    description: 'Total 100 hours study complete',
    icon: '💯',
    check: (sessions) => {
      const total = sessions.reduce((sum, s) => sum + s.duration, 0)
      return total >= 100 * 3600
    },
  },
  {
    id: 'five_hundred_hours',
    name: 'Panch Shataka',
    description: 'Total 500 hours study complete',
    icon: '⭐',
    check: (sessions) => {
      const total = sessions.reduce((sum, s) => sum + s.duration, 0)
      return total >= 500 * 3600
    },
  },
  {
    id: 'midnight_warrior',
    name: 'Ratri Yoddha',
    description: 'Midnight ke baad bhi padha (12AM - 2AM)',
    icon: '🌙',
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
    description: '4AM se pehle study shuru kiya',
    icon: '🌅',
    check: (sessions) =>
      sessions.some((s) => {
        const start = new Date(s.startTime?.toDate?.() || s.startTime)
        return start.getHours() < 4
      }),
  },
  {
    id: 'five_subjects',
    name: 'Panchamrit',
    description: '5 alag subjects mein session kiya',
    icon: '📚',
    check: (sessions) => {
      const ids = new Set(sessions.map((s) => s.subjectId))
      return ids.size >= 5
    },
  },
]

// Naye earned badges check karo — already unlocked wale exclude karo
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