// src/components/mocktest/SubjectAccuracyChart.jsx
// Horizontal bar chart, one bar per subject/section — clearer at a glance
// than a plain list of progress bars, and shows attempt counts too. Each
// subject uses the same color it gets everywhere else in the dashboard
// (trend chart, subject picker) so it stays recognizable at a glance.
import { colorForSection } from '@/utils/sectionColors'

export default function SubjectAccuracyChart({ data = [] }) {
  if (!data.length) {
    return <p className="text-xs text-slate-600 py-4 text-center">Abhi subject-wise data nahi hai</p>
  }

  const overallAvg = +(data.reduce((s, d) => s + d.avgAccuracy, 0) / data.length).toFixed(1)
  const rowH = 34
  const PAD_L = 4, PAD_R = 40
  const W = 640, H = data.length * rowH + 20

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: H }}>
        {data.map((d, i) => {
          const y = i * rowH + 10
          const barW = (Math.min(100, d.avgAccuracy) / 100) * (W - PAD_L - PAD_R - 90)
          const color = colorForSection(d.sectionName)
          return (
            <g key={d.sectionName}>
              <text x={0} y={y + 15} fontSize="11" fill="#cbd5e1">{d.sectionName}</text>
              <rect x={90} y={y + 4} width={W - 90 - PAD_R} height="14" rx="7" fill="#1e293b" />
              <rect x={90} y={y + 4} width={Math.max(4, barW)} height="14" rx="7" fill={color} />
              <text x={90 + (W - 90 - PAD_R) + 4} y={y + 15} fontSize="10" fill="#94a3b8">{d.avgAccuracy}%</text>
            </g>
          )
        })}
        {/* overall average marker line */}
        {(() => {
          const avgX = 90 + (Math.min(100, overallAvg) / 100) * (W - 90 - PAD_R)
          return (
            <g>
              <line x1={avgX} x2={avgX} y1={4} y2={H - 6} stroke="#64748b" strokeWidth="1" strokeDasharray="3 3" />
            </g>
          )
        })()}
      </svg>
      <div className="flex items-center gap-3 mt-2 text-[10px] text-slate-500 flex-wrap">
        {data.map((d) => (
          <span key={d.sectionName} className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full" style={{ background: colorForSection(d.sectionName) }} /> {d.sectionName}
          </span>
        ))}
        <span className="flex items-center gap-1"><span className="w-2.5 border-t border-dashed border-slate-500" /> Overall avg ({overallAvg}%)</span>
      </div>
    </div>
  )
}