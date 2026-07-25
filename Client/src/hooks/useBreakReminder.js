// src/hooks/useBreakReminder.js
import { useEffect, useState } from 'react'
import useBreakReminderStore from '@/store/breakReminderStore'

const NUDGE_SECONDS = 5 * 60        // base countdown length
const AUTO_HIDE_AFTER = 2 * 60 * 60 // give up nudging 2h after it would've ended — not useful by then

export function useBreakReminder() {
  const anchorAt = useBreakReminderStore((s) => s.anchorAt)
  const extraSeconds = useBreakReminderStore((s) => s.extraSeconds)
  const [, force] = useState(0)

  useEffect(() => {
    if (!anchorAt) return
    const id = setInterval(() => force((n) => n + 1), 1000)
    return () => clearInterval(id)
  }, [anchorAt])

  if (!anchorAt) return null

  const elapsed = Math.floor((Date.now() - new Date(anchorAt).getTime()) / 1000)
  const total = NUDGE_SECONDS + extraSeconds
  if (elapsed > total + AUTO_HIDE_AFTER) return null

  if (elapsed < total) {
    return { phase: 'countdown', seconds: total - elapsed }
  }
  return { phase: 'overdue', seconds: elapsed - total }
}

export function formatMMSS(totalSeconds) {
  const m = Math.floor(totalSeconds / 60)
  const s = totalSeconds % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

export default useBreakReminder