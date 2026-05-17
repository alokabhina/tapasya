// public/sw.js
// Service Worker — Workbox offline cache, push notification handler,
// background sync for pending sessions

import { precacheAndRoute, cleanupOutdatedCaches } from "workbox-precaching";
import { registerRoute } from "workbox-routing";
import {
  NetworkFirst,
  CacheFirst,
  StaleWhileRevalidate,
} from "workbox-strategies";
import { BackgroundSyncPlugin } from "workbox-background-sync";
import { ExpirationPlugin } from "workbox-expiration";

// ── Precache (injected by vite-plugin-pwa) ───────────────────────────
precacheAndRoute(self.__WB_MANIFEST || []);
cleanupOutdatedCaches();

// ── Runtime Caching ──────────────────────────────────────────────────

// Firebase Firestore API — Network first
registerRoute(
  ({ url }) => url.hostname.includes("firestore.googleapis.com"),
  new NetworkFirst({
    cacheName: "firestore-cache",
    plugins: [
      new ExpirationPlugin({ maxEntries: 50, maxAgeSeconds: 5 * 60 }),
    ],
  })
);

// Static assets — Cache first
registerRoute(
  ({ request }) =>
    request.destination === "style" ||
    request.destination === "script" ||
    request.destination === "font",
  new CacheFirst({
    cacheName: "static-assets",
    plugins: [
      new ExpirationPlugin({ maxEntries: 60, maxAgeSeconds: 30 * 24 * 60 * 60 }),
    ],
  })
);

// Images — Stale while revalidate
registerRoute(
  ({ request }) => request.destination === "image",
  new StaleWhileRevalidate({
    cacheName: "images-cache",
    plugins: [
      new ExpirationPlugin({ maxEntries: 50, maxAgeSeconds: 7 * 24 * 60 * 60 }),
    ],
  })
);

// ── Background Sync — pending sessions ──────────────────────────────
const sessionSyncPlugin = new BackgroundSyncPlugin("pending-sessions-queue", {
  maxRetentionTime: 24 * 60, // 24 hours in minutes
});

registerRoute(
  ({ url }) =>
    url.hostname.includes("firestore.googleapis.com") &&
    url.pathname.includes("sessions"),
  new NetworkFirst({
    cacheName: "sessions-sync",
    plugins: [sessionSyncPlugin],
  }),
  "POST"
);

// ── Push Notification Handler ────────────────────────────────────────
self.addEventListener("push", (event) => {
  if (!event.data) return;

  let data = {};
  try {
    data = event.data.json();
  } catch {
    data = { title: "Tapasya", body: event.data.text() };
  }

  const options = {
    body: data.body || "Break lene ka time aa gaya!",
    icon: "/icons/icon-192.png",
    badge: "/icons/icon-192.png",
    tag: data.tag || "tapasya-notification",
    vibrate: [100, 50, 100],
    data: { url: data.url || "/" },
    actions: data.actions || [],
  };

  event.waitUntil(
    self.registration.showNotification(data.title || "तपस्या", options)
  );
});

// notificationclick — see handler at bottom (includes pause/stop actions)

// ── Install + Activate ───────────────────────────────────────────────
self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(clients.claim());
});

// ── Fetch fallback (SPA) ─────────────────────────────────────────────
self.addEventListener("fetch", (event) => {
  if (
    event.request.mode === "navigate" &&
    !event.request.url.includes("/api/")
  ) {
    event.respondWith(
      fetch(event.request).catch(() =>
        caches.match("/index.html")
      )
    );
  }
});
// ── Live Timer Notification — SW-side continuous ticker ──────────────────────
// App se sirf TIMER_START / TIMER_STOP message aata hai.
// SW apne andar setInterval chalata hai — har second notification update hoti hai.
// Koi fetch nahi, koi app-side interval nahi — SW khud time track karta hai.

let _timerInterval  = null  // SW-side interval
let _timerStartedAt = 0     // wall-clock ms jab timer start hua SW mein
let _timerBaseElapsed = 0   // elapsed jo app ne diya tha start pe (pause resume support)
let _timerSubject   = ''
let _timerGoalPct   = 0

