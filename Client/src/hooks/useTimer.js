// src/hooks/useTimer.js
// FIXED BUGS:
// 1. Double session save — _saveInProgress guard added
// 2. Paused time counted in elapsed on reload — pausedAccum tracked in store
// 3. Worker re-START on every mount (Home + Timer both mount useTimer) — workerStarted ref

import { useEffect, useRef, useCallback } from 'react'
import useTimerStore from '@/store/timerStore'
import useUserStore from '@/store/userStore'
import { saveSession, addPendingSync } from '@/api/sessions'
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

  // SW helper — send message to active SW
  function swPost(msg) {
    if (!('serviceWorker' in navigator)) return
    // controller = already active SW (fastest path)
    if (navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage(msg)
      return
    }
    // Fallback: wait for SW to be ready
    navigator.serviceWorker.ready.then((reg) => {
      if (reg.active) reg.active.postMessage(msg)
    }).catch(() => {})
  }

  // On mount: agar timer already running tha (page reload) — SW ko batao
  useEffect(() => {
    const s = useTimerStore.getState()
    if (s.isRunning && !s.isPaused && s.subjectName) {
      const { dailyGoalSeconds } = useUserStore.getState()
      const goalPct = dailyGoalSeconds > 0 ? (s.elapsed / dailyGoalSeconds) * 100 : 0
      swPost({ type: 'TIMER_START', payload: { subject: s.subjectName, elapsed: s.elapsed, goalPct } })
    }
  }, [])

  // Re-sync elapsed from wall-clock when tab becomes visible again
  // (browser throttles workers in background tabs — this corrects drift)
  useEffect(() => {
    function onVisible() {
      const s = useTimerStore.getState()
      if (!s.isRunning || s.isPaused || !s.sessionStartTime) return
      // Recalculate elapsed from wall-clock start time
      const wallElapsed = Math.round((Date.now() - new Date(s.sessionStartTime).getTime()) / 1000)
      // Only update if wall-clock is significantly ahead (>5s drift) — means worker was throttled
      if (wallElapsed > s.elapsed + 5) {
        useTimerStore.getState().setElapsed(wallElapsed)
        getWorker().postMessage({ type: 'RESUME', payload: { elapsed: wallElapsed } })
      }
    }
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') onVisible()
    })
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [])

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

  // ── checkpoint auto-save (every 60s) ────────────────────────────────────
  // Saves a partial session to IndexedDB every minute so data is never lost
  // if the tab crashes or is killed. On real stop(), full save happens as usual.
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
      if (delta < 30) return // min 30s increment worth saving
      lastCheckpointElapsed.current = newElapsed

      // Save incremental seconds to offline DB only (no server spam)
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
          _checkpoint:  true, // marked so real save can replace it
        })
      } catch (_) {}
    }, 60_000) // every 60 seconds
  }

  function stopCheckpoint() {
    clearInterval(checkpointRef.current)
    checkpointRef.current = null
    lastCheckpointElapsed.current = 0
  }

  const start = useCallback((subject) => {
    _workerRunning = true
    _saveInProgress = false
    store.start(subject)
    getWorker().postMessage({ type: 'START', payload: { elapsed: 0 } })
    startCheckpoint(subject)
    startHeartbeat()
    // SW ko directly batao — no useEffect race condition
    const { dailyGoalSeconds } = useUserStore.getState()
    const goalPct = dailyGoalSeconds > 0 ? 0 : 0 // fresh start = 0%
    swPost({
      type: 'TIMER_START',
      payload: { subject: subject?.name || subject?.subjectName || 'Study', elapsed: 0, goalPct },
    })
  }, [store])

  // ── pause ─────────────────────────────────────────────────────────────────
  const pause = useCallback(() => {
    store.pause()
    getWorker().postMessage({ type: 'PAUSE' })
    swPost({ type: 'TIMER_PAUSE' })
  }, [store])

  // ── resume ────────────────────────────────────────────────────────────────
  const resume = useCallback(() => {
    const current = useTimerStore.getState().elapsed
    store.resume()
    getWorker().postMessage({ type: 'RESUME', payload: { elapsed: current } })
    swPost({ type: 'TIMER_RESUME', payload: { elapsed: current } })
  }, [store])

  // ── core save ─────────────────────────────────────────────────────────────
  const _saveAndReset = useCallback(async (minSeconds = 10) => {
    // BUG FIX: prevent double-save (e.g. stop called twice quickly)
    if (_saveInProgress) return 0
    _saveInProgress = true

    getWorker().postMessage({ type: 'STOP' })
    _workerRunning = false
    stopHeartbeat()
    stopCheckpoint()
    swPost({ type: 'TIMER_STOP' })

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

    // Group leaderboard update — custom event dispatch karo
    // useGroup hook ka addSessionHours handle karega (sare groups ke liye)
    if (uid && totalSaved > 0) {
      window.dispatchEvent(new CustomEvent('tapasya:session-saved', { detail: { seconds: totalSaved } }))
    }

    // Clean up any checkpoint records for this session (real save succeeded)
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