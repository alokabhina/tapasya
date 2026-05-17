// src/utils/notifications.js
// Tone: disciplined, silent grind, aspirant life — non-cringe, emotionally real

// ── Permission ────────────────────────────────────────────────────────────────

export async function requestPermission() {
  if (!('Notification' in window)) return false
  if (Notification.permission === 'granted') return true
  const result = await Notification.requestPermission()
  return result === 'granted'
}

export function hasPermission() {
  return typeof Notification !== 'undefined' && Notification.permission === 'granted'
}

// ── Core send ─────────────────────────────────────────────────────────────────

async function sendNotification(title, options = {}) {
  if (!hasPermission()) return
  const defaults = {
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    vibrate: [80, 40, 80],
    data: { url: '/' },
  }
  if ('serviceWorker' in navigator) {
    try {
      const sw = await navigator.serviceWorker.ready
      await sw.showNotification(title, { ...defaults, ...options })
      return
    } catch (_) {}
  }
  new Notification(title, { ...defaults, ...options })
}

// ── Format helpers ─────────────────────────────────────────────────────────────

function fmtHours(seconds) {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  if (h > 0 && m > 0) return `${h}h ${m}m`
  if (h > 0) return `${h}h`
  return `${m}m`
}

// ── First name extract ────────────────────────────────────────────────────────

function firstName(name) {
  if (!name || name === 'Aspirant') return null
  return name.trim().split(/\s+/)[0]
}

// ── Message pools — 40% calm / 30% discipline / 20% relatable / 10% quote ─────

// CALM REMINDERS (40%)
const CALM = [
  'Bas ek session start karo.',
  'Phone khol liya hai to 10 minute padh bhi lo.',
  'Silent progress bhi progress hoti hai.',
  'Chota sa step bhi forward direction mein hota hai.',
  'Aaj ka ek session kal ki tension kam karega.',
  'Notifications band karo, timer start karo.',
]

// DISCIPLINE BASED (30%)
const DISCIPLINE = [
  'Mood ka wait mat karo.',
  'Aise din hi future decide karte hain.',
  'Consistency motivation se zyada important hoti hai.',
  'Routine boring lagti hai — results nahi.',
  'Jo aaj nahi padha, woh kal double ho jayega.',
  'Perfect time kabhi nahi aata. Abhi start karo.',
]

// EMOTIONAL / RELATABLE (20%)
const RELATABLE = [
  'Problems hain, fir bhi padhna hai.',
  'Exam preparation dekhega, problems nahi.',
  'Thak gaye ho, samajh aa raha hai. Phir bhi.',
  'Mushkil lag raha hai? Sab ko lagta hai. Fir bhi jo padhte hain woh aage jaate hain.',
  'Motivation nahi hai — discipline se kaam chalao aaj.',
  'Struggle real hai. Isliye jo padh rahe ho woh important bhi hai.',
]

// QUOTES (10%) — APJ, Bose, Vivekananda only
const QUOTES = [
  { text: '"Dream is not what you see in sleep,\ndream is something that does not let you sleep."', author: 'A. P. J. Abdul Kalam' },
  { text: '"Life loses half its interest if there is no struggle."', author: 'Subhas Chandra Bose' },
  { text: '"Arise, awake and stop not till the goal is reached."', author: 'Swami Vivekananda' },
  { text: '"Excellence is not a destination — it is a continuous journey."', author: 'A. P. J. Abdul Kalam' },
]

// Weighted random — 40/30/20/10 distribution
function getMotivation() {
  const r = Math.random() * 100
  if (r < 40) return getRandom(CALM)
  if (r < 70) return getRandom(DISCIPLINE)
  if (r < 90) return getRandom(RELATABLE)
  const q = getRandom(QUOTES)
  return `${q.text}\n— ${q.author}`
}

function getRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)]
}

// ── PERSONAL name-based notifications ────────────────────────────────────────
// Random pe naam le ke bulate hain — as if someone is watching

