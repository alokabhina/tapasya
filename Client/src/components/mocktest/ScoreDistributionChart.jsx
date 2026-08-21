// src/components/mocktest/ScoreDistributionChart.jsx
// Histogram of score % across every attempt, bucketed in 20-point ranges —
// shows how consistent (or scattered) the results have been.
const BUCKETS = [
  { label: '0-20', min: 0, max: 20 },
  { label: '20-40', min: 20, max: 40 },
  { label: '40-60', min: 40, max: 60 },
  { label: '60-80', min: 60, max: 80 },
  { label: '80-100', min: 80, max: 100.01 },
]

export default function ScoreDistributionChart({ trend = [] }) {
  const pcts = trend
    .filter((t) => t.score != null)
    .map((t) => (t.maxScore ? (t.score / t.maxScore) * 100 : t.score))

  if (pcts.length < 2) {
    return <p className="text-xs text-slate-600 py-4 text-center">Kam se kam 2 results chahiye distribution dekhne ke liye</p>
  }

  const counts = BUCKETS.map((b) => pcts.filter((p) => p >= b.min && p < b.max).length)
  const maxCount = Math.max(...counts, 1)

  const W = 640, H = 160, PAD_B = 24, PAD_T = 10
  const barGap = 16
  const barW = (W - barGap * (BUCKETS.length + 1)) / BUCKETS.length
  const plotH = H - PAD_B - PAD_T

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-40">
      {BUCKETS.map((b, i) => {
        const h = (counts[i] / maxCount) * plotH
        const x = barGap + i * (barW + barGap)
        const y = PAD_T + plotH - h
        return (
          <g key={b.label}>
            <rect x={x} y={y} width={barW} height={Math.max(h, counts[i] ? 3 : 0)} rx="6" fill="#fb923c" fillOpacity={0.35 + 0.65 * (i / (BUCKETS.length - 1))} />
            {counts[i] > 0 && (
              <text x={x + barW / 2} y={y - 5} textAnchor="middle" fontSize="10" fill="#cbd5e1">{counts[i]}</text>
            )}
            <text x={x + barW / 2} y={H - 6} textAnchor="middle" fontSize="10" fill="#64748b">{b.label}%</text>
          </g>
        )
      })}
    </svg>
  )
}