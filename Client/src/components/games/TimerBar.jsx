// src/components/games/TimerBar.jsx
// Gamified timer bar — animated gradient, danger pulse, level pill, combo badge
// Thin segmented progress dots + smooth color transition

export default function TimerBar({ timeLeft, maxTime, level, currentIndex, totalQuestions, streak }) {
  const pct     = maxTime > 0 ? (timeLeft / maxTime) * 100 : 0
  const danger  = timeLeft <= 5
  const warning = timeLeft <= Math.ceil(maxTime * 0.4)

  // Combo multiplier
  let multiplier = null
  if      (streak >= 10) multiplier = { label: '3×', from: '#a855f7', to: '#7c3aed' }
  else if (streak >= 5)  multiplier = { label: '2×', from: '#f97316', to: '#ef4444' }
  else if (streak >= 3)  multiplier = { label: '1.5×', from: '#eab308', to: '#ca8a04' }

  // Bar color
  const barColor = danger
    ? { from: '#ef4444', to: '#dc2626' }
    : warning
    ? { from: '#f59e0b', to: '#d97706' }
    : { from: '#f97316', to: '#fb923c' }

  return (
    <div
      className="w-full px-4 pt-4 pb-3 flex-shrink-0"
      style={{
        background: 'linear-gradient(180deg, rgba(8,13,26,0.95) 0%, transparent 100%)',
      }}
    >
      {/* ── Info row ──────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-2.5">
        {/* Left: level + question count */}
        <div className="flex items-center gap-2">
          {level != null && (
            <span
              className="text-[11px] font-black px-2.5 py-1 rounded-lg tracking-wide"
              style={{
                background: 'linear-gradient(135deg, #f97316, #fb923c)',
                color: '#fff',
                boxShadow: '0 2px 8px rgba(249,115,22,0.35)',
              }}
            >
              L{level}
            </span>
          )}
          <div className="flex items-center gap-1.5">
            <span className="text-slate-300 text-xs font-bold tabular-nums">
              {currentIndex + 1}
            </span>
            <span className="text-slate-600 text-xs">/</span>
            <span className="text-slate-500 text-xs tabular-nums">{totalQuestions}</span>
          </div>
        </div>

        {/* Right: combo OR streak count */}
        {multiplier ? (
          <span
            key={streak}
            className="flex items-center gap-1.5 text-white text-xs font-black px-3 py-1 rounded-full"
            style={{
              background:  `linear-gradient(135deg, ${multiplier.from}, ${multiplier.to})`,
              boxShadow:   `0 2px 10px ${multiplier.from}55`,
              animation:   'comboPop 0.35s cubic-bezier(0.34,1.56,0.64,1) both',
            }}
          >
            🔥 {multiplier.label} COMBO
          </span>
        ) : streak > 0 ? (
          <span
            className="flex items-center gap-1 text-orange-400/80 text-xs font-semibold"
            style={{ animation: 'fadeIn 0.2s ease' }}
          >
            🔥 {streak} streak
          </span>
        ) : null}
      </div>

      {/* ── Timer bar ─────────────────────────────────────────────── */}
      <div
        className="relative h-2.5 w-full rounded-full overflow-hidden"
        style={{ background: 'rgba(255,255,255,0.06)' }}
      >
        {/* Fill */}
        <div
          className="absolute inset-y-0 left-0 rounded-full"
          style={{
            width:      `${pct}%`,
            background: `linear-gradient(90deg, ${barColor.from}, ${barColor.to})`,
            boxShadow:  `0 0 8px ${barColor.from}80`,
            transition: 'width 1s linear, background 0.5s ease, box-shadow 0.5s ease',
            animation:  danger ? 'dangerPulse 0.6s ease infinite alternate' : 'none',
          }}
        />

        {/* Shimmer overlay */}
        <div
          className="absolute inset-0 rounded-full pointer-events-none"
          style={{
            background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.12) 50%, transparent 100%)',
            backgroundSize: '60% 100%',
            animation: 'shimmerBar 2s ease infinite',
          }}
        />
      </div>

      {/* ── Time counter ──────────────────────────────────────────── */}
      <div className="flex justify-end mt-1.5">
        <span
          className="text-xs font-mono font-bold tabular-nums"
          style={{
            color:      danger  ? '#f87171' : warning ? '#fbbf24' : '#64748b',
            animation:  danger  ? 'dangerText 0.5s ease infinite alternate' : 'none',
            transition: 'color 0.4s ease',
          }}
        >
          {timeLeft}s
        </span>
      </div>

      <style>{`
        @keyframes comboPop {
          0%   { transform: scale(0.6) translateY(4px); opacity: 0 }
          70%  { transform: scale(1.15) translateY(-1px); opacity: 1 }
          100% { transform: scale(1) translateY(0); opacity: 1 }
        }
        @keyframes dangerPulse {
          from { box-shadow: 0 0 6px rgba(239,68,68,0.4) }
          to   { box-shadow: 0 0 16px rgba(239,68,68,0.8) }
        }
        @keyframes dangerText {
          from { opacity: 1 }
          to   { opacity: 0.5 }
        }
        @keyframes shimmerBar {
          0%   { background-position: -60% 0 }
          100% { background-position: 160% 0 }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateX(4px) }
          to   { opacity: 1; transform: translateX(0) }
        }
        @keyframes shakeX {
          0%,100% { transform: translateX(0) }
          20%     { transform: translateX(-5px) }
          40%     { transform: translateX(5px) }
          60%     { transform: translateX(-4px) }
          80%     { transform: translateX(4px) }
        }
        @keyframes popIn {
          0%   { transform: scale(0.5); opacity: 0 }
          70%  { transform: scale(1.2) }
          100% { transform: scale(1);  opacity: 1 }
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(6px) }
          to   { opacity: 1; transform: translateY(0) }
        }
      `}</style>
    </div>
  )
}