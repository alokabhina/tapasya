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
  const dateSet = new Set(sessions.map((s) => s.date))
  const today = getStudyDayString()
  const [ty, tm, td] = today.split('-').map(Number)
  const yesterday = getDateString(new Date(ty, tm - 1, td - 1))

  // ✅ FIX: pehle yaha hamesha "today" se count start hota tha — agar user ne
  // aaj abhi tak session start nahi ki (lekin kal tak lagatar padha tha), to
  // pehla hi comparison fail hoke streak turant 0 dikha deta tha. Ab agar aaj
  // ka session nahi hai to bhi "yesterday" se streak zinda maana jata hai
  // (aaj ka din abhi khatam nahi hua), aur sirf tabhi 0 hota hai jab kal bhi
  // koi session na ho.
  let current
  if (dateSet.has(today)) {
    current = today
  } else if (dateSet.has(yesterday)) {
    current = yesterday
  } else {
    return 0
  }

  let streak = 0
  while (dateSet.has(current)) {
    streak++
    const [y, m, d] = current.split('-').map(Number)
    current = getDateString(new Date(y, m - 1, d - 1))
  }
  return streak
}

// Sabse lambi streak jo user ne KABHI BHI achieve ki thi (chahe ab tooti ho).
// Streak-badges (streak_7/streak_30) isi se check hote hain — taaki agar
// kabhi 10-din ki streak thi jo baad mein toot gayi, to badge phir bhi
// permanently unlocked rahe (current streak jaisa "abhi 7+ hai" nahi).
export function calculateMaxStreak(sessions) {
  if (!sessions.length) return 0
  const dates = [...new Set(sessions.map((s) => s.date))].sort()
  let max = 1
  let current = 1
  for (let i = 1; i < dates.length; i++) {
    const gapDays = Math.round((new Date(dates[i]) - new Date(dates[i - 1])) / 86400000)
    current = gapDays === 1 ? current + 1 : 1
    if (current > max) max = current
  }
  return max
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