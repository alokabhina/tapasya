// Seconds ko HH:MM:SS format mein convert karo
export function formatDuration(seconds) {
  const s = Math.floor(seconds)
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  return [h, m, sec].map((v) => String(v).padStart(2, '0')).join(':')
}

// Seconds ko "2.5h" format mein convert karo
export function formatHours(seconds) {
  const h = seconds / 3600
  return h % 1 === 0 ? `${h}h` : `${h.toFixed(1)}h`
}

// Seconds ko "1h 30m" format mein convert karo (Stats display ke liye)
export function formatHumanDuration(seconds) {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  if (h === 0) return `${m}m`
  if (m === 0) return `${h}h`
  return `${h}h ${m}m`
}

// Date object ko "YYYY-MM-DD" string mein convert karo
export function getDateString(date) {
  const d = new Date(date)
  const y = d.getFullYear()
  const mo = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${mo}-${day}`
}

// Aaj ki date "YYYY-MM-DD" string mein
export function getTodayString() {
  return getDateString(new Date())
}

// Kal ki date "YYYY-MM-DD" string mein (streak check ke liye)
export function getYesterdayString() {
  const d = new Date()
  d.setDate(d.getDate() - 1)
  return getDateString(d)
}

// "YYYY-MM-DD" se Date object banao
export function parseDateString(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y, m - 1, d)
}

// Week ki start date get karo (Monday)
export function getWeekStart(date = new Date()) {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  d.setDate(diff)
  d.setHours(0, 0, 0, 0)
  return d
}

// Month ki start date
export function getMonthStart(date = new Date()) {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

// Last N days ki date strings array banao (stats ke liye)
export function getLastNDays(n) {
  const days = []
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    days.push(getDateString(d))
  }
  return days
}

// Session jo midnight cross kare use 2 sessions mein split karo
export function midnightSplit(startTimeISO, endTimeISO) {
  const start = new Date(startTimeISO)
  const end = new Date(endTimeISO)

  // Same day hai — split ki zaroorat nahi
  if (getDateString(start) === getDateString(end)) {
    return [{ startTime: startTimeISO, endTime: endTimeISO, date: getDateString(start) }]
  }

  // Midnight point banao
  const midnight = new Date(start)
  midnight.setDate(midnight.getDate() + 1)
  midnight.setHours(0, 0, 0, 0)

  return [
    {
      startTime: startTimeISO,
      endTime: midnight.toISOString(),
      date: getDateString(start),
    },
    {
      startTime: midnight.toISOString(),
      endTime: endTimeISO,
      date: getDateString(end),
    },
  ]
}

// Timestamp se HH:MM format (scatter chart ke liye)
export function getTimeOfDay(isoString) {
  const d = new Date(isoString)
  return d.getHours() + d.getMinutes() / 60
}