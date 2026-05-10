import { useEffect, useRef } from 'react'
import useTimerStore from '@/store/timerStore'
import useUserStore from '@/store/userStore'
// ✅ FIX: '@/firebase/sessions' → '@/api/sessions'
// ✅ FIX: getPendingSync, clearPendingSync ab api/sessions.js mein exist karte hain
import { saveSession, getPendingSync, clearPendingSync } from '@/api/sessions'

const SAVE_KEY = 'tapasya_session_checkpoint'

export function useSession() {
  const store = useTimerStore()
  const { uid } = useUserStore()
  const intervalRef = useRef(null)

  // Har 5 second mein timer state localStorage mein save karo
  useEffect(() => {
    intervalRef.current = setInterval(() => {
      if (store.isRunning || store.isPaused) {
        localStorage.setItem(
          SAVE_KEY,
          JSON.stringify({
            isRunning: store.isRunning,
            isPaused: store.isPaused,
            elapsed: store.elapsed,
            subjectId: store.subjectId,
            subjectName: store.subjectName,
            subjectColor: store.subjectColor,
            sessionStartTime: store.sessionStartTime,
            savedAt: new Date().toISOString(),
          })
        )
      }
    }, 5000)
    return () => clearInterval(intervalRef.current)
  }, [store.isRunning, store.isPaused, store.elapsed])

  // Timer stop/reset hone pe checkpoint clear karo
  useEffect(() => {
    if (!store.isRunning && !store.isPaused) {
      localStorage.removeItem(SAVE_KEY)
    }
  }, [store.isRunning, store.isPaused])

  function checkCrashRecovery() {
    try {
      const raw = localStorage.getItem(SAVE_KEY)
      if (!raw) return null
      const checkpoint = JSON.parse(raw)
      const diffMinutes = (new Date() - new Date(checkpoint.savedAt)) / 1000 / 60
      if (diffMinutes > 60 * 24) { localStorage.removeItem(SAVE_KEY); return null }
      return checkpoint
    } catch { return null }
  }

  function resumeFromCheckpoint(checkpoint) {
    store.start({ id: checkpoint.subjectId, name: checkpoint.subjectName, color: checkpoint.subjectColor })
    useTimerStore.setState({ elapsed: checkpoint.elapsed, sessionStartTime: checkpoint.sessionStartTime })
  }

  function discardCheckpoint() {
    localStorage.removeItem(SAVE_KEY)
  }

  // Online hone pe pending sessions sync karo
  async function syncPendingSessions() {
    if (!uid) return
    const pending = getPendingSync()
    if (!pending.length) return
    try {
      // ✅ FIX: saveSession(uid, s) → saveSession(s) — JWT se uid milta hai server ko
      await Promise.all(pending.map((s) => saveSession(s)))
      clearPendingSync()
    } catch (err) {
      console.error('Sync failed:', err)
    }
  }

  useEffect(() => {
    window.addEventListener('online', syncPendingSessions)
    return () => window.removeEventListener('online', syncPendingSessions)
  }, [uid])

  return { checkCrashRecovery, resumeFromCheckpoint, discardCheckpoint, syncPendingSessions }
}
