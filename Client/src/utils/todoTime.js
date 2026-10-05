// src/utils/todoTime.js
// Todo time-limit helpers — "HH:mm" startTime/endTime on a todo (IST wall-clock),
// e.g. 12:00 → 13:00 = "12 baje se 1 baje tak".
//
// Server mirror: server/utils/todoReminders.js (getTodoInstantMs). Same rules:
//   - times are IST no matter the phone's timezone
//   - study day runs 03:00 → next 03:00, so 00:00–02:59 on a todo dated D
//     really means the NEXT calendar day (see utils/time.js DAY_START_HOUR)

import { DAY_START_HOUR } from './time'

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000
const DAY_MS        = 24 * 60 * 60 * 1000
const CLOCK_RE      = /^([01]\d|2[0-3]):([0-5]\d)$/

// Reminder is still sent/shown this long after startTime (pinger late / app reopened)
export const TODO_REMIND_GRACE_MS = 30 * 60 * 1000

export function isValidClock(clock) {
  return typeof clock === 'string' && CLOCK_RE.test(clock)
}

export function clockToMinutes(clock) {
  const m = CLOCK_RE.exec(clock || '')
  return m ? Number(m[1]) * 60 + Number(m[2]) : null
}

// end - start in minutes (negative if end is earlier than start)
export function minutesBetween(startClock, endClock) {
  const s = clockToMinutes(startClock)
  const e = clockToMinutes(endClock)
  return s == null || e == null ? null : e - s
}

// "13:05" -> "1:05 PM"
export function formatClock12(clock) {
  const m = CLOCK_RE.exec(clock || '')
  if (!m) return ''
  const h = Number(m[1])
  return `${h % 12 || 12}:${m[2]} ${h >= 12 ? 'PM' : 'AM'}`
}

// "12:00 PM – 1:00 PM" (or just the start when there's no end)
export function formatTimeWindow(todo) {
  if (!isValidClock(todo?.startTime)) return ''
  return isValidClock(todo.endTime)
    ? `${formatClock12(todo.startTime)} – ${formatClock12(todo.endTime)}`
    : formatClock12(todo.startTime)
}

function instantFor(dateStr, clock) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr || '') || !isValidClock(clock)) return null
  const [y, mo, d] = dateStr.split('-').map(Number)
  const [h, min]   = clock.split(':').map(Number)
  const dayOffset  = h < DAY_START_HOUR ? 1 : 0
  return Date.UTC(y, mo - 1, d + dayOffset, h, min) - IST_OFFSET_MS
}

export function getTodoStartMs(todo) {
  return instantFor(todo?.date, todo?.startTime)
}

export function getTodoEndMs(todo) {
  const start = getTodoStartMs(todo)
  if (start == null) return null
  let end = instantFor(todo.date, todo.endTime)
  if (end == null) return null
  if (end <= start) end += DAY_MS
  return end
}

// 'upcoming' (start nahi hua) | 'live' (time limit chal rahi hai) |
// 'overdue' (end nikal gaya aur done nahi) | null (no time limit / nothing to flag)
export function getTimeWindowState(todo, nowMs = Date.now()) {
  const start = getTodoStartMs(todo)
  if (start == null) return null
  if (nowMs < start) return 'upcoming'
  const end = getTodoEndMs(todo)
  if (end != null) return nowMs < end ? 'live' : 'overdue'
  return nowMs - start <= TODO_REMIND_GRACE_MS ? 'live' : null
}