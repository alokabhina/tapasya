// src/hooks/useTimer.js
// FIX: Session save ke baad group hours update hota hai (addSessionHours)
// Back navigation auto-stops timer; <10 sec sessions are discarded

import { useEffect, useRef, useCallback } from 'react'
import useTimerStore from '@/store/timerStore'
import useUserStore from '@/store/userStore'
import { saveSession, addPendingSync } from '@/api/sessions'
import { updateMemberHours } from '@/api/groups'
import { midnightSplit } from '@/utils/time'

let _worker = null

function getWorker() {
  if (!_worker) _worker = new Worker('/timer.worker.js')
  return _worker
}

export function useTimer() {
  const store = useTimerStore()
  const { uid } = useUserStore()
  const listenerAttached = useRef(false)

  useEffect(() => {
    const worker = getWorker()

    if (!listenerAttached.current) {
      listenerAttached.current = true
      worker.onmessage = (e) => {
        if (e.data.type === 'TICK') {
          useTimerStore.getState().setElapsed(e.data.elapsed)
        }
      }
    }

    // Resume worker if timer was running on page reload
    const s = useTimerStore.getState()
    if (s.isRunning && !s.isPaused && s.sessionStartTime) {
      const alreadyElapsed = Math.round((Date.now() - new Date(s.sessionStartTime).getTime()) / 1000)
      worker.postMessage({ type: 'START', payload: { elapsed: alreadyElapsed } })
    }

    return () => {}
  }, [])

  const start = useCallback((subject) => {
    store.start(subject)
    getWorker().postMessage({ type: 'START', payload: { elapsed: 0 } })
  }, [store])

  const pause = useCallback(() => {
    store.pause()
    getWorker().postMessage({ type: 'PAUSE' })
  }, [store])

  const resume = useCallback(() => {
    store.resume()
    getWorker().postMessage({ type: 'RESUME', payload: { elapsed: store.elapsed } })
  }, [store])

  // Core save logic
  const _saveAndReset = useCallback(async (minSeconds = 10) => {
    getWorker().postMessage({ type: 'STOP' })

    const endTime   = new Date().toISOString()
    const startTime = store.sessionStartTime
    const elapsed   = store.elapsed

    // Discard sessions shorter than minSeconds
    if (!startTime || elapsed < minSeconds) {
      store.reset()
      return 0
    }

    const splits = midnightSplit(startTime, endTime)
    let totalSaved = 0

    for (const split of splits) {
      const duration = Math.round((new Date(split.endTime) - new Date(split.startTime)) / 1000)
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

    // FIX: Group leaderboard update karo — session ke total seconds bhejo
    if (uid && totalSaved > 0) {
      const { groupId } = useUserStore.getState()
      if (groupId) {
        try {
          await updateMemberHours(uid, groupId, totalSaved)
        } catch (e) {
          console.warn('Group hours update failed (non-critical):', e.message)
        }
      }
    }

    store.reset()
    return elapsed
  }, [store, uid])

  // Full stop — saves if >= 10 sec
  const stop = useCallback(() => _saveAndReset(10), [_saveAndReset])

  // Called when user navigates back — stops + discards if < 10 sec
  const stopOnBack = useCallback(() => _saveAndReset(10), [_saveAndReset])

  return { start, pause, resume, stop, stopOnBack }
}

export default useTimer