// src/components/mocktest/AttemptsBreakdownChart.jsx
// Donut chart — Full Mocks vs Sectional Tests split, so it's clear at a
// glance how attempts are distributed for this exam.
export default function AttemptsBreakdownChart({ full = 0, sectional = 0 }) {
  const total = full + sectional
  if (total === 0) {
    return <p className="text-xs text-slate-600 py-4 text-center">Abhi koi attempt nahi hai</p>
  }

  const R = 60, CX = 70, CY = 70, STROKE = 20
  const circumference = 2 * Math.PI * R
  const fullPct = full / total
  const fullLen = fullPct * circumference
  const sectionalLen = circumference - fullLen

  return (
    <div className="flex items-center gap-6">
      <svg viewBox="0 0 140 140" className="w-32 h-32 shrink-0 -rotate-90">
        <circle cx={CX} cy={CY} r={R} fill="none" stroke="#1e293b" strokeWidth={STROKE} />
        {full > 0 && (
          <circle
            cx={CX} cy={CY} r={R} fill="none" stroke="#fb923c" strokeWidth={STROKE}
            strokeDasharray={`${fullLen} ${circumference - fullLen}`} strokeLinecap="butt"
          />
        )}
        {sectional > 0 && (
          <circle
            cx={CX} cy={CY} r={R} fill="none" stroke="#60a5fa" strokeWidth={STROKE}
            strokeDasharray={`${sectionalLen} ${circumference - sectionalLen}`}
            strokeDashoffset={-fullLen}
            strokeLinecap="butt"
          />
        )}
      </svg>
      <div className="space-y-2.5">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-orange-500 shrink-0" />
          <span className="text-xs text-slate-300">Full Mocks</span>
          <span className="text-xs font-semibold text-slate-200">{full}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-blue-400 shrink-0" />
          <span className="text-xs text-slate-300">Sectional Tests</span>
          <span className="text-xs font-semibold text-slate-200">{sectional}</span>
        </div>
        <div className="text-[11px] text-slate-500 pt-1">Total: {total} attempts</div>
      </div>
    </div>
  )
}