// server/utils/dayBoundary.js
//
// Server-side mirror of client/src/utils/time.js's getStudyDayString() —
// a "day" here runs DAY_START_HOUR (3am) to DAY_START_HOUR, not midnight
// to midnight, same as the client.
//
// Why this needs its own file instead of just copying the client's
// `< 3 ? yesterday : today` check: that check uses the JS Date object's
// LOCAL hour — which on the client is the user's phone (India), but on
// the server is whatever timezone the host machine/container is set to.
// Most hosts (Render/Railway/Fly/Heroku, etc.) default to UTC. IST is
// UTC+5:30, so a server doing `new Date().getHours()` at, say, 1:00 AM
// IST would see 19:30 (7:30 PM) the *previous* day in UTC — nowhere near
// its "< 3" cutoff — and would compute a completely different "today"
// than the client did. That mismatch is exactly why the same session/
// task could show up under different dates depending on whether the
// date was stamped by the client or the server.
//
// Fix: always compute the IST wall-clock time explicitly via Intl,
// regardless of what timezone the server process itself is running in.

const DAY_START_HOUR = 3
const TIME_ZONE = 'Asia/Kolkata'
const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000 // India has no DST, fixed UTC+5:30 year-round

// { year, month, day, hour } as seen in Asia/Kolkata right now, no matter
// what timezone this Node process itself is running in.
function getISTParts(date = new Date()) {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: TIME_ZONE,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', hour12: false,
  })
  const parts = Object.fromEntries(fmt.formatToParts(date).map((p) => [p.type, p.value]))
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    // Intl's 24h format can report midnight as "24" instead of "00" in some
    // Node/ICU builds — normalize that.
    hour: Number(parts.hour) === 24 ? 0 : Number(parts.hour),
  }
}

// "YYYY-MM-DD" for the logical study day `date` belongs to — 3am IST cutoff.
function getStudyDayString(date = new Date()) {
  const { year, month, day, hour } = getISTParts(date)
  const d = new Date(Date.UTC(year, month - 1, day))
  if (hour < DAY_START_HOUR) d.setUTCDate(d.getUTCDate() - 1)
  const y = d.getUTCFullYear()
  const m = String(d.getUTCMonth() + 1).padStart(2, '0')
  const dd = String(d.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${dd}`
}

// { start, end } — real Date/instant objects for a study day's window
// (that day's 3am IST to next day's 3am IST), useful for
// `createdAt: { $gte: start, $lt: end }` style Mongo queries.
function getStudyDayWindow(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number)
  const start = new Date(Date.UTC(y, m - 1, d, DAY_START_HOUR, 0, 0) - IST_OFFSET_MS)
  const end   = new Date(Date.UTC(y, m - 1, d + 1, DAY_START_HOUR, 0, 0) - IST_OFFSET_MS)
  return { start, end }
}

// Pure calendar-date-string arithmetic — "YYYY-MM-DD" + N days → "YYYY-MM-DD".
// Anchored in UTC internally purely as a neutral calculation space (no
// timezone meaning attached), so this is safe to use regardless of what
// timezone the server process itself is running in.
function addDays(dateStr, delta) {
  const [y, m, d] = dateStr.split('-').map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d + delta))
  return dt.toISOString().slice(0, 10)
}

export { getStudyDayString, getStudyDayWindow, addDays, DAY_START_HOUR, TIME_ZONE }