const PERSONAL_MESSAGES = [
  (n) => ({ title: `📖 ${n}, uth ja.`, body: 'Reels baad mein dekh lena.\nAbhi padho.' }),
  (n) => ({ title: `⏰ ${n}.`, body: 'Kitni baar timer start karne ka socha aaj?\nEk baar actually karo.' }),
  (n) => ({ title: `${n}, phone rakh.`, body: 'Ye notification dekh raha hai matlab phone haath mein hai.\nTimer start karo.' }),
  (n) => ({ title: `📖 ${n}, serious ho jao.`, body: 'Social media wale exam nahi denge tumhare liye.' }),
  (n) => ({ title: `${n} — ek kaam karo.`, body: 'Sirf 25 minute. Timer lagao. Baad mein sab karte rehna.' }),
  (n) => ({ title: `⏰ ${n}, abhi.`, body: 'Baad mein padhunga — yeh sentence future destroy karta hai.' }),
  (n) => ({ title: `${n}, kitna bacha hai?`, body: 'Syllabus wait nahi karta.\nAaj ka session start karo.' }),
  (n) => ({ title: `📖 ${n}.`, body: 'Jo aaj nahi padha, woh kal double ho jayega.\nShuru karo.' }),
  (n) => ({ title: `${n}, screen time check karo.`, body: 'Aur padhai ka time?\nBalance banao.' }),
  (n) => ({ title: `⏰ ${n} — focus time.`, body: 'Distractions baad mein. Pehle ek session complete karo.' }),
]

// Generic (jab naam na ho)
const GENERIC_PERSONAL = [
  { title: '📖 Uth ja.', body: 'Reels baad mein dekh lena.\nAbhi padho.' },
  { title: '⏰ Phone rakh.', body: 'Ye notification dekh raha hai matlab phone haath mein hai.\nTimer start karo.' },
  { title: '📖 Serious ho jao.', body: 'Social media wale exam nahi denge tumhare liye.' },
  { title: 'Ek kaam karo.', body: 'Sirf 25 minute. Timer lagao. Baad mein sab karte rehna.' },
  { title: '⏰ Abhi.', body: 'Baad mein padhunga — yeh sentence future destroy karta hai.' },
]

export async function sendPersonalNudge(displayName) {
  if (!hasPermission()) return
  const fn = firstName(displayName)
  let msg
  if (fn) {
    msg = getRandom(PERSONAL_MESSAGES)(fn)
  } else {
    msg = getRandom(GENERIC_PERSONAL)
  }
  await sendNotification(msg.title, {
    body: msg.body,
    tag: 'personal-nudge',
    renotify: true,
    silent: false,
    data: { url: '/' },
  })
}

// ── 1. Goal milestones ────────────────────────────────────────────────────────

const _sentMilestones = new Set()

export async function checkGoalMilestone(todaySeconds, goalSeconds, displayName) {
  if (!hasPermission() || goalSeconds <= 0) return

  const pct   = (todaySeconds / goalSeconds) * 100
  const today = new Date().toDateString()
  const key   = (m) => `${today}_${m}`
  const fn    = firstName(displayName)
  const you   = fn ? `${fn}, ` : ''

  if (pct >= 100 && !_sentMilestones.has(key(100))) {
    _sentMilestones.add(key(100))
    await sendNotification('✅ Daily Goal Complete.', {
      body: `${you}${fmtHours(goalSeconds)} ho gaye.\nAise hi ordinary days extraordinary results banate hain.`,
      tag: 'goal-100', renotify: true, data: { url: '/' },
    })
  } else if (pct >= 75 && !_sentMilestones.has(key(75))) {
    _sentMilestones.add(key(75))
    const rem = fmtHours(goalSeconds - todaySeconds)
    await sendNotification('🎯 Almost There.', {
      body: `${you}sirf ${rem} aur bacha.\nAaj ka future version thanks bolega agar abhi 1 aur session kar liya.`,
      tag: 'goal-75', renotify: true, data: { url: '/' },
    })
  } else if (pct >= 50 && !_sentMilestones.has(key(50))) {
    _sentMilestones.add(key(50))
    await sendNotification('📊 Halfway Done.', {
      body: `Ab rukne ka mann karega.\nIsi point ke baad real discipline start hota hai.`,
      tag: 'goal-50', renotify: true, data: { url: '/' },
    })
  } else if (pct >= 25 && !_sentMilestones.has(key(25))) {
    _sentMilestones.add(key(25))
    await sendNotification('✅ Good Start.', {
      body: `Sabse mushkil part hota hai shuru karna.\n${you}woh kar chuke ho.`,
      tag: 'goal-25', renotify: true, data: { url: '/' },
    })
  }
}

