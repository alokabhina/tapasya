import { getDateString, getLastNDays, getTimeOfDay, getNDaysFrom, getSundayWeekRange, getStudyDayString } from './time'

// Donut chart ke liye — subject wise total seconds
export function aggregateBySubject(sessions) {
  const map = {}
  sessions.forEach((s) => {
    if (!map[s.subjectId]) {
      map[s.subjectId] = { name: s.subjectName, color: s.subjectColor, value: 0 }
    }
    map[s.subjectId].value += s.duration
  })
  return Object.values(map)
}

export function aggregateByDay(sessions, days = 7) {
  return aggregateByDateList(sessions, getLastNDays(days))
}

export function aggregateByDateList(sessions, dateList) {
  const subjectMap = {}
  sessions.forEach((s) => {
    if (!subjectMap[s.subjectId]) {
      subjectMap[s.subjectId] = { name: s.subjectName, color: s.subjectColor }
    }
  })
  return dateList.map((date) => {
    const daySessions = sessions.filter((s) => s.date === date)
    const entry = { date: date.slice(5) }
    Object.entries(subjectMap).forEach(([id, sub]) => {
      const total = daySessions.filter((s) => s.subjectId === id).reduce((sum, s) => sum + s.duration, 0)
      entry[sub.name] = parseFloat((total / 3600).toFixed(2))
    })
    return entry
  })
}

export function aggregateForDay(sessions, dateStr) {
  const daySessions = sessions.filter((s) => s.date === dateStr)
  const subjectMap = {}
  daySessions.forEach((s) => {
    if (!subjectMap[s.subjectId]) {
      subjectMap[s.subjectId] = { name: s.subjectName, color: s.subjectColor, value: 0, sessions: 0 }
    }
    subjectMap[s.subjectId].value += s.duration
    subjectMap[s.subjectId].sessions++
  })
  return Object.values(subjectMap)
}

export function aggregateWeeklySunSat(sessions, refDate = new Date()) {
  const { start } = getSundayWeekRange(refDate)
  const startStr = getDateString(start)
  const dateList = getNDaysFrom(startStr, 7)
  return { dateList, data: aggregateByDateList(sessions, dateList) }
}

export function getHourlyMinutes(sessions) {
  const pattern = new Array(24).fill(0)
  sessions.forEach((s) => {
    const start = new Date(s.startTime?.toDate?.()?.toISOString() || s.startTime)
    if (isNaN(start.getTime())) return
    let remaining = s.duration
    const cur = new Date(start)
    while (remaining > 0) {
      const h = cur.getHours()
      const secsThisHour = Math.min(remaining, 3600 - cur.getMinutes() * 60 - cur.getSeconds())
      pattern[h] += secsThisHour / 60
      remaining -= secsThisHour
      cur.setTime(cur.getTime() + secsThisHour * 1000)
    }
  })
  return pattern.map(v => Math.round(v))
}

export function getHourlyPattern(sessions) {
  const mins = getHourlyMinutes(sessions)
  const max = Math.max(...mins, 1)
  return mins.map(v => parseFloat((v / max).toFixed(3)))
}

export function getCumulative(sessions) {
  const sorted = [...sessions].sort(
    (a, b) => new Date(a.startTime?.toDate?.() || a.startTime) - new Date(b.startTime?.toDate?.() || b.startTime)
  )
  let cumulative = 0
  return sorted.map((s) => {
    cumulative += s.duration / 3600
    return { date: s.date, hours: parseFloat(cumulative.toFixed(2)) }
  })
}

export function getScatterData(sessions) {
  return sessions.map((s) => ({
    x: getTimeOfDay(s.startTime?.toDate?.()?.toISOString() || s.startTime),
    y: parseFloat((s.duration / 3600).toFixed(2)),
    subject: s.subjectName,
    color: s.subjectColor,
  }))
}

export function getHeatmapData(sessions) {
  const map = {}
  sessions.forEach((s) => {
    if (!map[s.date]) map[s.date] = 0
    map[s.date] += s.duration
  })
  return map
}

export function calculateStreak(sessions) {
  if (!sessions.length) return 0
  const uniqueDates = [...new Set(sessions.map((s) => s.date))].sort().reverse()
  let streak = 0
  const today4am = getStudyDayString()
  let current = today4am

  for (const dateStr of uniqueDates) {
    if (dateStr === current) {
      streak++
      const [y, m, d] = current.split('-').map(Number)
      current = getDateString(new Date(y, m - 1, d - 1))
    } else if (dateStr < current) {
      break
    }
  }
  return streak
}

export function getUniqueSubjects(sessions) {
  const map = {}
  sessions.forEach((s) => {
    if (!map[s.subjectId]) {
      map[s.subjectId] = { id: s.subjectId, name: s.subjectName, color: s.subjectColor }
    }
  })
  return Object.values(map)
}