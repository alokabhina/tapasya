// src/components/speedmath/SpeedTimerBar.jsx
// Timer bar themed for Speed Math (cyan → indigo), visually distinct from
// Practice Arena's orange TimerBar while keeping the same dark-card language.

export default function SpeedTimerBar({ msLeft, maxSeconds, currentIndex, totalQuestions, correctSoFar }) {
  const maxMs = maxSeconds * 1000
  const pct = maxMs > 0 ? (msLeft / maxMs) * 100 : 0
  const danger = msLeft <= 1500

  return (
    <div className="w-full px-4 pt-4 pb-3 flex-shrink-0" style={{ background: 'linear-gradient(180deg, rgba(8,13,26,0.95) 0%, transparent 100%)' }}>
      <div className="flex items-center justify-between mb-2.5">
        <div className="flex items-center gap-1.5">
          <span className="text-slate-300 text-xs font-bold tabular-nums">{currentIndex + 1}</span>
          <span className="text-slate-600 text-xs">/</span>
          <span className="text-slate-500 text-xs tabular-nums">{totalQuestions}</span>
        </div>
        <span className="text-emerald-400/80 text-xs font-semibold">✓ {correctSoFar}</span>
      </div>

      <div className="relative h-2.5 w-full rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
        <div
          className="absolute inset-y-0 left-0 rounded-full"
          style={{
            width: `${pct}%`,
            background: danger ? 'linear-gradient(90deg, #ef4444, #dc2626)' : 'linear-gradient(90deg, #22d3ee, #6366f1)',
            boxShadow: danger ? '0 0 10px rgba(239,68,68,0.6)' : '0 0 8px rgba(99,102,241,0.5)',
            transition: 'width 0.1s linear, background 0.4s ease',
          }}
        />
      </div>

      <div className="flex justify-end mt-1.5">
        <span
          className="text-xs font-mono font-bold tabular-nums"
          style={{ color: danger ? '#f87171' : '#67e8f9' }}
        >
          {(msLeft / 1000).toFixed(1)}s
        </span>
      </div>
    </div>
  )
}