// server/utils/webpush.js
// Real background push — kaam karta hai chahe app band/closed ho,
// kyunki delivery browser/OS push service ke through hoti hai (service worker
// ko jaga deta hai), na ki page ke JS timers se.

import webpush from 'web-push'

const PUBLIC_KEY  = process.env.VAPID_PUBLIC_KEY
const PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY
const CONTACT     = process.env.VAPID_CONTACT_EMAIL || 'mailto:admin@example.com'

let configured = false

export function ensureConfigured() {
  if (configured) return true
  if (!PUBLIC_KEY || !PRIVATE_KEY) {
    console.warn('⚠️  VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY not set — push notifications disabled')
    return false
  }
  webpush.setVapidDetails(CONTACT, PUBLIC_KEY, PRIVATE_KEY)
  configured = true
  return true
}

export function getPublicKey() {
  return PUBLIC_KEY || null
}

// Sends a push; returns true on success. Caller should delete the
// subscription from DB if this throws a 404/410 (expired/unsubscribed).
export async function sendPush(subscription, payload) {
  if (!ensureConfigured()) throw new Error('VAPID not configured')
  await webpush.sendNotification(
    { endpoint: subscription.endpoint, keys: subscription.keys },
    JSON.stringify(payload)
  )
}

export default { ensureConfigured, getPublicKey, sendPush }