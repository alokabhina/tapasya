// src/components/mocktest/ScoreTrendChart.jsx
// Pure SVG line chart — score % and accuracy % over time. No chart library
// dependency, matches the pattern used elsewhere in this app (e.g. the
// sparkline on the Mock Tracker list cards).
import { useState } from 'react'

export default function ScoreTrendChart({ trend = [] }) {
  const [hover, setHover] = useState(null)

  const points = trend
    .filter((t) => t.score != null)
    .map((t) => ({ ...t, scorePct: t.maxScore ? (t.score / t.maxScore) * 100 : t.score }))

  if (points.length < 2) {
    return (
      <div className="h-48 flex items-center justify-center text-xs text-slate-600">
        Kam se kam 2 results chahiye trend dekhne ke liye
      </div>
    )
  }

  const W = 600, H = 200, PAD = 24
  const xStep = (W - PAD * 2) / (points.length - 1)
  const yFor = (v) => H - PAD - (Math.max(0, Math.min(100, v)) / 100) * (H - PAD * 2)

  const scorePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${PAD + i * xStep} ${yFor(p.scorePct)}`).join(' ')
  const accPath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${PAD + i * xStep} ${yFor(p.accuracy ?? 0)}`).join(' ')

  return (
    <div>
      <div className="flex items-center gap-4 mb-2 text-[11px]">
        <span className="flex items-center gap-1.5 text-slate-400"><span className="w-2.5 h-2.5 rounded-full bg-orange-500" /> Score %</span>
        <span className="flex items-center gap-1.5 text-slate-400"><span className="w-2.5 h-2.5 rounded-full bg-blue-400" /> Accuracy %</span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-48" preserveAspectRatio="none">
        {[0, 25, 50, 75, 100].map((v) => (
          <line key={v} x1={PAD} x2={W - PAD} y1={yFor(v)} y2={yFor(v)} stroke="#1e293b" strokeWidth="1" />
        ))}
        <path d={scorePath} fill="none" stroke="#fb923c" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d={accPath} fill="none" stroke="#60a5fa" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="4 3" />
        {points.map((p, i) => (
          <g key={i}>
            <circle
              cx={PAD + i * xStep} cy={yFor(p.scorePct)} r={hover === i ? 5 : 3}
              fill="#fb923c" className="cursor-pointer"
              onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}
            />
            <circle cx={PAD + i * xStep} cy={yFor(p.accuracy ?? 0)} r={hover === i ? 5 : 3} fill="#60a5fa" />
          </g>
        ))}
      </svg>
      {hover != null && points[hover] && (
        <div className="text-center text-xs text-slate-400">
          {points[hover].title || new Date(points[hover].date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
          {' — '}Score: <span className="text-orange-400">{points[hover].score}</span>
          {' · '}Accuracy: <span className="text-blue-400">{points[hover].accuracy}%</span>
        </div>
      )}
    </div>
  )
}