// public/sw.js — Custom Service Worker
// VitePWA injectManifest mode mein use hota hai

// ── Precache (injected by vite-plugin-pwa) ───────────────────────────────────
self.__WB_MANIFEST; // placeholder — vite-plugin-pwa yahan inject karta hai

// ── Install + Activate ───────────────────────────────────────────────────────
self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (e) => e.waitUntil(clients.claim()))

// ── Fetch — SPA fallback ─────────────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  if (event.request.mode === 'navigate' && !event.request.url.includes('/api/')) {
    event.respondWith(
      fetch(event.request).catch(() => caches.match('/index.html'))
    )
  }
})

// ── Push (server-side push notifications) ────────────────────────────────────
self.addEventListener('push', (event) => {
  if (!event.data) return
  let data = {}
  try { data = event.data.json() } catch { data = { title: 'Tapasya', body: event.data.text() } }
  event.waitUntil(
    self.registration.showNotification(data.title || 'Tapasya', {
      body: data.body || '',
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      tag: data.tag || 'tapasya',
      vibrate: [80, 40, 80],
      data: { url: data.url || '/' },
      actions: data.actions || [],
    })
  )
})

// ── Live Timer — SW-side continuous ticker ────────────────────────────────────
// App se sirf TIMER_START / TIMER_PAUSE / TIMER_RESUME / TIMER_STOP aata hai
// SW khud setInterval chalata hai — har second notification silently update hoti hai

let _interval     = null
let _startedAt    = 0
let _baseElapsed  = 0
let _subject      = 'Study'
let _goalPct      = 0

function fmt(s) {
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60
  return [h, m, sec].map(v => String(v).padStart(2, '0')).join(':')
}
function bar(pct) {
  const f = Math.max(0, Math.min(10, Math.round(pct / 10)))
  return '▓'.repeat(f) + '░'.repeat(10 - f)
}

function tick() {
  const elapsed = _baseElapsed + Math.floor((Date.now() - _startedAt) / 1000)
  self.registration.showNotification(`🎯 ${_subject}`, {
    body: `${fmt(elapsed)}  ·  ${bar(_goalPct)}`,
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    tag: 'live-timer',
    renotify: false,
    silent: true,
    data: { url: '/timer' },
    actions: [
      { action: 'pause', title: '⏸ Pause' },
      { action: 'stop',  title: '⏹ Stop' },
    ],
  }).catch(() => {})
}

function clearLiveTimer() {
  clearInterval(_interval)
  _interval = null
  self.registration.getNotifications({ tag: 'live-timer' })
    .then(ns => ns.forEach(n => n.close())).catch(() => {})
}

self.addEventListener('message', (event) => {
  const { type, payload } = event.data || {}

  if (type === 'TIMER_START') {
    clearInterval(_interval)
    _subject     = payload?.subject || 'Study'
    _goalPct     = Math.min(payload?.goalPct || 0, 100)
    _baseElapsed = payload?.elapsed || 0
    _startedAt   = Date.now()
    tick() // turant pehla tick
    _interval = setInterval(tick, 1000)
  }

  if (type === 'TIMER_PAUSE') {
    clearInterval(_interval)
    _interval = null
    self.registration.getNotifications({ tag: 'live-timer' })
      .then(ns => ns.forEach(n => n.close())).catch(() => {})
  }

  if (type === 'TIMER_RESUME') {
    clearInterval(_interval)
    _baseElapsed = payload?.elapsed ?? _baseElapsed
    _startedAt   = Date.now()
    tick()
    _interval = setInterval(tick, 1000)
  }

  if (type === 'TIMER_STOP') {
    clearLiveTimer()
  }
})

// ── Notification click — pause/stop buttons ───────────────────────────────────
self.addEventListener('notificationclick', (event) => {
  const { action, notification: notif } = event
  notif.close()

  if (action === 'pause' || action === 'stop') {
    event.waitUntil(
      clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
        list.forEach(c => c.postMessage({ type: action === 'pause' ? 'NOTIF_PAUSE' : 'NOTIF_STOP' }))
        if (!list.length && clients.openWindow) return clients.openWindow('/timer')
      })
    )
    return
  }

  // Normal click — app open/focus
  const url = notif.data?.url || '/'
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      for (const c of list) if ('focus' in c) return c.focus()
      if (clients.openWindow) return clients.openWindow(url)
    })
  )
})