// public/sw.js — Tapasya Service Worker
// Direct file, no bundler, no imports — pure browser SW

const CACHE = 'tapasya-v5' // v5: hashed-asset fetch failures (offline + not cached) now resolve to a real Response instead of leaving the fetch event's promise rejected
const STATIC_ASSETS = ['/', '/index.html', '/icons/icon-192.png', '/icons/icon-512.png', '/manifest.json']

// ── Install ───────────────────────────────────────────────────────────────────
self.addEventListener('install', (e) => {
  self.skipWaiting()
  e.waitUntil(
    caches.open(CACHE).then(cache =>
      cache.addAll(STATIC_ASSETS).catch(() => {})
    )
  )
})

// Cleanup old caches on activate
self.addEventListener('activate', (e) => {
  e.waitUntil(
    Promise.all([
      clients.claim(),
      caches.keys().then(keys =>
        Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
      ),
    ])
  )
})

// ── Fetch strategy ───────────────────────────────────────────────────────────
// API calls: network-only (never cache)
// HTML navigation: network-first, fallback to cached index.html (SPA)
// JS/CSS/assets (hashed bundles): cache-first — once cached offline forever
// Other static (icons, fonts): cache-first with network fallback

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url)

  // Skip non-GET and cross-origin requests
  if (event.request.method !== 'GET') return
  if (url.origin !== self.location.origin) return

  // API calls — network only, never cache
  if (url.pathname.startsWith('/api/')) return

  // Vite dev server internals — NEVER cache (causes stale chunk bugs in dev)
  if (
    url.pathname.startsWith('/node_modules/') ||
    url.pathname.startsWith('/@vite/') ||
    url.pathname.startsWith('/@fs/') ||
    url.pathname.startsWith('/__vite') ||
    url.search.includes('v=')           // hashed vite dev chunks like ?v=dc7ca4f2
  ) return

  // SPA navigation — network first, cached index.html fallback
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then(res => {
          if (res.ok) {
            const clone = res.clone()
            caches.open(CACHE).then(c => c.put('/index.html', clone))
          }
          return res
        })
        .catch(() => caches.match('/index.html').then(r => r || new Response('Offline', { status: 503 })))
    )
    return
  }

  // Hashed JS/CSS bundles (e.g. /assets/index-Bx3kL9mP.js) — cache-first
  // Once fetched online they stay cached, so offline works perfectly
  const isHashedAsset = url.pathname.startsWith('/assets/')
  if (isHashedAsset) {
    event.respondWith(
      caches.match(event.request).then(cached => {
        if (cached) return cached
        return fetch(event.request).then(res => {
          if (res.ok) {
            const clone = res.clone()
            caches.open(CACHE).then(c => c.put(event.request, clone))
          }
          return res
        }).catch(() => {
          // Offline AND this exact chunk was never cached (e.g. a page
          // that's never been opened online yet, or a stale reference to
          // a chunk from before the latest deploy). Without this .catch,
          // the fetch event's promise itself rejects, which the browser
          // surfaces as an unhandled network error — and for a JS module
          // fetched via a lazy import(), that turns into an uncaught
          // exception that can crash the whole page. A real (if empty)
          // Response lets that fail as an ordinary caught promise
          // rejection in app code instead, which RouteErrorBoundary
          // catches gracefully rather than the whole app going blank.
          return new Response('', { status: 503, statusText: 'Offline — asset not cached' })
        })
      })
    )
    return
  }

  // Other static assets (icons, manifest, worker files) — cache-first, network fallback
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached
      return fetch(event.request).then(res => {
        if (res.ok) {
          const clone = res.clone()
          caches.open(CACHE).then(c => c.put(event.request, clone))
        }
        return res
      }).catch(() => new Response('', { status: 503 }))
    })
  )
})

// ── Push (server-side push) ───────────────────────────────────────────────────
self.addEventListener('push', (event) => {
  if (!event.data) return
  let d = {}
  try { d = event.data.json() } catch { d = { title: 'Tapasya', body: event.data.text() } }
  event.waitUntil(
    self.registration.showNotification(d.title || 'Tapasya', {
      body: d.body || '',
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      tag: d.tag || 'tapasya',
      vibrate: [80, 40, 80],
      data: { url: d.url || '/' },
    })
  )
})

