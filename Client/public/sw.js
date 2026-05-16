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
// ── Live Timer Notification (persistent, silent update) ──────────────────────
// App se message aata hai har second — SW notification update karta hai
// Same tag = notification replace hoti hai, close + reopen nahi hota
// silent: true = koi sound/vibration nahi

self.addEventListener('message', (event) => {
  const { type, payload } = event.data || {}

  if (type === 'TIMER_TICK') {
    const { subject, elapsed, todayDone, goalPct } = payload

    // Format helpers (SW mein external import nahi hota)
    function fmtElapsed(s) {
      const h = Math.floor(s / 3600)
      const m = Math.floor((s % 3600) / 60)
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

    const pct = Math.min(Math.round(goalPct || 0), 100)
    const bar = buildBar(pct)

    event.waitUntil(
      self.registration.showNotification(`📖 ${subject}`, {
        body: `${fmtElapsed(elapsed)}  •  Today: ${fmtHours(todayDone)}  ${bar}  ${pct}%`,
        icon: '/icons/icon-192.png',
        badge: '/icons/icon-192.png',
        tag: 'live-timer',          // same tag = update in place
        renotify: false,            // koi sound/buzz nahi
        silent: true,               // bilkul quiet
        ongoing: true,              // Android pe dismiss nahi hoti jab tak timer chal raha ho
        data: { url: '/timer' },
        actions: [
          { action: 'pause',  title: '⏸ Pause'  },
          { action: 'stop',   title: '⏹ Stop'   },
        ],
      })
    )
  }

  if (type === 'TIMER_STOP') {
    // Timer stop hone par live notification close karo
    event.waitUntil(
      self.registration.getNotifications({ tag: 'live-timer' })
        .then((notifs) => notifs.forEach((n) => n.close()))
    )
  }
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