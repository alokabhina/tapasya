// Focus session history — persistent localStorage storage
// Each focus record: { id, date, startTime, endTime, durationSeconds, type, completed }

const FOCUS_HISTORY_KEY = 'tapasya_focus_history'
const MAX_RECORDS = 500 // keep last 500 sessions

export function loadFocusHistory() {
  try {
    const raw = localStorage.getItem(FOCUS_HISTORY_KEY)
    if (!raw) return []
    return JSON.parse(raw)
  } catch {
    return []
  }
}

export function saveFocusSession({ type, durationSeconds, completed, startTime }) {
  try {
    if (durationSeconds < 30) return // ignore very short sessions
    const history = loadFocusHistory()
    const record = {
      id: Date.now().toString(),
      date: new Date().toISOString().split('T')[0], // YYYY-MM-DD
      startTime: startTime || new Date(Date.now() - durationSeconds * 1000).toISOString(),
      endTime: new Date().toISOString(),
      durationSeconds: Math.round(durationSeconds),
      type, // 'work' | 'short' | 'long'
      completed, // true = ran to completion, false = manually stopped
    }
    history.unshift(record)
    // Trim to max
    if (history.length > MAX_RECORDS) history.splice(MAX_RECORDS)
    localStorage.setItem(FOCUS_HISTORY_KEY, JSON.stringify(history))
    return record
  } catch {
    return null
  }
}

// Filter history by date range
export function getFocusHistory(startDate, endDate) {
  const all = loadFocusHistory()
  if (!startDate && !endDate) return all
  return all.filter(r => {
    if (startDate && r.date < startDate) return false
    if (endDate && r.date > endDate) return false
    return true
  })
}

// Aggregate stats for a period
export function getFocusStats(records) {
  const workSessions = records.filter(r => r.type === 'work')
  const shortBreaks = records.filter(r => r.type === 'short')
  const longBreaks = records.filter(r => r.type === 'long')
  const completedWork = workSessions.filter(r => r.completed)

  const totalFocusSeconds = workSessions.reduce((s, r) => s + r.durationSeconds, 0)
  const totalBreakSeconds = [...shortBreaks, ...longBreaks].reduce((s, r) => s + r.durationSeconds, 0)

  // Daily breakdown for chart
  const byDay = {}
  records.forEach(r => {
    if (!byDay[r.date]) byDay[r.date] = { date: r.date, focusSeconds: 0, sessions: 0, breaks: 0 }
    if (r.type === 'work') {
      byDay[r.date].focusSeconds += r.durationSeconds
      byDay[r.date].sessions += 1
    } else {
      byDay[r.date].breaks += 1
    }
  })

  // Hourly pattern (0-23)
  const hourlyPattern = Array(24).fill(0)
  workSessions.forEach(r => {
    const hour = new Date(r.startTime).getHours()
    hourlyPattern[hour] += r.durationSeconds / 3600
  })

  return {
    totalFocusSeconds,
    totalBreakSeconds,
    totalWorkSessions: workSessions.length,
    completedSessions: completedWork.length,
    completionRate: workSessions.length > 0 ? Math.round((completedWork.length / workSessions.length) * 100) : 0,
    avgFocusMinutes: workSessions.length > 0 ? Math.round(totalFocusSeconds / workSessions.length / 60) : 0,
    byDay: Object.values(byDay).sort((a, b) => a.date.localeCompare(b.date)),
    hourlyPattern,
    shortBreaks: shortBreaks.length,
    longBreaks: longBreaks.length,
  }
}