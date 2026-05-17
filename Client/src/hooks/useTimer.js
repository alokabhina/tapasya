// src/hooks/useTimer.js
// FIXED BUGS:
// 1. Double session save — _saveInProgress guard added
// 2. Paused time counted in elapsed on reload — pausedAccum tracked in store
// 3. Worker re-START on every mount (Home + Timer both mount useTimer) — workerStarted ref

import { useEffect, useRef, useCallback } from 'react'
import useTimerStore from '@/store/timerStore'
import useUserStore from '@/store/userStore'
import { saveSession, addPendingSync } from '@/api/sessions'
import { updateMemberHours } from '@/api/groups'
import { midnightSplit } from '@/utils/time'
import { sendHeartbeat, sendOffline } from '@/api/groups'

// ── Singleton worker ──────────────────────────────────────────────────────────
let _worker = null
// Guard: worker already started (prevents double-START from Home + Timer mounting)
let _workerRunning = false
// Guard: save already in progress (prevents double-save on fast double-click)
let _saveInProgress = false

function getWorker() {
  if (!_worker) {
    _worker = new Worker('/timer.worker.js')
    // Single global onmessage — never overwritten
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

    // If timer is running (persisted from store) but worker not yet started this session
    if (s.isRunning && !s.isPaused && s.sessionStartTime && !_workerRunning) {
      _workerRunning = true
      // BUG FIX: use store's elapsed (which was ticking before reload), NOT wall-clock diff
      // Wall-clock diff includes paused time — store.elapsed is the pure study time
      worker.postMessage({ type: 'START', payload: { elapsed: s.elapsed } })
    }

    return () => {}
  }, [])

  // Live timer — SW ko sirf events bhejo (TIMER_START/PAUSE/RESUME/STOP)
  // SW apne andar setInterval chalata hai — no per-second app→SW messages needed
  useEffect(() => {
    async function notifySwState() {
      if (!('serviceWorker' in navigator)) return
      try {
        const sw = await navigator.serviceWorker.ready
        if (!sw.active) return
        const s = useTimerStore.getState()
        const { dailyGoalSeconds } = useUserStore.getState()
        const goalPct = dailyGoalSeconds > 0 ? (s.elapsed / dailyGoalSeconds) * 100 : 0

        if (!s.isRunning) {
          sw.active.postMessage({ type: 'TIMER_STOP' })
        } else if (s.isPaused) {
          sw.active.postMessage({ type: 'TIMER_PAUSE' })
        } else {
          sw.active.postMessage({
            type: 'TIMER_START',
            payload: {
              subject: s.subjectName || 'Study',
              elapsed: s.elapsed,
              goalPct,
            },
          })
        }
      } catch (_) {}
    }
    notifySwState()
  }, [store.isRunning, store.isPaused])

  // ── start ─────────────────────────────────────────────────────────────────
  // ── heartbeat to group (timer chal raha ho tab) ──────────────────────────
  const heartbeatRef = useRef(null)

  function startHeartbeat() {
    clearInterval(heartbeatRef.current)
    heartbeatRef.current = setInterval(async () => {
      const s = useTimerStore.getState()
      if (!s.isRunning) return
      try {
        // Sare groups ko heartbeat bhejo
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
    }, 10_000) // har 10 second
  }

  function stopHeartbeat() {
    clearInterval(heartbeatRef.current)
    // Sare groups ko offline mark karo
    import('@/api/groups').then(({ fetchMyGroups, sendOffline: offlineApi }) => {
      fetchMyGroups().then(groups => {
        groups.forEach(g => offlineApi(g._id).catch(() => {}))
      }).catch(() => {})
    }).catch(() => {})
  }

  const start = useCallback((subject) => {
    _workerRunning = true
    _saveInProgress = false
    store.start(subject)
    getWorker().postMessage({ type: 'START', payload: { elapsed: 0 } })
    startHeartbeat()
  }, [store])

  // ── pause ─────────────────────────────────────────────────────────────────
  const pause = useCallback(async () => {
    store.pause()
    getWorker().postMessage({ type: 'PAUSE' })
    // SW ko bhi batao — woh apna interval rok dega
    if ('serviceWorker' in navigator) {
      try {
        const sw = await navigator.serviceWorker.ready
        sw.active?.postMessage({ type: 'TIMER_PAUSE' })
      } catch (_) {}
    }
  }, [store])

  // ── resume ────────────────────────────────────────────────────────────────
  const resume = useCallback(async () => {
    const current = useTimerStore.getState().elapsed
    store.resume()
    getWorker().postMessage({ type: 'RESUME', payload: { elapsed: current } })
    // SW ko resume batao with latest elapsed
    if ('serviceWorker' in navigator) {
      try {
        const sw = await navigator.serviceWorker.ready
        sw.active?.postMessage({ type: 'TIMER_RESUME', payload: { elapsed: current } })
      } catch (_) {}
    }
  }, [store])

  // ── core save ─────────────────────────────────────────────────────────────
  const _saveAndReset = useCallback(async (minSeconds = 10) => {
    // BUG FIX: prevent double-save (e.g. stop called twice quickly)
    if (_saveInProgress) return 0
    _saveInProgress = true

    getWorker().postMessage({ type: 'STOP' })
    _workerRunning = false
    stopHeartbeat()
    // SW live timer band karo
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then((sw) => {
        sw.active?.postMessage({ type: 'TIMER_STOP' })
      }).catch(() => {})
    }

    const endTime   = new Date().toISOString()
    const startTime = store.sessionStartTime
    // elapsed = actual study time from worker (pauses already excluded by worker)
    const elapsed   = store.elapsed

    if (!startTime || elapsed < minSeconds) {
      store.reset()
      _saveInProgress = false
      return 0
    }

    const splits    = midnightSplit(startTime, endTime)
    const wallTotal = Math.max(
      Math.round((new Date(endTime) - new Date(startTime)) / 1000),
      elapsed
    )
    let totalSaved = 0

    for (const split of splits) {
      const wallSplit  = Math.round((new Date(split.endTime) - new Date(split.startTime)) / 1000)
      // Proportional actual study time — elapsed is the true value, wall-clock only used for split ratio
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
        duration,         // ✅ pure study time, no paused durations
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
      const { groupId } = useUserStore.getState()
      if (groupId) {
        try { await updateMemberHours(uid, groupId, totalSaved) }
        catch (e) { console.warn('Group hours update failed:', e.message) }
      }
    }

    store.reset()
    _saveInProgress = false
    return elapsed
  }, [store, uid])

  const stop      = useCallback(() => _saveAndReset(10), [_saveAndReset])
  const stopOnBack = useCallback(() => _saveAndReset(10), [_saveAndReset])

  // Listen for messages FROM SW (notification action buttons)
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