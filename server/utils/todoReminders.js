// server/utils/todoReminders.js
//
// "Ye todo karna hai" push — jab kisi todo ka startTime aata hai (jaise 12:00),
// user ke phone/home screen pe notification bhejta hai, app band ho tab bhi.
//
// Kaise chalta hai:
//   - Todo mein optional startTime/endTime ("HH:mm", IST) hota hai.
//   - Ek external pinger (cron-job.org, har 1 minute) GET/POST karta hai
//     /api/cron/push/todos pe (routes/push.js) -> runTodoReminders().
//   - Jin todos ka start time nikal chuka hai (lekin 30 min se zyada purana nahi),
//     jo done nahi hain aur jinka reminder pehle nahi gaya, un sab ke liye
//     user ke saare PushSubscription pe Web Push jaata hai.
//
// Vercel Hobby ke built-in crons din mein sirf ek baar chalte hain, isliye
// exact-time reminder ke liye external per-minute pinger zaroori hai (vercel.json
// mein ye nahi ho sakta).
//
// Time rules (client/src/utils/todoTime.js ka mirror):
//   - startTime/endTime IST wall-clock hote hain, server ka timezone kuch bhi ho.
//   - Study day 03:00 se next 03:00 tak chalta hai (utils/dayBoundary.js), isliye
//     todo.date = D aur time 00:00-02:59 ho to wo asal mein D+1 calendar din ka hai.

import Todo from '../models/Todo.js'
import PushSubscription from '../models/PushSubscription.js'
import { sendPush } from './webpush.js'
import { getStudyDayString, addDays, DAY_START_HOUR } from './dayBoundary.js'

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000
const DAY_MS        = 24 * 60 * 60 * 1000
// Pinger down/late ho to bhi itni der tak reminder bhej denge; usse purana
// ho chuka to "ab karo" kehna galat hoga, isliye skip.
const GRACE_MS      = 30 * 60 * 1000

const CLOCK_RE = /^([01]\d|2[0-3]):([0-5]\d)$/

// Study day `dateStr` ("YYYY-MM-DD") ke "HH:mm" (IST) ka asli instant (ms).
export function getTodoInstantMs(dateStr, clock) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr || '')) return null
  const match = CLOCK_RE.exec(clock || '')
  if (!match) return null
  const [y, m, d] = dateStr.split('-').map(Number)
  const h   = Number(match[1])
  const min = Number(match[2])
  const dayOffset = h < DAY_START_HOUR ? 1 : 0
  return Date.UTC(y, m - 1, d + dayOffset, h, min) - IST_OFFSET_MS
}

function fmt12(clock) {
  const match = CLOCK_RE.exec(clock || '')
  if (!match) return ''
  const h = Number(match[1])
  return `${h % 12 || 12}:${match[2]} ${h >= 12 ? 'PM' : 'AM'}`
}

function buildPayload(todo) {
  const text = (todo.text || '').trim()
  const short = text.length > 120 ? `${text.slice(0, 117)}...` : text
  const window = todo.endTime
    ? `${fmt12(todo.startTime)} – ${fmt12(todo.endTime)}`
    : fmt12(todo.startTime)
  return {
    title: '⏰ Todo ka time ho gaya',
    body: `Ye todo karna hai: ${short} (${window})`,
    url: '/todo',
    // Client-side fallback notification (app khula ho) bhi yahi tag use karti hai,
    // isliye dono aane par ek hi notification dikhti hai, do nahi.
    tag: `todo-${todo._id}`,
  }
}

export async function runTodoReminders(now = new Date()) {
  const nowMs = now.getTime()
  const today = getStudyDayString(now)

  // Aaj ka study day + kal ka (00:00-02:59 wale slots ke liye, jo 03:00 ke baad
  // bhi grace window mein ho sakte hain).
  const candidates = await Todo.find({
    date: { $in: [addDays(today, -1), today] },
    done: false,
    remindedAt: null,
    startTime: { $type: 'string', $ne: '' },
  }).lean()

  // Sirf wahi jinka start nikal chuka hai aur stale nahi hain.
  const due = []
  for (const todo of candidates) {
    const start = getTodoInstantMs(todo.date, todo.startTime)
    if (start == null || nowMs < start || nowMs - start > GRACE_MS) continue

    let end = todo.endTime ? getTodoInstantMs(todo.date, todo.endTime) : null
    if (end != null && end <= start) end += DAY_MS
    if (end != null && nowMs >= end) continue // time limit already khatam

    due.push(todo)
  }
  if (!due.length) return { checked: candidates.length, due: 0, sent: 0 }

  const userIds = [...new Set(due.map((t) => String(t.userId)))]
  const subs = await PushSubscription.find({ userId: { $in: userIds } })
  const subsByUser = new Map()
  for (const sub of subs) {
    const key = String(sub.userId)
    if (!subsByUser.has(key)) subsByUser.set(key, [])
    subsByUser.get(key).push(sub)
  }

  let sent = 0
  for (const todo of due) {
    const userSubs = subsByUser.get(String(todo.userId)) || []
    if (!userSubs.length) continue // push subscribe nahi kiya — marker mat lagao

    // Atomic claim: do pings overlap ho jayein to bhi ek hi baar bhejna.
    const claimed = await Todo.findOneAndUpdate(
      { _id: todo._id, done: false, remindedAt: null },
      { $set: { remindedAt: now } },
    )
    if (!claimed) continue

    const payload = buildPayload(todo)
    let delivered = 0
    for (const sub of userSubs) {
      try {
        await sendPush(sub, payload)
        delivered++
      } catch (e) {
        if (e.statusCode === 404 || e.statusCode === 410) await PushSubscription.deleteOne({ _id: sub._id })
      }
    }

    if (delivered > 0) sent++
    else await Todo.updateOne({ _id: todo._id }, { $set: { remindedAt: null } }) // kahin nahi pahuncha — agle ping pe dobara try
  }

  return { checked: candidates.length, due: due.length, sent }
}