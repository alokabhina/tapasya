// src/components/practicetest/AttemptCompareTable.jsx
// Previous-attempts compare table (plan doc Section 10.6) — only rendered
// when a test has been reattempted. Same Sparkline pattern as
// pages/MockTracker.jsx for visual consistency across the app. Data
// straight from utils/practiceAnalysis.js's buildAttemptCompare.
//
// Dark/brand theme — matches the Result page it follows on from.

function Sparkline({ values = [] }) {
  const clean = values.filter((v) => v != null)
  if (clean.length < 2) return null
  const min = Math.min(...clean), max = Math.max(...clean)
  const range = max - min || 1
  const points = clean.map((v, i) => {
    const x = (i / (clean.length - 1)) * 100
    const y = 100 - ((v - min) / range) * 100
    return `${x},${y}`
  }).join(' ')
  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-10">
      <polyline points={points} fill="none" stroke="#f97316" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export default function AttemptCompareTable({ attemptCompare, currentAttemptNumber }) {
  if (!attemptCompare || attemptCompare.length < 2) return null

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/60 overflow-hidden">
      <div className="px-4 pt-4 pb-2">
        <p className="text-sm font-bold text-white">Your Attempts</p>
      </div>

      <div className="px-4 pb-2">
        <Sparkline values={attemptCompare.map((a) => a.score)} />
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-slate-400 border-b border-slate-800 bg-slate-800/40">
              <th className="text-left font-semibold px-4 py-2">#</th>
              <th className="text-left font-semibold px-2 py-2">Date</th>
              <th className="text-right font-semibold px-2 py-2">Score</th>
              <th className="text-right font-semibold px-2 py-2">Accuracy</th>
              <th className="text-right font-semibold px-2 py-2">Correct</th>
              <th className="text-right font-semibold px-2 py-2">Incorrect</th>
              <th className="text-right font-semibold px-4 py-2">Time</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {attemptCompare.map((a) => (
              <tr key={a.attemptNumber} className={a.attemptNumber === currentAttemptNumber ? 'bg-tapasya-orange/10' : ''}>
                <td className="px-4 py-2.5 text-slate-200 font-medium">
                  {a.attemptNumber}
                  {a.isBest && <i className="ti ti-crown text-amber-400 ml-1" title="Best attempt" />}
                  {a.attemptNumber === currentAttemptNumber && <span className="text-[9px] text-tapasya-orange ml-1">(this)</span>}
                </td>
                <td className="px-2 py-2.5 text-slate-400">{a.date ? new Date(a.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : '—'}</td>
                <td className="px-2 py-2.5 text-right text-tapasya-orange font-bold">{a.score}</td>
                <td className="px-2 py-2.5 text-right text-slate-300">{a.accuracy}%</td>
                <td className="px-2 py-2.5 text-right text-emerald-400">{a.correct}</td>
                <td className="px-2 py-2.5 text-right text-red-400">{a.incorrect}</td>
                <td className="px-4 py-2.5 text-right text-slate-400">{Math.round((a.timeTakenSec || 0) / 60)}m</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}