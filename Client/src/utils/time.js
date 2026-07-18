// Seconds ko HH:MM:SS format mein convert karo
export function formatDuration(seconds) {
  const s = Math.floor(seconds)
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  return [h, m, sec].map((v) => String(v).padStart(2, '0')).join(':')
}

// Seconds ko readable format mein convert karo: 6m, 1h, 1h 30m
// (replaces old "0.1h" style — ab human-readable hai)
export function formatHours(seconds) {
  const s = Math.floor(seconds || 0)
  if (s <= 0) return '0m'
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  if (s < 60) return `${s}s`
  if (h === 0) return `${m}m`
  if (m === 0) return `${h}h`
  return `${h}h ${m}m`
}

// Alias — same as formatHours now (kept for backward compat)
export function formatHumanDuration(seconds) {
  return formatHours(seconds)
}

// Date object ko "YYYY-MM-DD" string mein convert karo
export function getDateString(date) {
  const d = new Date(date)
  const y = d.getFullYear()
  const mo = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${mo}-${day}`
}

// Aaj ki date "YYYY-MM-DD" string mein — literal calendar midnight boundary.
// Use this ONLY for genuine calendar-date things (exam countdowns, "days
// since account created", etc). For "which day does this session/task/
// transaction belong to", use getStudyDayString() instead — that's the
// one that matches how the rest of the app buckets a day.
export function getTodayString() {
  return getDateString(new Date())
}

// ── Logical "study day" boundary ─────────────────────────────────────────────
// A day here doesn't reset at midnight — it resets at DAY_START_HOUR
// (3am), so a 1am study session still counts as "yesterday". This is the
// ONE place that cutoff is defined — every place in the app that needs
// "which day does this moment belong to" should call getStudyDayString()
// / getStudyDayWindow() below instead of reimplementing the < DAY_START_HOUR
// check locally. (It used to be reimplemented in 4+ different places, at
// 2 different cutoff hours, which is exactly the kind of drift that made
// Home/Wellbeing/Stats disagree with each other about "today".)
export const DAY_START_HOUR = 3

// "YYYY-MM-DD" for the logical study day `now` belongs to
export function getStudyDayString(now = new Date()) {
  const d = new Date(now)
  if (d.getHours() < DAY_START_HOUR) {
    d.setDate(d.getDate() - 1)
  }
  return getDateString(d)
}

// { start, end } Date objects for a given study-day's window
// (that day's DAY_START_HOUR to next day's DAY_START_HOUR)
export function getStudyDayWindow(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number)
  const start = new Date(y, m - 1, d, DAY_START_HOUR, 0, 0, 0)
  const end   = new Date(y, m - 1, d + 1, DAY_START_HOUR, 0, 0, 0)
  return { start, end }
}

// Deprecated aliases — old name/hour, kept only so any import we missed
// during the 4am→3am migration doesn't crash. New code should use
// getStudyDayString()/getStudyDayWindow() above.
export const get4amDayString = getStudyDayString
export const get4amWindowForDate = getStudyDayWindow

// Study-day se pehle wali date "YYYY-MM-DD" string mein (streak check,
// "Yesterday" labels ke liye). Deliberately relative to getStudyDayString()
// and not literal calendar-now — otherwise between midnight-3am this and
// getStudyDayString() would land on the same date (today's "yesterday"
// would equal today itself).
export function getYesterdayString() {
  const d = parseDateString(getStudyDayString())
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

// Sunday-to-Saturday week containing a given date
export function getSundayWeekRange(date = new Date()) {
  const d = new Date(date)
  const day = d.getDay() // 0=Sun
  const sunday = new Date(d)
  sunday.setDate(d.getDate() - day)
  sunday.setHours(0, 0, 0, 0)
  const saturday = new Date(sunday)
  saturday.setDate(sunday.getDate() + 6)
  saturday.setHours(23, 59, 59, 999)
  return { start: sunday, end: saturday }
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

// N days starting from a given date
export function getNDaysFrom(startDateStr, n) {
  const days = []
  const [y, m, d] = startDateStr.split('-').map(Number)
  for (let i = 0; i < n; i++) {
    const dt = new Date(y, m - 1, d + i)
    days.push(getDateString(dt))
  }
  return days
}

// Session jo study-day boundary (DAY_START_HOUR, i.e. 3am) cross kare use
// 2 sessions mein split karo — same rule as getStudyDayString(), so a
// session running 11pm→2am stays whole (both ends are still "yesterday"),
// while one running 1am→5am splits at 3am into a "yesterday" chunk and a
// "today" chunk. (Used to split at literal midnight, which disagreed with
// every other "which day is this" check in the app.)
export function studyDaySplit(startTimeISO, endTimeISO) {
  const start = new Date(startTimeISO)
  const end = new Date(endTimeISO)

  const startDay = getStudyDayString(start)
  const endDay   = getStudyDayString(end)

  // Same logical day — split ki zaroorat nahi
  if (startDay === endDay) {
    return [{ startTime: startTimeISO, endTime: endTimeISO, date: startDay }]
  }

  // First DAY_START_HOUR boundary strictly after `start`
  const boundary = new Date(start)
  boundary.setHours(DAY_START_HOUR, 0, 0, 0)
  if (boundary <= start) boundary.setDate(boundary.getDate() + 1)

  return [
    { startTime: startTimeISO, endTime: boundary.toISOString(), date: startDay },
    { startTime: boundary.toISOString(), endTime: endTimeISO, date: endDay },
  ]
}

// Deprecated alias — old name, kept so nothing crashes if we missed an import
export const midnightSplit = studyDaySplit

// Timestamp se HH:MM format (scatter chart ke liye)
export function getTimeOfDay(isoString) {
  const d = new Date(isoString)
  return d.getHours() + d.getMinutes() / 60
}