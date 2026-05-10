import { getDateString, getLastNDays, getTimeOfDay } from './time'

// Donut chart ke liye — subject wise total seconds
export function aggregateBySubject(sessions) {
  const map = {}
  sessions.forEach((s) => {
    if (!map[s.subjectId]) {
      map[s.subjectId] = {
        name: s.subjectName,
        color: s.subjectColor,
        value: 0,
      }
    }
    map[s.subjectId].value += s.duration
  })
  return Object.values(map)
}

// Stacked bar chart ke liye — last N days, each day mein subjects ka breakdown
export function aggregateByDay(sessions, days = 7) {
  const dateList = getLastNDays(days)

  // Saare unique subjects nikalo
  const subjectMap = {}
  sessions.forEach((s) => {
    if (!subjectMap[s.subjectId]) {
      subjectMap[s.subjectId] = { name: s.subjectName, color: s.subjectColor }
    }
  })

  // Har din ke liye data object banao
  return dateList.map((date) => {
    const daySessions = sessions.filter((s) => s.date === date)
    const entry = { date: date.slice(5) } // "MM-DD" format for display

    // Har subject ka seconds add karo
    Object.entries(subjectMap).forEach(([id, sub]) => {
      const total = daySessions
        .filter((s) => s.subjectId === id)
        .reduce((sum, s) => sum + s.duration, 0)
      entry[sub.name] = parseFloat((total / 3600).toFixed(2))
    })

    return entry
  })
}

// Step chart ke liye — cumulative hours over time
export function getCumulative(sessions) {
  const sorted = [...sessions].sort(
    (a, b) => new Date(a.startTime?.toDate?.() || a.startTime) - new Date(b.startTime?.toDate?.() || b.startTime)
  )
  let cumulative = 0
  return sorted.map((s) => {
    cumulative += s.duration / 3600
    return {
      date: s.date,
      hours: parseFloat(cumulative.toFixed(2)),
    }
  })
}

// Scatter chart ke liye — time of day vs duration
export function getScatterData(sessions) {
  return sessions.map((s) => ({
    x: getTimeOfDay(s.startTime?.toDate?.()?.toISOString() || s.startTime),
    y: parseFloat((s.duration / 3600).toFixed(2)),
    subject: s.subjectName,
    color: s.subjectColor,
  }))
}

// Heatmap ke liye — date → total seconds map
export function getHeatmapData(sessions) {
  const map = {}
  sessions.forEach((s) => {
    if (!map[s.date]) map[s.date] = 0
    map[s.date] += s.duration
  })
  return map // { "2024-01-15": 7200, ... }
}

// Streak calculate karo
export function calculateStreak(sessions) {
  if (!sessions.length) return 0
  const uniqueDates = [...new Set(sessions.map((s) => s.date))].sort().reverse()
  let streak = 0
  let current = new Date()
  current.setHours(0, 0, 0, 0)

  for (const dateStr of uniqueDates) {
    const d = new Date(dateStr)
    const diff = Math.round((current - d) / (1000 * 60 * 60 * 24))
    if (diff === 0 || diff === 1) {
      streak++
      current = d
    } else {
      break
    }
  }
  return streak
}

// Unique subjects array nikalo sessions se
export function getUniqueSubjects(sessions) {
  const map = {}
  sessions.forEach((s) => {
    if (!map[s.subjectId]) {
      map[s.subjectId] = { id: s.subjectId, name: s.subjectName, color: s.subjectColor }
    }
  })
  return Object.values(map)
}