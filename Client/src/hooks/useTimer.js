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

  // Live timer notification — SW ko har second message bhejo
  // SW same tag use karta hai to notification update in-place hoti hai (no pop/sound)
  useEffect(() => {
    if (!store.isRunning || store.isPaused) {
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.ready.then((sw) => {
          sw.active?.postMessage({ type: 'TIMER_STOP' })
        }).catch(() => {})
      }
      clearInterval(notifIntervalRef.current)
      return
    }

    async function sendTick() {
      if (!('serviceWorker' in navigator)) return
      try {
        const sw = await navigator.serviceWorker.ready
        if (!sw.active) return
        const s = useTimerStore.getState()
        const { dailyGoalSeconds } = useUserStore.getState()
        const goalPct = dailyGoalSeconds > 0 ? (s.elapsed / dailyGoalSeconds) * 100 : 0
        sw.active.postMessage({
          type: 'TIMER_TICK',
          payload: {
            subject:   s.subjectName || 'Study',
            elapsed:   s.elapsed,
            todayDone: s.elapsed,
            goalPct,
          },
        })
      } catch (_) {}
    }

    sendTick()
    notifIntervalRef.current = setInterval(sendTick, 1000)
    return () => clearInterval(notifIntervalRef.current)
  }, [store.isRunning, store.isPaused])

  // ── start ─────────────────────────────────────────────────────────────────
  const start = useCallback((subject) => {
    _workerRunning = true
    _saveInProgress = false
    store.start(subject)
    getWorker().postMessage({ type: 'START', payload: { elapsed: 0 } })
  }, [store])

  // ── pause ─────────────────────────────────────────────────────────────────
  const pause = useCallback(() => {
    store.pause()
    getWorker().postMessage({ type: 'PAUSE' })
  }, [store])

  // ── resume ────────────────────────────────────────────────────────────────
  const resume = useCallback(() => {
    // BUG FIX: pass current elapsed to worker so it continues from exact same value
    // Previously elapsed could drift if worker was re-created
    const current = useTimerStore.getState().elapsed
    store.resume()
    getWorker().postMessage({ type: 'RESUME', payload: { elapsed: current } })
  }, [store])

  // ── core save ─────────────────────────────────────────────────────────────
  const _saveAndReset = useCallback(async (minSeconds = 10) => {
    // BUG FIX: prevent double-save (e.g. stop called twice quickly)
    if (_saveInProgress) return 0
    _saveInProgress = true

    getWorker().postMessage({ type: 'STOP' })
    _workerRunning = false

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

  return { start, pause, resume, stop, stopOnBack }
}

export default useTimer