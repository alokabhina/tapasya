// src/components/games/ComboDisplay.jsx
// Gamified bottom bar — score + animated combo badge
// XP burst on combo milestone, smooth count-up

import { useEffect, useRef, useState } from 'react'

export default function ComboDisplay({ streak, score }) {
  const [displayScore, setDisplay] = useState(0)
  const prevScore = useRef(0)
  const [burst, setBurst] = useState(false)

  // Smooth score count-up
  useEffect(() => {
    const target = Math.max(0, score)
    if (target <= prevScore.current) {
      setDisplay(target)
      prevScore.current = target
      return
    }
    const diff = target - prevScore.current
    const step = Math.max(1, Math.ceil(diff / 10))
    let current = prevScore.current
    const interval = setInterval(() => {
      current = Math.min(current + step, target)
      setDisplay(current)
      if (current >= target) {
        clearInterval(interval)
        prevScore.current = target
      }
    }, 30)
    return () => clearInterval(interval)
  }, [score])

  // Burst animation on combo milestones
  const prevStreak = useRef(0)
  useEffect(() => {
    if (streak > prevStreak.current && (streak === 3 || streak === 5 || streak === 10)) {
      setBurst(true)
      setTimeout(() => setBurst(false), 600)
    }
    prevStreak.current = streak
  }, [streak])

  // Combo tier
  const comboTier =
    streak >= 10 ? { label: `${streak} ULTRA`, bg: 'linear-gradient(135deg,#a855f7,#7c3aed)', shadow: 'rgba(168,85,247,0.4)' } :
    streak >= 5  ? { label: `${streak} FIRE`,  bg: 'linear-gradient(135deg,#f97316,#ef4444)', shadow: 'rgba(249,115,22,0.4)' } :
    streak >= 3  ? { label: `${streak} HOT`,   bg: 'linear-gradient(135deg,#eab308,#f97316)', shadow: 'rgba(234,179,8,0.35)' } :
    null

  return (
    <div
      className="flex items-center justify-between px-5 py-3 flex-shrink-0 relative overflow-hidden"
      style={{
        background:  'linear-gradient(180deg, rgba(8,13,26,0.0) 0%, rgba(8,13,26,0.98) 30%)',
        borderTop:   '1px solid rgba(255,255,255,0.05)',
      }}
    >
      {/* Score */}
      <div className="flex items-baseline gap-1.5">
        <span className="text-slate-500 text-xs font-semibold uppercase tracking-wide">Score</span>
        <span
          className="text-white font-black text-2xl tabular-nums"
          style={{ fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em' }}
        >
          {displayScore}
        </span>
      </div>

      {/* Combo badge */}
      <div className="flex items-center gap-2">
        {comboTier ? (
          <span
            key={streak}
            className="flex items-center gap-1.5 text-white text-xs font-black px-3 py-1.5 rounded-full"
            style={{
              background: comboTier.bg,
              boxShadow:  `0 2px 14px ${comboTier.shadow}`,
              animation:  `comboBounce 0.4s cubic-bezier(0.34,1.56,0.64,1) both`,
            }}
          >
            🔥 {comboTier.label}
          </span>
        ) : streak > 0 ? (
          <span className="text-slate-500 text-xs font-semibold">
            {streak} in a row
          </span>
        ) : (
          <span className="text-slate-700 text-xs">No streak</span>
        )}
      </div>

      {/* Burst ring — milestone animation */}
      {burst && (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ animation: 'burstRing 0.6s ease both' }}
        >
          <div className="absolute inset-0 rounded-full bg-orange-500/10" />
        </div>
      )}

      <style>{`
        @keyframes comboBounce {
          0%   { transform: scale(0.5) translateY(6px); opacity: 0 }
          65%  { transform: scale(1.2) translateY(-2px); opacity: 1 }
          100% { transform: scale(1)   translateY(0);   opacity: 1 }
        }
        @keyframes burstRing {
          0%   { opacity: 0.8; transform: scale(1) }
          100% { opacity: 0;   transform: scale(1.5) }
        }
      `}</style>
    </div>
  )
}