function fmtElapsed(s) {
  const h   = Math.floor(s / 3600)
  const m   = Math.floor((s % 3600) / 60)
  const sec = s % 60
  return [h, m, sec].map((v) => String(v).padStart(2, '0')).join(':')
}
function fmtHours(s) {
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  if (h > 0 && m > 0) return `${h}h ${m}m`
  if (h > 0) return `${h}h`
  return `${m}m`
}
function buildBar(pct) {
  const f = Math.round(pct / 10)
  return '▓'.repeat(f) + '░'.repeat(10 - f)
}

function showLiveNotif(elapsed) {
  const pct = Math.min(Math.round(_timerGoalPct + (elapsed - _timerBaseElapsed) / 36), 100)
  self.registration.showNotification(`🎯 ${_timerSubject || 'Focus Mode Active'}`, {
    body: `${fmtElapsed(elapsed)}  ·  ${buildBar(Math.round(_timerGoalPct))}`,
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    tag: 'live-timer',
    renotify: false,
    silent: true,
    ongoing: true,
    data: { url: '/timer' },
    actions: [
      { action: 'pause', title: '⏸ Pause' },
      { action: 'stop',  title: '⏹ Stop'  },
    ],
  }).catch(() => {})
}

self.addEventListener('message', (event) => {
  const { type, payload } = event.data || {}

  if (type === 'TIMER_START') {
    // App timer start hua — SW apna ticker shuru kare
    clearInterval(_timerInterval)
    _timerSubject     = payload?.subject || 'Study'
    _timerGoalPct     = payload?.goalPct || 0
    _timerBaseElapsed = payload?.elapsed || 0
    _timerStartedAt   = Date.now()

    _timerInterval = setInterval(() => {
      const elapsed = _timerBaseElapsed + Math.floor((Date.now() - _timerStartedAt) / 1000)
      showLiveNotif(elapsed)
    }, 1000)

    // Pehla tick turant
    showLiveNotif(_timerBaseElapsed)
  }

  if (type === 'TIMER_PAUSE') {
    clearInterval(_timerInterval)
    _timerInterval = null
    // Notification close karo jab paused
    self.registration.getNotifications({ tag: 'live-timer' })
      .then((notifs) => notifs.forEach((n) => n.close()))
      .catch(() => {})
  }

  if (type === 'TIMER_RESUME') {
    // Resume pe updated elapsed aata hai app se
    clearInterval(_timerInterval)
    _timerBaseElapsed = payload?.elapsed || _timerBaseElapsed
    _timerStartedAt   = Date.now()

    _timerInterval = setInterval(() => {
      const elapsed = _timerBaseElapsed + Math.floor((Date.now() - _timerStartedAt) / 1000)
      showLiveNotif(elapsed)
    }, 1000)
    showLiveNotif(_timerBaseElapsed)
  }

  if (type === 'TIMER_STOP') {
    clearInterval(_timerInterval)
    _timerInterval = null
    self.registration.getNotifications({ tag: 'live-timer' })
      .then((notifs) => notifs.forEach((n) => n.close()))
      .catch(() => {})
  }

  // Legacy TIMER_TICK — ignore (SW ab khud track karta hai)
})

// ── Notification action buttons (pause/stop) ─────────────────────────────────
self.addEventListener('notificationclick', (event) => {
  const action = event.action
  const notif  = event.notification

  if (action === 'pause' || action === 'stop') {
    notif.close()
    // App ko message bhejo — agar open hai
    event.waitUntil(
      clients.matchAll({ type: 'window', includeUncontrolled: true })
        .then((clientList) => {
          for (const client of clientList) {
            client.postMessage({ type: action === 'pause' ? 'NOTIF_PAUSE' : 'NOTIF_STOP' })
          }
          // Agar koi window open nahi — app open karo
          if (clientList.length === 0 && clients.openWindow) {
            return clients.openWindow('/timer')
          }
        })
    )
    return
  }

  // Normal click — app focus ya open
  notif.close()
  const targetUrl = notif.data?.url || '/'
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if ('focus' in client) return client.focus()
        }
        if (clients.openWindow) return clients.openWindow(targetUrl)
      })
  )
})

// Progress bar helper (ASCII, 10 chars)
function buildBar(pct) {
  const filled = Math.round(pct / 10)
  return '▓'.repeat(filled) + '░'.repeat(10 - filled)
}