// src/components/games/WeakTopicsChart.jsx
// CSS bar chart for weak topics — no chart library, per plan spec

export default function WeakTopicsChart({ weakTopics = [] }) {
  if (!weakTopics.length) {
    return (
      <div className="text-center text-slate-500 text-sm py-6">
        No weak topics yet — keep playing! 🎯
      </div>
    )
  }

  // Sort by error rate descending
  const sorted = [...weakTopics]
    .filter(w => w.wrongCount > 0)
    .sort((a, b) => {
      const rateA = a.totalAttempts ? a.wrongCount / a.totalAttempts : 0
      const rateB = b.totalAttempts ? b.wrongCount / b.totalAttempts : 0
      return rateB - rateA
    })
    .slice(0, 8)

  const maxWrong = Math.max(...sorted.map(w => w.wrongCount), 1)

  return (
    <div className="space-y-2">
      {sorted.map((wt, i) => {
        const pct      = Math.round((wt.wrongCount / maxWrong) * 100)
        const errRate  = wt.totalAttempts
          ? Math.round((wt.wrongCount / wt.totalAttempts) * 100)
          : 0

        return (
          <div key={i}>
            <div className="flex justify-between text-xs text-slate-300 mb-1">
              <span className="capitalize">{wt.topic?.replace(/-/g, ' ')}</span>
              <span className="text-red-400">{wt.wrongCount} wrong ({errRate}%)</span>
            </div>
            <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-red-500 to-rose-400 rounded-full transition-all duration-700"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}
