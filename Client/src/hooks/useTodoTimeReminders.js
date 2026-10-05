// src/hooks/useTodoTimeReminders.js
// Todo ka startTime aate hi "Ye todo karna hai" notification (phone/desktop pe).
//
// Do layers hain:
//   1. Server push (server/utils/todoReminders.js + external per-minute pinger) —
//      app band ho tab bhi aati hai.
//   2. Ye hook — app khula ya background mein alive ho to wahi notification local
//      se dikhata hai, taaki pinger set na bhi ho to bhi kaam kare.
// Dono same `tag` (todo-<id>) use karte hain, isliye ek saath aane par bhi ek hi
// notification dikhti hai (naya purane ko replace karta hai), duplicate nahi.
//
// App.jsx mein ek baar mount hota hai (useBootstrap ke saath).

import { useEffect } from 'react'
import useUserStore from '@/store/userStore'
import { getTodos } from '@/api/todos'
import { getTodosOffline } from '@/utils/offlineDB'
import { getStudyDayString } from '@/utils/time'
import {
  TODO_REMIND_GRACE_MS,
  formatTimeWindow,
  getTodoEndMs,
  getTodoStartMs,
} from '@/utils/todoTime'

const CHECK_MS   = 15 * 1000      // due check
const RELOAD_MS  = 60 * 1000      // IndexedDB se list refresh (naye/done/delete todos)
const FIRED_KEY  = 'tapasya:todoRemindFired'
const FIRED_TTL  = 3 * 24 * 60 * 60 * 1000

function addDaysStr(dateStr, n) {
  const [y, m, d] = dateStr.split('-').map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d + n))
  return dt.toISOString().slice(0, 10)
}

function loadFired() {
  try {
    const raw = JSON.parse(localStorage.getItem(FIRED_KEY) || '{}')
    const cutoff = Date.now() - FIRED_TTL
    return Object.fromEntries(Object.entries(raw).filter(([, ts]) => ts > cutoff))
  } catch { return {} }
}

function saveFired(map) {
  try { localStorage.setItem(FIRED_KEY, JSON.stringify(map)) } catch { /* storage full/blocked */ }
}

async function showTodoNotification(todo) {
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return
  const id = String(todo.id || todo._id)
  const title = '⏰ Todo ka time ho gaya'
  const options = {
    body: `Ye todo karna hai: ${todo.text} (${formatTimeWindow(todo)})`,
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    tag: `todo-${id}`,
    vibrate: [120, 60, 120],
    requireInteraction: true,
    data: { url: '/todo' },
  }
  try {
    if ('serviceWorker' in navigator) {
      // dev mein SW off hota hai — .ready kabhi resolve nahi hoga, isliye timeout
      const reg = await Promise.race([
        navigator.serviceWorker.ready,
        new Promise((_, reject) => setTimeout(() => reject(new Error('sw timeout')), 1500)),
      ])
      await reg.showNotification(title, options)
      return
    }
  } catch { /* fall through to page Notification */ }
  try { new Notification(title, options) } catch { /* not supported */ }
}

export default function useTodoTimeReminders() {
  const uid = useUserStore((s) => s.uid)

  useEffect(() => {
    if (!uid) return undefined

    let cancelled = false
    let timed = [] // aaj/kal ke pending todos jinke paas startTime hai

    async function loadFromOffline() {
      try {
        const today = getStudyDayString()
        const list = await getTodosOffline(addDaysStr(today, -1), today)
        if (!cancelled) timed = list.filter((t) => t.startTime && !t.done)
      } catch { /* IndexedDB unavailable */ }
    }

    // Network se fresh list (offline store bhi update hota hai) — mount pe aur
    // jab tab/app wapas foreground mein aaye. Offline ho to cache hi milta hai.
    async function loadFresh() {
      try {
        const today = getStudyDayString()
        await getTodos(addDaysStr(today, -1), today)
      } catch { /* getTodos already falls back to cache */ }
      await loadFromOffline()
    }

    function check() {
      if (!timed.length) return
      const now = Date.now()
      const fired = loadFired()
      let changed = false

      for (const todo of timed) {
        const start = getTodoStartMs(todo)
        if (start == null || now < start || now - start > TODO_REMIND_GRACE_MS) continue
        const end = getTodoEndMs(todo)
        if (end != null && now >= end) continue

        const key = `${todo.id || todo._id}|${todo.date}|${todo.startTime}`
        if (fired[key]) continue
        fired[key] = now
        changed = true
        showTodoNotification(todo)
      }
      if (changed) saveFired(fired)
    }

    const onChanged = () => { loadFromOffline().then(check) }
    const onVisible = () => { if (document.visibilityState === 'visible') loadFresh().then(check) }

    loadFresh().then(check)
    const checkId  = setInterval(check, CHECK_MS)
    const reloadId = setInterval(loadFromOffline, RELOAD_MS)
    window.addEventListener('tapasya:todos-changed', onChanged)
    document.addEventListener('visibilitychange', onVisible)

    return () => {
      cancelled = true
      clearInterval(checkId)
      clearInterval(reloadId)
      window.removeEventListener('tapasya:todos-changed', onChanged)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [uid])
}