// ── Live Timer — SW-side ticker ───────────────────────────────────────────────
// App sirf START/PAUSE/RESUME/STOP bhejta hai
// SW apna setInterval chalata hai — har second notification update hoti hai silently

var _iv      = null
var _at      = 0      // Date.now() jab interval shuru hua
var _base    = 0      // elapsed seconds at start
var _subject = 'Study'
var _gpct    = 0      // goal percent at start

function _fmt(s) {
  var h = Math.floor(s / 3600)
  var m = Math.floor((s % 3600) / 60)
  var sec = s % 60
  return [h, m, sec].map(function(v){ return String(v).padStart(2,'0') }).join(':')
}

function _bar(p) {
  var f = Math.max(0, Math.min(10, Math.round(p / 10)))
  return '\u2593'.repeat(f) + '\u2591'.repeat(10 - f)
}

function _tick() {
  var elapsed = _base + Math.floor((Date.now() - _at) / 1000)
  self.registration.showNotification('\uD83C\uDFAF ' + _subject, {
    body: _fmt(elapsed) + '  \u00B7  ' + _bar(_gpct),
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    tag: 'live-timer',
    renotify: false,
    silent: true,
    data: { url: '/timer' },
    actions: [
      { action: 'pause', title: '\u23F8 Pause' },
      { action: 'stop',  title: '\u23F9 Stop' },
    ],
  }).catch(function(){})
}

function _clearTimer() {
  clearInterval(_iv)
  _iv = null
  self.registration.getNotifications({ tag: 'live-timer' })
    .then(function(ns){ ns.forEach(function(n){ n.close() }) })
    .catch(function(){})
}

// ── Message handler ───────────────────────────────────────────────────────────
self.addEventListener('message', function(event) {
  var type    = (event.data || {}).type
  var payload = (event.data || {}).payload || {}

  if (type === 'TIMER_START') {
    clearInterval(_iv)
    _subject = payload.subject || 'Study'
    _gpct    = Math.min(payload.goalPct || 0, 100)
    _base    = payload.elapsed || 0
    _at      = Date.now()
    _tick()                             // turant pehla tick
    _iv = setInterval(_tick, 1000)
    return
  }

  if (type === 'TIMER_PAUSE') {
    clearInterval(_iv)
    _iv = null
    self.registration.getNotifications({ tag: 'live-timer' })
      .then(function(ns){ ns.forEach(function(n){ n.close() }) })
      .catch(function(){})
    return
  }

  if (type === 'TIMER_RESUME') {
    clearInterval(_iv)
    _base = (payload.elapsed !== undefined) ? payload.elapsed : _base
    _at   = Date.now()
    _tick()
    _iv = setInterval(_tick, 1000)
    return
  }

  if (type === 'TIMER_STOP') {
    _clearTimer()
    return
  }

  // PING — SW active hai ya nahi check karne ke liye
  if (type === 'PING') {
    event.source && event.source.postMessage({ type: 'PONG' })
    return
  }
})

// ── Notification click ────────────────────────────────────────────────────────
self.addEventListener('notificationclick', function(event) {
  var action = event.action
  var notif  = event.notification
  notif.close()

  if (action === 'pause' || action === 'stop') {
    event.waitUntil(
      clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(list) {
        list.forEach(function(c) {
          c.postMessage({ type: action === 'pause' ? 'NOTIF_PAUSE' : 'NOTIF_STOP' })
        })
        if (!list.length && clients.openWindow) return clients.openWindow('/timer')
      })
    )
    return
  }

  var url = (notif.data && notif.data.url) || '/'
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(list) {
      for (var i = 0; i < list.length; i++) {
        if ('focus' in list[i]) return list[i].focus()
      }
      if (clients.openWindow) return clients.openWindow(url)
    })
  )
})