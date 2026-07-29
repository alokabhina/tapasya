// src/hooks/useCountdown.js
// Simple per-question countdown. Ticks every 100ms for a smooth bar,
// exposes whole-second value for display. Calls onExpire once when it hits 0.

import { useEffect, useRef, useState } from 'react'

export default function useCountdown(seconds, onExpire, resetKey) {
  const [msLeft, setMsLeft] = useState(seconds * 1000)
  const expiredRef = useRef(false)
  const startRef    = useRef(Date.now())

  useEffect(() => {
    setMsLeft(seconds * 1000)
    expiredRef.current = false
    startRef.current = Date.now()

    const interval = setInterval(() => {
      const elapsed = Date.now() - startRef.current
      const left = Math.max(0, seconds * 1000 - elapsed)
      setMsLeft(left)
      if (left <= 0 && !expiredRef.current) {
        expiredRef.current = true
        clearInterval(interval)
        onExpire?.()
      }
    }, 100)

    return () => clearInterval(interval)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetKey, seconds])

  const elapsedMs = () => Date.now() - startRef.current

  return { secondsLeft: Math.ceil(msLeft / 1000), msLeft, elapsedMs }
}