// ── 2. Hourly progress ────────────────────────────────────────────────────────

export async function sendHourlyProgress(todaySeconds, goalSeconds, streakDays, displayName) {
  if (!hasPermission() || goalSeconds <= 0) return

  const pct  = Math.min(Math.round((todaySeconds / goalSeconds) * 100), 100)
  const fn   = firstName(displayName)
  const name = fn ? `${fn} — ` : ''

  let title, body

  if (pct >= 100) {
    title = '✅ Goal Complete.'
    body  = `${fmtHours(goalSeconds)} ho gaye aaj.\nAise hi boring consistency kaam karti hai.`
  } else if (todaySeconds === 0) {
    title = `⏰ ${name}Tapasya Check-in`
    body  = `Aaj ka target sach mein important hai\nya distractions?`
  } else {
    const rem = fmtHours(goalSeconds - todaySeconds)
    title = `📊 ${name}Progress Update`
    body  = `${fmtHours(todaySeconds)} done (${pct}%) · ${rem} baaki${streakDays > 1 ? `\n${streakDays} din se consistent ho. Mat todno.` : ''}`
  }

  await sendNotification(title, {
    body,
    tag: 'hourly-progress',
    renotify: true,
    data: { url: '/' },
    actions: [{ action: 'open', title: '📖 Start Session' }],
  })
}

// ── 3. Todo reminder ──────────────────────────────────────────────────────────

export async function sendTodoReminder(pendingTodos, displayName) {
  if (!hasPermission() || pendingTodos.length === 0) return

  const count = pendingTodos.length
  const first = pendingTodos[0]?.text || 'Pehla task'
  const fn    = firstName(displayName)
  const name  = fn ? `${fn}, ` : ''

  await sendNotification(`📋 ${name}${count} task${count > 1 ? 's' : ''} pending.`, {
    body: `"${first}"${count > 1 ? ` aur ${count - 1} tasks` : ''} baaki hai.\nTum tired ho sakte ho — lekin future still effort expect karta hai.`,
    tag: 'todo-reminder',
    renotify: true,
    data: { url: '/todo' },
    actions: [{ action: 'open', title: '✅ Dekho' }],
  })
}

// ── 4. Morning ────────────────────────────────────────────────────────────────

export async function sendMorningMotivation(goalSeconds, streakDays, displayName) {
  if (!hasPermission()) return

  const fn     = firstName(displayName)
  const name   = fn ? `${fn}. ` : ''
  const streak = streakDays > 1 ? `\n${streakDays} din se chal raha hai — mat torno.` : ''

  const msgs = [
    {
      title: `🌙 Good Morning. ${name}`,
      body:  `Kal jo nahi ho paya, usko lekar guilt mat lo.\nAaj ka din abhi bhi tumhare control mein hai.${streak}`,
    },
    {
      title: '📖 New Day. New Chance.',
      body:  `Har successful aspirant ka secret:\nboring consistency.${streak}`,
    },
    {
      title: `⏰ ${name}Aaj ka target: ${fmtHours(goalSeconds)}.`,
      body:  `Perfect mood ka wait mat karo.\nBas timer start karo.${streak}`,
    },
  ]

  const msg = getRandom(msgs)
  await sendNotification(msg.title, {
    body: msg.body,
    tag: 'morning-motivation',
    renotify: false,
    data: { url: '/' },
  })
}

