// src/components/mocktest/ScoreTrendChart.jsx
// Pure SVG line chart — score % and accuracy % over time. No chart library
// dependency, matches the pattern used elsewhere in this app (e.g. the
// sparkline on the Mock Tracker list cards).
import { useId, useState } from 'react'

export default function ScoreTrendChart({
  trend = [],
  scoreColor = '#fb923c',
  accuracyColor = '#60a5fa',
  scoreLabel = 'Score %',
  emptyMessage = 'Kam se kam 2 results chahiye trend dekhne ke liye',
}) {
  const [hover, setHover] = useState(null)
  const gradientId = useId()

  const points = trend
    .filter((t) => t.score != null)
    .map((t) => ({ ...t, scorePct: t.maxScore ? (t.score / t.maxScore) * 100 : t.score }))

  if (points.length < 2) {
    return (
      <div className="h-48 flex items-center justify-center text-xs text-slate-600 text-center px-6">
        {emptyMessage}
      </div>
    )
  }

  const W = 640, H = 260, PAD_L = 34, PAD_R = 14, PAD_T = 14, PAD_B = 34
  const plotW = W - PAD_L - PAD_R
  const plotH = H - PAD_T - PAD_B
  const xStep = points.length > 1 ? plotW / (points.length - 1) : 0
  const xFor = (i) => PAD_L + i * xStep
  const yFor = (v) => PAD_T + plotH - (Math.max(0, Math.min(100, v)) / 100) * plotH

  const scorePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${xFor(i)} ${yFor(p.scorePct)}`).join(' ')
  const accPath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${xFor(i)} ${yFor(p.accuracy ?? 0)}`).join(' ')
  const areaPath = `${scorePath} L ${xFor(points.length - 1)} ${PAD_T + plotH} L ${xFor(0)} ${PAD_T + plotH} Z`

  // Show a manageable number of x-axis date labels regardless of how many
  // attempts there are — always first/last, plus a few evenly spaced.
  const maxLabels = 6
  const labelStep = Math.max(1, Math.ceil(points.length / maxLabels))
  const labelIdxs = new Set()
  for (let i = 0; i < points.length; i += labelStep) labelIdxs.add(i)
  labelIdxs.add(points.length - 1)

  function handleMove(e) {
    const svg = e.currentTarget
    const rect = svg.getBoundingClientRect()
    const clientX = e.touches ? e.touches[0].clientX : e.clientX
    const svgX = ((clientX - rect.left) / rect.width) * W
    let idx = Math.round((svgX - PAD_L) / xStep)
    idx = Math.max(0, Math.min(points.length - 1, idx))
    setHover(idx)
  }

  const active = hover != null ? points[hover] : null

  return (
    <div>
      <div className="flex items-center gap-4 mb-2 text-[11px]">
        <span className="flex items-center gap-1.5 text-slate-400"><span className="w-2.5 h-2.5 rounded-full" style={{ background: scoreColor }} /> {scoreLabel}</span>
        <span className="flex items-center gap-1.5 text-slate-400"><span className="w-2.5 h-2.5 rounded-full" style={{ background: accuracyColor }} /> Accuracy %</span>
      </div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full h-56 touch-none select-none"
        onMouseMove={handleMove}
        onMouseLeave={() => setHover(null)}
        onTouchMove={handleMove}
        onTouchEnd={() => setHover(null)}
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={scoreColor} stopOpacity="0.28" />
            <stop offset="100%" stopColor={scoreColor} stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* horizontal gridlines + y-axis labels */}
        {[0, 25, 50, 75, 100].map((v) => (
          <g key={v}>
            <line x1={PAD_L} x2={W - PAD_R} y1={yFor(v)} y2={yFor(v)} stroke="#1e293b" strokeWidth="1" />
            <text x={PAD_L - 8} y={yFor(v) + 3} textAnchor="end" fontSize="10" fill="#64748b">{v}</text>
          </g>
        ))}

        {/* x-axis date labels */}
        {points.map((p, i) => labelIdxs.has(i) ? (
          <text key={i} x={xFor(i)} y={H - 10} textAnchor="middle" fontSize="9" fill="#64748b">
            {new Date(p.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
          </text>
        ) : null)}

        {/* score area fill */}
        <path d={areaPath} fill={`url(#${gradientId})`} stroke="none" />

        {/* hover guide line */}
        {active && (
          <line x1={xFor(hover)} x2={xFor(hover)} y1={PAD_T} y2={PAD_T + plotH} stroke="#475569" strokeWidth="1" strokeDasharray="3 3" />
        )}

        <path d={accPath} fill="none" stroke={accuracyColor} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="4 3" />
        <path d={scorePath} fill="none" stroke={scoreColor} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

        {points.map((p, i) => (
          <g key={i}>
            <circle cx={xFor(i)} cy={yFor(p.accuracy ?? 0)} r={hover === i ? 5 : 3} fill={accuracyColor} stroke="#0f172a" strokeWidth={hover === i ? 1.5 : 0} />
            <circle cx={xFor(i)} cy={yFor(p.scorePct)} r={hover === i ? 5 : 3} fill={scoreColor} stroke="#0f172a" strokeWidth={hover === i ? 1.5 : 0} />
          </g>
        ))}
      </svg>

      <div className="text-center text-xs text-slate-400 h-4 mt-1">
        {active ? (
          <>
            {active.title || new Date(active.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
            {' — '}Score: <span className="font-medium" style={{ color: scoreColor }}>{active.score}{active.maxScore ? `/${active.maxScore}` : ''}</span>
            {' · '}Accuracy: <span className="font-medium" style={{ color: accuracyColor }}>{active.accuracy}%</span>
          </>
        ) : (
          <span className="text-slate-600">Hover / touch karke details dekho</span>
        )}
      </div>
    </div>
  )
}