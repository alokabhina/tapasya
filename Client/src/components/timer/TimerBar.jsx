// src/components/games/TimerBar.jsx
// Full-width animated countdown bar — CSS transition, not JS setInterval
// Turns red at last 5 seconds. Level + question count left, combo badge right.

import { useEffect, useRef, useState } from 'react'

export default function TimerBar({ timeLeft, maxTime, timerPct, timerDanger, level, questionIndex, totalQuestions, streak }) {
  // We animate via CSS transition — width changes trigger smooth slide
  const prevPct = useRef(timerPct)
  const [width, setWidth] = useState(timerPct)

  useEffect(() => {
    // Use rAF to ensure transition fires on every tick
    requestAnimationFrame(() => setWidth(timerPct))
    prevPct.current = timerPct
  }, [timerPct])

  const barColor = timerDanger
    ? 'bg-red-500 shadow-red-500/40'
    : timerPct > 50
      ? 'bg-orange-400 shadow-orange-400/30'
      : 'bg-amber-400 shadow-amber-400/30'

  return (
    <div className="w-full px-4 pt-3 pb-2">
      {/* Top row: level/count left, combo right */}
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-2">
          {level && (
            <span className="text-[10px] font-bold text-orange-400 bg-orange-500/15 px-2 py-0.5 rounded-full border border-orange-500/20">
              L{level}
            </span>
          )}
          <span className="text-[11px] text-slate-400 font-medium">
            {questionIndex + 1} / {totalQuestions}
          </span>
        </div>

        {/* Combo badge */}
        {streak >= 3 && (
          <div
            className="flex items-center gap-1 bg-amber-500/15 border border-amber-500/25 px-2 py-0.5 rounded-full"
            style={{ animation: 'comboBounce 0.3s ease' }}
          >
            <span className="text-[10px] font-bold text-amber-400">🔥 ×{
              streak >= 10 ? '3.0' : streak >= 5 ? '2.0' : '1.5'
            }</span>
          </div>
        )}
      </div>

      {/* Timer bar */}
      <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full shadow-sm transition-all duration-1000 ease-linear ${barColor}`}
          style={{ width: `${Math.max(0, width)}%` }}
        />
      </div>

      {/* Time label */}
      <div className="flex justify-end mt-0.5">
        <span className={`text-[10px] font-mono font-bold ${timerDanger ? 'text-red-400 animate-pulse' : 'text-slate-500'}`}>
          {timeLeft}s
        </span>
      </div>

      <style>{`
        @keyframes comboBounce {
          0%   { transform: scale(1); }
          50%  { transform: scale(1.25); }
          100% { transform: scale(1); }
        }
      `}</style>
    </div>
  )
}