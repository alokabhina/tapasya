// src/utils/push.js
// Real background push subscribe/unsubscribe — yeh wahi notification jo
// app band hone par bhi server se trigger hoke aati hai (page ke timers se
// independent, kyunki browser/OS push service service worker ko khud jagata hai).

import api from '@/api/client'

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)))
}

export function isPushSupported() {
  return 'serviceWorker' in navigator && 'PushManager' in window
}

export async function getExistingSubscription() {
  if (!isPushSupported()) return null
  const reg = await navigator.serviceWorker.ready
  return reg.pushManager.getSubscription()
}

// Call after Notification permission is granted — registers with the
// browser's push service AND saves the subscription on our server
export async function subscribeToPush() {
  if (!isPushSupported()) return null
  if (Notification.permission !== 'granted') return null

  try {
    const { data } = await api.get('/push/vapid-public-key')
    if (!data?.publicKey) return null // server has no VAPID keys configured yet

    const reg = await navigator.serviceWorker.ready
    let sub = await reg.pushManager.getSubscription()
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(data.publicKey),
      })
    }

    const json = sub.toJSON()
    await api.post('/push/subscribe', { endpoint: json.endpoint, keys: json.keys })
    return sub
  } catch (e) {
    console.error('Push subscribe failed:', e)
    return null
  }
}

export async function unsubscribeFromPush() {
  const sub = await getExistingSubscription()
  if (!sub) return
  try { await api.post('/push/unsubscribe', { endpoint: sub.endpoint }) } catch (_) {}
  await sub.unsubscribe()
}

export async function sendTestPush() {
  return api.post('/push/test')
}