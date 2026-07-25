// src/hooks/useTimer.js
// FIXES:
// 1. Double session save — _saveInProgress guard
// 2. Paused time counted in elapsed on reload — pausedAccum tracked in store
// 3. Worker re-START on every mount — workerStarted ref
// 4. Cross-device conflict — active session heartbeat to server every 15s
// 5. Data loss on crash/tab-kill — beforeunload + visibilitychange auto-save to IndexedDB
// 6. Stats auto-refresh — fires tapasya:session-saved on stop

import { useEffect, useRef, useCallback } from 'react'
import useTimerStore from '@/store/timerStore'
import useUserStore from '@/store/userStore'
import useBreakReminderStore from '@/store/breakReminderStore'
import useBreakLogStore from '@/store/breakLogStore'
import { saveBreak } from '@/api/breaks'
import { saveSession, addPendingSync, sendActiveHeartbeat, clearActiveSession } from '@/api/sessions'
import { studyDaySplit, getStudyDayString } from '@/utils/time'
import { sendHeartbeat, sendOffline } from '@/api/groups'

// ── Singleton worker ──────────────────────────────────────────────────────────
let _worker = null
let _workerRunning = false
let _saveInProgress = false

// Unique device ID for this browser tab (persisted across page reloads)
function getDeviceId() {
  let id = sessionStorage.getItem('tapasya_device_id')
  if (!id) {
    id = `dev_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
    sessionStorage.setItem('tapasya_device_id', id)
  }
  return id
}

function getWorker() {
  if (!_worker) {
    _worker = new Worker('/timer.worker.js')
    _worker.onmessage = (e) => {
      if (e.data.type === 'TICK') {
        useTimerStore.getState().setElapsed(e.data.elapsed)
      }
    }
  }
  return _worker
}

// ── Hook ──────────────────────────────────────────────────────────────────────
export function useTimer() {
  const store = useTimerStore()
  const { uid } = useUserStore()
  const notifIntervalRef = useRef(null)

  // On every mount: resume worker ONLY if not already running
  useEffect(() => {
    const worker = getWorker()
    const s = useTimerStore.getState()

    if (s.isRunning && !s.isPaused && s.sessionStartTime && !_workerRunning) {
      _workerRunning = true
      // FIX: recalculate true elapsed — wall-clock diff minus total paused time
      const wallTotal = Math.round((Date.now() - new Date(s.sessionStartTime).getTime()) / 1000)
      const totalPaused = s.totalPausedSeconds || 0
      const trueElapsed = Math.max(s.elapsed, wallTotal - totalPaused)
      if (trueElapsed !== s.elapsed) {
        useTimerStore.getState().setElapsed(trueElapsed)
      }
      worker.postMessage({ type: 'START', payload: { elapsed: trueElapsed } })
    }

    return () => {}
  }, [])

  // SW helper
  function swPost(msg) {
    if (!('serviceWorker' in navigator)) return
    if (navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage(msg)
      return
    }
    navigator.serviceWorker.ready.then((reg) => {
      if (reg.active) reg.active.postMessage(msg)
    }).catch(() => {})
  }

  // On mount: tell SW timer is running (page reload)
  useEffect(() => {
    const s = useTimerStore.getState()
    if (s.isRunning && !s.isPaused && s.subjectName) {
      const { dailyGoalSeconds } = useUserStore.getState()
      const current = useTimerStore.getState().elapsed
      const goalPct = dailyGoalSeconds > 0 ? (current / dailyGoalSeconds) * 100 : 0
      swPost({ type: 'TIMER_START', payload: { subject: s.subjectName, elapsed: current, goalPct } })
    }
  }, [])

  // Re-sync elapsed from wall-clock when tab becomes visible again
  useEffect(() => {
    function onVisible() {
      const s = useTimerStore.getState()
      if (!s.isRunning || s.isPaused || !s.sessionStartTime) return
      const wallTotal = Math.round((Date.now() - new Date(s.sessionStartTime).getTime()) / 1000)
      // FIX: subtract total paused seconds so pause time doesn't count
      const totalPaused = s.totalPausedSeconds || 0
      const trueElapsed = Math.max(0, wallTotal - totalPaused)
      if (trueElapsed > s.elapsed + 5) {
        useTimerStore.getState().setElapsed(trueElapsed)
        getWorker().postMessage({ type: 'RESUME', payload: { elapsed: trueElapsed } })
      }
    }
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') onVisible()
    })
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [])

  // ── CRASH-SAFE AUTO-SAVE ────────────────────────────────────────────────────
  // Save to IndexedDB on tab close/hide so data is never lost even if tab crashes
  useEffect(() => {
    async function emergencySave() {
      const s = useTimerStore.getState()
      if (!s.isRunning || !s.sessionStartTime || s.elapsed < 10) return
      // Don't save if a real save is already in progress
      if (_saveInProgress) return

      try {
        const { saveSessionOffline } = await import('@/utils/offlineDB')
        const now = new Date().toISOString()
        const pad = n => String(n).padStart(2, '0')
        const d = new Date()
        const date = `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`
        const id = `crash_${Date.now()}`
        await saveSessionOffline({
          id,
          subjectId:    s.subjectId,
          subjectName:  s.subjectName,
          subjectColor: s.subjectColor,
          startTime:    s.sessionStartTime,
          endTime:      now,
          duration:     s.elapsed,  // pure study time (pause-excluded)
          date,
          notes:        '',
          _checkpoint:  true,       // cleaned up on next real stop
        })
      } catch (_) {}
    }

    // Tab is being closed/refreshed
    function onBeforeUnload() { emergencySave() }
    // Tab goes to background on mobile (most reliable mobile crash-save point)
    function onVisibilityHide() {
      if (document.visibilityState === 'hidden') emergencySave()
    }

    window.addEventListener('beforeunload', onBeforeUnload)
    document.addEventListener('visibilitychange', onVisibilityHide)
    return () => {
      window.removeEventListener('beforeunload', onBeforeUnload)
      document.removeEventListener('visibilitychange', onVisibilityHide)
    }
  }, [])

  // ── heartbeat to group ───────────────────────────────────────────────────────
  const heartbeatRef = useRef(null)
  const heartbeatVisibilityCleanupRef = useRef(null)

  function startHeartbeat() {
    clearInterval(heartbeatRef.current)
    heartbeatVisibilityCleanupRef.current?.()

    const sendNow = async () => {
      const s = useTimerStore.getState()
      if (!s.isRunning) return
      try {
        const { fetchMyGroups } = await import('@/api/groups')
        const groups = await fetchMyGroups()
        for (const g of groups) {
          sendHeartbeat(g._id, {
            isStudying:   true,
            subjectName:  s.subjectName,
            subjectColor: s.subjectColor,
            elapsed:      s.elapsed,
          }).catch(() => {})
        }
      } catch (_) {}
    }

    // FIX: pehla heartbeat turant bhejo — pehle 10s ka wait tha jisse
    // jaldi stop ya jaldi background jaane par server ko 'isStudying: true'
    // kabhi pata hi nahi chalta tha, aur group mein member show nahi hota tha
    sendNow()
    heartbeatRef.current = setInterval(sendNow, 10_000)

    // FIX: background se wapas foreground aane par turant resync —
    // mobile OS background mein setInterval ko throttle/freeze kar deta hai
    function onVisibleHeartbeat() {
      if (document.visibilityState === 'visible') sendNow()
    }
    document.addEventListener('visibilitychange', onVisibleHeartbeat)
    heartbeatVisibilityCleanupRef.current = () =>
      document.removeEventListener('visibilitychange', onVisibleHeartbeat)
  }

  function stopHeartbeat() {
    clearInterval(heartbeatRef.current)
    heartbeatVisibilityCleanupRef.current?.()
    heartbeatVisibilityCleanupRef.current = null
    import('@/api/groups').then(({ fetchMyGroups, sendOffline: offlineApi }) => {
      fetchMyGroups().then(groups => {
        groups.forEach(g => offlineApi(g._id).catch(() => {}))
      }).catch(() => {})
    }).catch(() => {})
  }

  // ── CROSS-DEVICE ACTIVE SESSION HEARTBEAT ──────────────────────────────────
  // Every 15s, push timer state to server so other devices can see it and warn the user
  const activeHeartbeatRef = useRef(null)

  function startActiveHeartbeat(subject) {
    clearInterval(activeHeartbeatRef.current)
    const deviceId = getDeviceId()

    // Send immediately on start
    const sendNow = () => {
      const s = useTimerStore.getState()
      if (!s.isRunning) return
      sendActiveHeartbeat({
        deviceId,
        subjectId:          s.subjectId,
        subjectName:        s.subjectName,
        subjectColor:       s.subjectColor,
        startTime:          s.sessionStartTime,
        elapsed:            s.elapsed,
        isPaused:           s.isPaused,
        totalPausedSeconds: s.totalPausedSeconds || 0,
      })
    }
    sendNow()
    activeHeartbeatRef.current = setInterval(sendNow, 15_000)
  }

  function stopActiveHeartbeat() {
    clearInterval(activeHeartbeatRef.current)
    clearActiveSession().catch(() => {})
  }

  // ── checkpoint auto-save (every 60s) ────────────────────────────────────────
  const checkpointRef = useRef(null)
  const lastCheckpointElapsed = useRef(0)

  function startCheckpoint(subject) {
    clearInterval(checkpointRef.current)
    lastCheckpointElapsed.current = 0
    checkpointRef.current = setInterval(async () => {
      const s = useTimerStore.getState()
      if (!s.isRunning || s.isPaused) return
      const newElapsed = s.elapsed
      const delta = newElapsed - lastCheckpointElapsed.current
      if (delta < 30) return
      lastCheckpointElapsed.current = newElapsed

      try {
        const { saveSessionOffline } = await import('@/utils/offlineDB')
        const id = `checkpoint_${Date.now()}`
        const now = new Date().toISOString()
        const pad = n => String(n).padStart(2, '0')
        const d = new Date()
        const date = `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`
        await saveSessionOffline({
          id,
          subjectId:    s.subjectId,
          subjectName:  s.subjectName,
          subjectColor: s.subjectColor,
          startTime:    s.sessionStartTime,
          endTime:      now,
          duration:     newElapsed,
          date,
          notes:        '',
          _checkpoint:  true,
        })
      } catch (_) {}
    }, 60_000)
  }

  function stopCheckpoint() {
    clearInterval(checkpointRef.current)
    checkpointRef.current = null
    lastCheckpointElapsed.current = 0
  }

  // ── auto-end a running manual break the instant study starts ───────────────
  // If the user forgot to tap "End break" (e.g. was on lunch, then just hit
  // Start Study), the break is closed out and saved right here — no dangling
  // break left running in the background, no manual step required.
  function autoEndRunningBreak() {
    const b = useBreakLogStore.getState()
    if (!b.isBreakRunning || !b.breakStartTime) return
    const endTime = new Date().toISOString()
    const duration = Math.floor((new Date(endTime) - new Date(b.breakStartTime)) / 1000)
    b.stopBreak() // clear immediately so the UI reflects it right away
    if (duration >= 5) {
      saveBreak({
        type: b.breakType, label: b.breakLabel,
        startTime: b.breakStartTime, endTime, duration,
        date: getStudyDayString(),
      }).catch(() => {})
    }
  }

  // ── start ──────────────────────────────────────────────────────────────────
  const start = useCallback((subject) => {
    _workerRunning = true
    _saveInProgress = false
    store.start(subject)
    useBreakReminderStore.getState().clearReminder() // ← next-session nudge, if any, dismisses immediately
    autoEndRunningBreak()                             // ← running manual break (e.g. lunch), if any, auto-saves now
    getWorker().postMessage({ type: 'START', payload: { elapsed: 0 } })
    startCheckpoint(subject)
    startHeartbeat()
    startActiveHeartbeat(subject)
    const { dailyGoalSeconds } = useUserStore.getState()
    swPost({
      type: 'TIMER_START',
      payload: { subject: subject?.name || subject?.subjectName || 'Study', elapsed: 0, goalPct: 0 },
    })
  }, [store])

  // ── pause ──────────────────────────────────────────────────────────────────
  const pause = useCallback(() => {
    store.pause()
    getWorker().postMessage({ type: 'PAUSE' })
    swPost({ type: 'TIMER_PAUSE' })
    // Update server active session to show paused state
    const s = useTimerStore.getState()
    sendActiveHeartbeat({
      deviceId: getDeviceId(),
      subjectId: s.subjectId, subjectName: s.subjectName, subjectColor: s.subjectColor,
      startTime: s.sessionStartTime, elapsed: s.elapsed,
      isPaused: true, totalPausedSeconds: s.totalPausedSeconds || 0,
    }).catch(() => {})
  }, [store])

  // ── resume ─────────────────────────────────────────────────────────────────
  const resume = useCallback(() => {
    const s = useTimerStore.getState()
    const current = s.elapsed
    // FIX: pass pausedAt so store accumulates total pause duration correctly
    store.resume(s.pausedAt)
    getWorker().postMessage({ type: 'RESUME', payload: { elapsed: current } })
    swPost({ type: 'TIMER_RESUME', payload: { elapsed: current } })
  }, [store])

  // ── core save ──────────────────────────────────────────────────────────────
  const _saveAndReset = useCallback(async (minSeconds = 10) => {
    if (_saveInProgress) return 0
    _saveInProgress = true

    getWorker().postMessage({ type: 'STOP' })
    _workerRunning = false
    stopHeartbeat()
    stopCheckpoint()
    stopActiveHeartbeat()    // ← clear from server so other devices know timer stopped
    swPost({ type: 'TIMER_STOP' })

    const endTime   = new Date().toISOString()
    const startTime = store.sessionStartTime
    const elapsed   = store.elapsed

    if (!startTime || elapsed < minSeconds) {
      store.reset()
      _saveInProgress = false
      return 0
    }

    // Real session just ended — start the 5-min "next session" nudge on Home.
    // Pure UI reminder, no DB write, nothing here touches session data below.
    useBreakReminderStore.getState().startReminder()

    const splits    = studyDaySplit(startTime, endTime)
    const wallTotal = Math.max(
      Math.round((new Date(endTime) - new Date(startTime)) / 1000),
      elapsed
    )
    let totalSaved = 0

    for (const split of splits) {
      const wallSplit  = Math.round((new Date(split.endTime) - new Date(split.startTime)) / 1000)
      const duration   = splits.length === 1
        ? elapsed
        : Math.round((wallSplit / wallTotal) * elapsed)

      if (duration < 1) continue

      const session = {
        subjectId:    store.subjectId,
        subjectName:  store.subjectName,
        subjectColor: store.subjectColor,
        startTime:    split.startTime,
        endTime:      split.endTime,
        duration,
        date:         split.date,
        notes:        '',
      }

      try {
        if (uid) {
          await saveSession(session)
          totalSaved += duration
        } else {
          addPendingSync(session)
        }
      } catch {
        addPendingSync(session)
      }
    }

    // Group leaderboard update
    if (uid && totalSaved > 0) {
      try {
        const { fetchMyGroups, updateMemberHours } = await import('@/api/groups')
        const myGroups = await fetchMyGroups()
        for (const g of myGroups) {
          updateMemberHours(g._id, totalSaved).catch(() => {})
        }
      } catch (_) {}

      // ── AUTO-REFRESH: Stats page aur Home ko batao session save hua ─────────
      window.dispatchEvent(new CustomEvent('tapasya:session-saved', { detail: { seconds: totalSaved } }))
    }

    // Clean checkpoint records for this session
    try {
      const { getSessionsOffline, deleteSessionOffline } = await import('@/utils/offlineDB')
      const all = await getSessionsOffline()
      const checkpoints = all.filter(s => s._checkpoint)
      for (const cp of checkpoints) {
        await deleteSessionOffline(cp.id || cp._id).catch(() => {})
      }
    } catch (_) {}

    store.reset()
    _saveInProgress = false
    return elapsed
  }, [store, uid])

  const stop      = useCallback(() => _saveAndReset(10), [_saveAndReset])
  const stopOnBack = useCallback(() => _saveAndReset(10), [_saveAndReset])

  // Listen for SW notification action buttons
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return
    function onSwMessage(event) {
      const { type } = event.data || {}
      if (type === 'NOTIF_PAUSE') {
        const s = useTimerStore.getState()
        if (s.isRunning && !s.isPaused) pause()
      }
      if (type === 'NOTIF_STOP') {
        stop()
      }
    }
    navigator.serviceWorker.addEventListener('message', onSwMessage)
    return () => navigator.serviceWorker.removeEventListener('message', onSwMessage)
  }, [pause, stop])

  return { start, pause, resume, stop, stopOnBack }
}

export default useTimer