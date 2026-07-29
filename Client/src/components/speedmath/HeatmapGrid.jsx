// src/components/speedmath/HeatmapGrid.jsx
// Shows a grid of numbers (e.g. 12–30 for Tables) colored by accuracy so the
// user can see at a glance which tables/squares/cubes are weak.

function colorFor(accuracy) {
  if (accuracy == null) return { bg: 'rgba(255,255,255,0.04)', text: '#475569', border: 'rgba(255,255,255,0.06)' }
  if (accuracy >= 80) return { bg: 'rgba(52,211,153,0.16)', text: '#34d399', border: 'rgba(52,211,153,0.35)' }
  if (accuracy >= 50) return { bg: 'rgba(251,191,36,0.16)', text: '#fbbf24', border: 'rgba(251,191,36,0.35)' }
  return { bg: 'rgba(248,113,113,0.16)', text: '#f87171', border: 'rgba(248,113,113,0.35)' }
}

export default function HeatmapGrid({ range, itemsMap, onCellClick }) {
  const [min, max] = range
  const cells = Array.from({ length: max - min + 1 }, (_, i) => min + i)

  return (
    <div className="grid grid-cols-6 sm:grid-cols-8 gap-2">
      {cells.map((n) => {
        const stat = itemsMap[String(n)]
        const c = colorFor(stat?.accuracy)
        return (
          <button
            key={n}
            onClick={() => onCellClick?.(n, stat)}
            className="aspect-square rounded-lg flex flex-col items-center justify-center transition-transform active:scale-95"
            style={{ background: c.bg, border: `1px solid ${c.border}` }}
            title={stat ? `${stat.accuracy}% accuracy · ${stat.attempts} attempts` : 'Not attempted yet'}
          >
            <span className="text-[11px] font-black" style={{ color: c.text }}>{n}</span>
            {stat && <span className="text-[8px] font-semibold opacity-70" style={{ color: c.text }}>{stat.accuracy}%</span>}
          </button>
        )
      })}
    </div>
  )
}