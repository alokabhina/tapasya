// src/hooks/useAutoStudyTimer.js
// Practice test shuru hote hi: agar koi study timer pehle se ON nahi hai to
// background me apne-aap ek subject ka timer ON kar do (screen pe kuch nahi
// dikhta). Subject test ke naam se match hota hai (Quant test -> Quant);
// naam mismatch ho to bhi koi ek subject pe chal jata hai.
//
// Timer sirf tab stop/pause/resume hota hai jab ISI test ne use start kiya ho —
// user ne pehle se jo timer chalaya tha, usko hum kabhi nahi chhedte.

import { useCallback, useRef } from 'react'
import { useTimer } from '@/hooks/useTimer'
import useTimerStore from '@/store/timerStore'
import useSubjectStore from '@/store/subjectStore'
import { getSubjects } from '@/api/subjects'
import { matchStudySubject } from '@/utils/matchStudySubject'

// Reload ke baad bhi yaad rahe ki kaunsi attempt ne timer start kiya tha
const FLAG_KEY = 'tapasya_autotimer_attempt'

function readFlag() {
  try { return localStorage.getItem(FLAG_KEY) } catch { return null }
}
function writeFlag(v) {
  try { v ? localStorage.setItem(FLAG_KEY, v) : localStorage.removeItem(FLAG_KEY) } catch { /* ignore */ }
}

export default function useAutoStudyTimer(attemptId) {
  const timer = useTimer()
  // useTimer ke callbacks har render pe fresh store snapshot pakadte hain —
  // async code me stale na ho isliye hamesha latest ref se call karte hain.
  const timerRef = useRef(timer)
  timerRef.current = timer
  const triedRef = useRef(null)

  const ownsTimer = useCallback(() => {
    const s = useTimerStore.getState()
    return readFlag() === String(attemptId) && (s.isRunning || s.isPaused)
  }, [attemptId])

  // names: priority order — [practice subject name, test title, ...section names]
  const ensureRunning = useCallback(async (names) => {
    if (!attemptId || triedRef.current === attemptId) return
    triedRef.current = attemptId

    const s = useTimerStore.getState()
    if (s.isRunning || s.isPaused) return // timer pehle se ON hai — kuch nahi karna

    try {
      let subjects = useSubjectStore.getState().subjects
      if (!subjects || subjects.length === 0) {
        subjects = await getSubjects() // API, offline ho to IndexedDB fallback
      }
      // await ke dauran user ne khud timer chala diya ho to chhod do
      const now = useTimerStore.getState()
      if (now.isRunning || now.isPaused) return

      const { subject } = matchStudySubject(names, subjects)
      if (!subject) return // user ke paas koi subject hi nahi — start nahi kar sakte
      writeFlag(String(attemptId))
      timerRef.current.start({ ...subject, id: subject.id || subject._id })
    } catch { /* background feature hai — fail ho to test pe asar nahi */ }
  }, [attemptId])

  const pauseIfOwned = useCallback(() => {
    const s = useTimerStore.getState()
    if (ownsTimer() && s.isRunning && !s.isPaused) timerRef.current.pause()
  }, [ownsTimer])

  const resumeIfOwned = useCallback(() => {
    const s = useTimerStore.getState()
    if (ownsTimer() && s.isPaused) timerRef.current.resume()
  }, [ownsTimer])

  const stopIfOwned = useCallback(async () => {
    if (!ownsTimer()) return
    writeFlag(null)
    try { await timerRef.current.stop() } catch { /* ignore */ }
  }, [ownsTimer])

  return { ensureRunning, pauseIfOwned, resumeIfOwned, stopIfOwned }
}