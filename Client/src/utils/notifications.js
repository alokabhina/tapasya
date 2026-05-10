// Push notification helpers — Service Worker se kaam karta hai

// Notification permission maango
export async function requestPermission() {
  if (!('Notification' in window)) return false
  if (Notification.permission === 'granted') return true
  const result = await Notification.requestPermission()
  return result === 'granted'
}

// Break reminder schedule karo (X minutes baad)
export function scheduleBreakReminder(afterMinutes = 60) {
  if (Notification.permission !== 'granted') return
  setTimeout(() => {
    new Notification('Tapasya — Break le lo! 🧘', {
      body: `${afterMinutes} minutes ho gaye, thodi der rest karo`,
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      tag: 'break-reminder',
    })
  }, afterMinutes * 60 * 1000)
}

// Android notification bar mein live timer dikhao
export function showTimerNotification(subjectName, elapsed) {
  if (!('serviceWorker' in navigator)) return
  navigator.serviceWorker.ready.then((sw) => {
    sw.showNotification(`📖 ${subjectName}`, {
      body: `Study time: ${formatElapsed(elapsed)}`,
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      tag: 'live-timer',
      renotify: true,
      silent: true,
      actions: [{ action: 'stop', title: 'Stop' }],
    })
  })
}

// Saari notifications clear karo
export async function clearAllNotifications() {
  if (!('serviceWorker' in navigator)) return
  const sw = await navigator.serviceWorker.ready
  const notifications = await sw.getNotifications()
  notifications.forEach((n) => n.close())
}

// Helper — seconds ko MM:SS format
function formatElapsed(seconds) {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  return [h, m, s].map((v) => String(v).padStart(2, '0')).join(':')
}