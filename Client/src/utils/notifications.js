// src/utils/notifications.js
// Smart push notifications — daily goal tracking, motivation, todo reminders

// ── Permission ───────────────────────────────────────────────────────────────

export async function requestPermission() {
  if (!('Notification' in window)) return false
  if (Notification.permission === 'granted') return true
  const result = await Notification.requestPermission()
  return result === 'granted'
}

export function hasPermission() {
  return typeof Notification !== 'undefined' && Notification.permission === 'granted'
}

// ── Core send helper ─────────────────────────────────────────────────────────

async function sendNotification(title, options = {}) {
  if (!hasPermission()) return

  const defaults = {
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    vibrate: [100, 50, 100],
    data: { url: '/' },
  }

  if ('serviceWorker' in navigator) {
    try {
      const sw = await navigator.serviceWorker.ready
      await sw.showNotification(title, { ...defaults, ...options })
      return
    } catch (_) {
      // fallback to basic Notification
    }
  }

  new Notification(title, { ...defaults, ...options })
}

// ── Formatting helpers ────────────────────────────────────────────────────────

function fmtHours(seconds) {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  if (h > 0 && m > 0) return `${h}h ${m}m`
  if (h > 0) return `${h}h`
  return `${m}m`
}

function fmtElapsed(seconds) {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  return [h, m, s].map((v) => String(v).padStart(2, '0')).join(':')
}

// ── Motivational lines pool ───────────────────────────────────────────────────

const MOTIVATION_INCOMPLETE = [
  'Ek ek step karo — manzil dur nahi! 💪',
  'Abhi shuru karo, baad mein khushi hogi! 🚀',
  'Consistency hi success ki chaabi hai. Chalo! 🔑',
  'Aaj ki mehnat, kal ka fal. Mat ruko! ⚡',
  'Thoda aur — tum kar sakte ho! 🎯',
  'Sapne wo nahi jo neend mein aate hain, wo jo neend nahi aane dete! 🌟',
  'Har minute important hai. Shuru ho jao! ⏰',
]

const MOTIVATION_COMPLETE = [
  'Kya baat hai! Aaj ka goal complete! 🏆',
  'Outstanding! Tum champion ho! 🥇',
  'Full marks aaj ke liye! Kal bhi aisa hi! 🌟',
  'Daily goal done! Yeh discipline hi tumhe aage le jayegi! 💎',
  'Zabardast! Aaj ka target hit! 🎯',
]

const MOTIVATION_HALFWAY = [
  'Aadha rasta par! Bas thoda aur push karo! 💪',
  '50% complete — ab momentum mat todno! 🔥',
  'Halfway there! Tum bilkul sahi track par ho! ⚡',
]

const MOTIVATION_NEAR = [
  'Almost there! Goal ke kareeb ho — rukna mat! 🏃',
  'Sirf thoda aur bacha hai! Karo finish! 🎯',
  '75%+ done! Aaj ka medal pakka! 🥇',
]

function getRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)]
}

// ── 1. Daily goal milestone notification ─────────────────────────────────────
//    Sent at milestones: 25%, 50%, 75%, 100%

const _sentMilestones = new Set()

export async function checkGoalMilestone(todaySeconds, goalSeconds) {
  if (!hasPermission() || goalSeconds <= 0) return

  const pct = (todaySeconds / goalSeconds) * 100
  const today = new Date().toDateString()
  const key = (milestone) => `${today}_${milestone}`

  if (pct >= 100 && !_sentMilestones.has(key(100))) {
    _sentMilestones.add(key(100))
    const done = fmtHours(goalSeconds)
    await sendNotification('🏆 Daily Goal Complete! — Tapasya', {
      body: `${done} ka target achieve kar liya! ${getRandom(MOTIVATION_COMPLETE)}`,
      tag: 'goal-100',
      renotify: true,
      data: { url: '/' },
    })
  } else if (pct >= 75 && !_sentMilestones.has(key(75))) {
    _sentMilestones.add(key(75))
    const remaining = fmtHours(goalSeconds - todaySeconds)
    await sendNotification('⚡ 75% Goal Done! — Tapasya', {
      body: `Sirf ${remaining} aur bacha! ${getRandom(MOTIVATION_NEAR)}`,
      tag: 'goal-75',
      renotify: true,
      data: { url: '/' },
    })
  } else if (pct >= 50 && !_sentMilestones.has(key(50))) {
    _sentMilestones.add(key(50))
    const remaining = fmtHours(goalSeconds - todaySeconds)
    await sendNotification('🔥 Halfway Done! — Tapasya', {
      body: `${fmtHours(todaySeconds)} ho gaye! ${remaining} aur bacha. ${getRandom(MOTIVATION_HALFWAY)}`,
      tag: 'goal-50',
      renotify: true,
      data: { url: '/' },
    })
  } else if (pct >= 25 && !_sentMilestones.has(key(25))) {
    _sentMilestones.add(key(25))
    const remaining = fmtHours(goalSeconds - todaySeconds)
    await sendNotification('✅ 25% Complete! — Tapasya', {
      body: `Achhi shuruat! ${remaining} aur chahiye aaj ke goal ke liye. Keep going! 🚀`,
      tag: 'goal-25',
      renotify: true,
      data: { url: '/' },
    })
  }
}

// ── 2. Hourly progress reminder ───────────────────────────────────────────────
//    Har ghante ek notification — kitna hua, kitna baaki

