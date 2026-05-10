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

// ── Notification Click ───────────────────────────────────────────────
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const targetUrl = event.notification.data?.url || "/";

  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if (client.url === targetUrl && "focus" in client) {
            return client.focus();
          }
        }
        if (clients.openWindow) {
          return clients.openWindow(targetUrl);
        }
      })
  );
});

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