// ── 5. Evening ────────────────────────────────────────────────────────────────

export async function sendEveningReminder(todaySeconds, goalSeconds, displayName) {
  if (!hasPermission() || goalSeconds <= 0) return
  if (todaySeconds >= goalSeconds) return

  const fn   = firstName(displayName)
  const name = fn ? `${fn}, ` : ''
  const done = fmtHours(todaySeconds)
  const rem  = fmtHours(goalSeconds - todaySeconds)
  const pct  = Math.round((todaySeconds / goalSeconds) * 100)

  const msgs = [
    {
      title: '🌙 Din almost khatam.',
      body:  `${name}${done} hua (${pct}%).\nAaj poora nahi hua to bhi theek hai.\nLekin bina try kiye mat sona.`,
    },
    {
      title: '📖 Final Push.',
      body:  `${rem} baaki hai.\nKabhi kabhi sirf 30 focused minutes\npoore din ka regret bachaa dete hain.`,
    },
    {
      title: `🌙 ${name}${rem} aur.`,
      body:  `Sirf itna bacha hai.\nSone se pehle complete kar lo.`,
    },
  ]

  const msg = getRandom(msgs)
  await sendNotification(msg.title, {
    body: msg.body,
    tag: 'evening-reminder',
    renotify: true,
    data: { url: '/' },
    actions: [{ action: 'open', title: '📖 Start' }],
  })
}

// ── 6. Break reminder ─────────────────────────────────────────────────────────

export function scheduleBreakReminder(afterMinutes = 60) {
  if (!hasPermission()) return
  setTimeout(async () => {
    await sendNotification('🧘 Break Time.', {
      body: 'Paani piyo. Stretch karo.\nMachine nahi ho — sustainable rehna bhi important hai.',
      tag: 'break-reminder',
      data: { url: '/' },
    })
  }, afterMinutes * 60 * 1000)
}

// ── 7. Random personal nudge scheduler ───────────────────────────────────────
// Din mein 2–4 baar random time pe naam le ke bulata hai

let _nudgeTimers = []

export function schedulePersonalNudges(displayName) {
  if (!hasPermission()) return
  _nudgeTimers.forEach(clearTimeout)
  _nudgeTimers = []

  // Random times between 9am–10pm today
  const now = new Date()
  const nudgeTimes = generateNudgeTimes(now, 3) // 3 nudges per day

  nudgeTimes.forEach((ms) => {
    if (ms > 0) {
      _nudgeTimers.push(setTimeout(() => sendPersonalNudge(displayName), ms))
    }
  })
}

function generateNudgeTimes(now, count) {
  const times = []
  // Spread across 10am, 2pm, 6pm ± 30min random offset
  const slots = [10, 14, 18, 20].slice(0, count)
  for (const hour of slots) {
    const target = new Date(now)
    target.setHours(hour, Math.floor(Math.random() * 60), 0, 0)
    const ms = target.getTime() - now.getTime()
    if (ms > 2 * 60 * 1000) times.push(ms) // sirf future times
  }
  return times
}

// ── 8. Clear + Reset ──────────────────────────────────────────────────────────

export async function clearAllNotifications() {
  if (!('serviceWorker' in navigator)) return
  try {
    const sw = await navigator.serviceWorker.ready
    const notifs = await sw.getNotifications()
    notifs.forEach((n) => n.close())
  } catch (_) {}
}

export function resetMilestones() {
  _sentMilestones.clear()
}

// Legacy compat
export function showTimerNotification() {}
export function showLiveTimerNotification() {}