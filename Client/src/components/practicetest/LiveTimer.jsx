// src/components/practicetest/LiveTimer.jsx
// Section countdown pill. Owns its own 1-second state so the rest of the
// engine (question text, options, palette) does NOT re-render every tick —
// that was the main lag source on low-RAM phones (old useCountdown ticked
// the whole page every 100ms).
//
// Deadline-based (deadlineRef = epoch ms), so it stays correct even if the
// browser throttles timers in a background tab. Pausing freezes the display;
// the parent pushes the deadline forward on resume.

import { useEffect, useRef, useState } from 'react'

function fmt(totalSeconds) {
  const s = Math.max(0, totalSeconds || 0)
  const m = Math.floor(s / 60)
  return `${String(m).padStart(2, '0')} : ${String(s % 60).padStart(2, '0')}`
}

export default function LiveTimer({ deadlineRef, paused, resetKey, onExpire, lowSec = 120 }) {
  const calc = () => Math.max(0, Math.ceil((deadlineRef.current - Date.now()) / 1000))
  const [secs, setSecs] = useState(calc)
  const expiredRef = useRef(false)
  const onExpireRef = useRef(onExpire)
  onExpireRef.current = onExpire

  useEffect(() => {
    expiredRef.current = false
    setSecs(calc())
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetKey])

  useEffect(() => {
    if (paused) return
    const tick = () => {
      const left = calc()
      setSecs(left) // same value => React bails out, no re-render
      if (left <= 0 && !expiredRef.current) {
        expiredRef.current = true
        onExpireRef.current?.()
      }
    }
    tick()
    const id = setInterval(tick, 500)
    const onVis = () => { if (!document.hidden) tick() }
    document.addEventListener('visibilitychange', onVis)
    return () => { clearInterval(id); document.removeEventListener('visibilitychange', onVis) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paused, resetKey])

  const isLow = secs <= lowSec
  return (
    <div
      className={`flex items-center gap-1.5 px-2.5 sm:px-3 h-8 rounded-lg border font-mono text-xs sm:text-[13px] font-bold tabular-nums whitespace-nowrap ${
        isLow ? 'border-red-400 text-red-600 bg-red-50' : 'border-slate-300 text-slate-700 bg-slate-50'
      }`}
    >
      <i className="ti ti-clock text-base hidden sm:inline" />
      <span className="hidden md:inline font-sans text-xs font-semibold text-slate-500">Time Left:</span>
      {fmt(secs)}
    </div>
  )
}