export async function sendHourlyProgress(todaySeconds, goalSeconds, streakDays) {
  if (!hasPermission() || goalSeconds <= 0) return

  const done = fmtHours(todaySeconds)
  const remaining = goalSeconds > todaySeconds ? fmtHours(goalSeconds - todaySeconds) : null
  const pct = Math.min(Math.round((todaySeconds / goalSeconds) * 100), 100)

  let title, body

  if (pct >= 100) {
    title = '🏆 Goal Complete! — Tapasya'
    body = `${done} study ho gayi aaj! ${getRandom(MOTIVATION_COMPLETE)}`
  } else if (todaySeconds === 0) {
    title = '⏰ Abhi shuru karo! — Tapasya'
    body = `Aaj abhi tak kuch nahi hua. Goal hai: ${fmtHours(goalSeconds)}. ${getRandom(MOTIVATION_INCOMPLETE)}`
  } else {
    title = '📊 Progress Update — Tapasya'
    body = `✅ ${done} done (${pct}%) | ⏳ ${remaining} baaki${streakDays > 0 ? ` | 🔥 ${streakDays} day streak` : ''}`
  }

  await sendNotification(title, {
    body,
    tag: 'hourly-progress',
    renotify: true,
    data: { url: '/' },
    actions: [{ action: 'open', title: '📖 Study Now' }],
  })
}

// ── 3. Incomplete todo reminder ────────────────────────────────────────────────

export async function sendTodoReminder(pendingTodos) {
  if (!hasPermission() || pendingTodos.length === 0) return

  const count = pendingTodos.length
  const first = pendingTodos[0]?.text || pendingTodos[0]?.title || 'Pehla task'

  await sendNotification(`📋 ${count} Task${count > 1 ? 's' : ''} Pending — Tapasya`, {
    body: `"${first}"${count > 1 ? ` aur ${count - 1} aur tasks` : ''} complete karna baaki hai! ${getRandom(MOTIVATION_INCOMPLETE)}`,
    tag: 'todo-reminder',
    renotify: true,
    data: { url: '/todo' },
    actions: [{ action: 'open', title: '✅ Tasks Dekho' }],
  })
}

// ── 4. Morning motivation (din ke pehle ghante mein) ─────────────────────────

export async function sendMorningMotivation(goalSeconds, streakDays) {
  if (!hasPermission()) return

  const goal = fmtHours(goalSeconds)
  const streakText = streakDays > 0 ? ` 🔥 ${streakDays} din ki streak chal rahi hai!` : ''

  await sendNotification('🌅 Good Morning! — Tapasya', {
    body: `Aaj ka target: ${goal}.${streakText} ${getRandom(MOTIVATION_INCOMPLETE)}`,
    tag: 'morning-motivation',
    renotify: false,
    data: { url: '/' },
  })
}

// ── 5. Evening reminder (agar goal incomplete ho) ────────────────────────────

export async function sendEveningReminder(todaySeconds, goalSeconds) {
  if (!hasPermission() || goalSeconds <= 0) return
  if (todaySeconds >= goalSeconds) return

  const done = fmtHours(todaySeconds)
  const remaining = fmtHours(goalSeconds - todaySeconds)
  const pct = Math.round((todaySeconds / goalSeconds) * 100)

  await sendNotification('🌙 Aaj ka din khatam hone wala hai! — Tapasya', {
    body: `${done} (${pct}%) hua, ${remaining} aur baaki. ${getRandom(MOTIVATION_INCOMPLETE)}`,
    tag: 'evening-reminder',
    renotify: true,
    data: { url: '/' },
    actions: [{ action: 'open', title: '📖 Ab Padho' }],
  })
}

// ── 6. Live timer notification (timer chal raha ho tab) ──────────────────────

export async function showLiveTimerNotification(subjectName, elapsed, todaySeconds, goalSeconds) {
  if (!hasPermission()) return

  const pct = goalSeconds > 0 ? Math.min(Math.round((todaySeconds / goalSeconds) * 100), 100) : 0

  if ('serviceWorker' in navigator) {
    try {
      const sw = await navigator.serviceWorker.ready
      await sw.showNotification(`📖 ${subjectName} — Tapasya`, {
        body: `⏱ ${fmtElapsed(elapsed)} | Aaj: ${fmtHours(todaySeconds)} done (${pct}%)`,
        icon: '/icons/icon-192.png',
        badge: '/icons/icon-192.png',
        tag: 'live-timer',
        renotify: true,
        silent: true,
        data: { url: '/' },
        actions: [{ action: 'stop', title: '⏹ Stop' }],
      })
      return
    } catch (_) {}
  }
}

// ── 7. Break reminder ─────────────────────────────────────────────────────────

export function scheduleBreakReminder(afterMinutes = 60) {
  if (!hasPermission()) return
  setTimeout(async () => {
    await sendNotification('🧘 Break le lo! — Tapasya', {
      body: `${afterMinutes} minute ho gaye! Thodi der aankhen band karo, paani piyo. 💧`,
      tag: 'break-reminder',
      data: { url: '/' },
    })
  }, afterMinutes * 60 * 1000)
}

// ── 8. Clear all notifications ────────────────────────────────────────────────

export async function clearAllNotifications() {
  if (!('serviceWorker' in navigator)) return
  try {
    const sw = await navigator.serviceWorker.ready
    const notifs = await sw.getNotifications()
    notifs.forEach((n) => n.close())
  } catch (_) {}
}

// ── Reset milestones (naya din aaya) ─────────────────────────────────────────

export function resetMilestones() {
  _sentMilestones.clear()
}

// Legacy export (backward compat)
export function showTimerNotification(subjectName, elapsed) {
  showLiveTimerNotification(subjectName, elapsed, 0, 0)
}