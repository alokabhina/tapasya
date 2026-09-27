// src/components/practicetest/ResultCards.jsx
// Result page's core cards (plan doc Section 9 / Round-3 reference design)
// — pass/fail banner, 6 colorful primary stat cards (Score/Attempted/
// Correct/Incorrect/Skipped/Unseen), 4 secondary cards with an icon circle
// each (Accuracy/Total Time/Utilized Time/Wasted Time), and a small
// "Attempt 2 · Last: 62 → This: 71 (+9)" comparison strip when this isn't
// attempt #1. Pure presentational — PracticeTestResult.jsx owns the fetch.
//
// Dark/brand theme — matches the rest of the app shell.

function formatTime(totalSec) {
  const s = Math.max(0, Math.round(totalSec || 0))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  return h > 0 ? `${h}h ${m}m` : `${m}m ${sec}s`
}

export default function ResultCards({ overall, attemptNumber, previousScore }) {
  const hasCutoff = overall.cutoff != null
  const delta = previousScore != null ? +(overall.score - previousScore).toFixed(2) : null

  const primary = [
    { label: 'Score', value: `${overall.score}${overall.maxScore != null ? ` / ${overall.maxScore}` : ''}`, icon: 'ti-star', tint: 'orange' },
    { label: 'Attempted', value: `${overall.attempted} / ${overall.totalQuestions}`, icon: 'ti-pencil', tint: 'blue' },
    { label: 'Correct', value: overall.correct, icon: 'ti-check', tint: 'emerald' },
    { label: 'Incorrect', value: overall.incorrect, icon: 'ti-x', tint: 'red' },
    { label: 'Skipped', value: overall.skipped, icon: 'ti-player-skip-forward', tint: 'amber' },
    { label: 'Unseen', value: overall.unseen, icon: 'ti-eye-off', tint: 'purple' },
  ]
  const TINTS = {
    orange: 'bg-tapasya-orange/10 border-tapasya-orange/25 text-tapasya-orange',
    blue: 'bg-blue-500/10 border-blue-500/25 text-blue-400',
    emerald: 'bg-emerald-500/10 border-emerald-500/25 text-emerald-400',
    red: 'bg-red-500/10 border-red-500/25 text-red-400',
    amber: 'bg-amber-500/10 border-amber-500/25 text-amber-400',
    purple: 'bg-purple-500/10 border-purple-500/25 text-purple-400',
  }

  const secondary = [
    { label: 'Accuracy', value: `${overall.accuracy}%`, icon: 'ti-target' },
    { label: 'Total Time', value: formatTime(overall.totalTimeSec), icon: 'ti-clock' },
    { label: 'Utilized Time', value: formatTime(overall.utilizedTimeSec), icon: 'ti-player-play' },
    { label: 'Wasted Time', value: formatTime(overall.wastedTimeSec), icon: 'ti-hourglass' },
  ]

  return (
    <div>
      {hasCutoff && (
        <div
          className={`rounded-2xl px-5 py-4 mb-4 text-center border ${
            overall.passedCutoff ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-red-500/10 border-red-500/30'
          }`}
        >
          <p className={`font-black text-lg ${overall.passedCutoff ? 'text-emerald-400' : 'text-red-400'}`}>
            {overall.passedCutoff ? 'Congrats!! reached cutoff 🎉' : 'Oh No!!! not reached cutoff'}
          </p>
          <p className="text-slate-400 text-xs mt-1">Score {overall.score} · Cutoff {overall.cutoff}</p>
        </div>
      )}

      {delta != null && (
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 px-4 py-2.5 mb-4 flex items-center justify-between text-xs">
          <span className="text-slate-400">Attempt {attemptNumber} · Last attempt: {previousScore}</span>
          <span className={`font-bold flex items-center gap-1 ${delta >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            <i className={`ti ${delta >= 0 ? 'ti-trending-up' : 'ti-trending-down'}`} />
            {overall.score} ({delta >= 0 ? '+' : ''}{delta})
          </span>
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 mb-3">
        {primary.map((c) => (
          <div key={c.label} className={`relative rounded-2xl border px-3 py-3.5 text-center ${TINTS[c.tint]}`}>
            <i className={`ti ${c.icon} text-lg`} />
            <p className="font-black text-lg text-white mt-1">{c.value}</p>
            <p className="text-slate-400 text-[10px] mt-0.5">{c.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        {secondary.map((c) => (
          <div key={c.label} className="rounded-2xl border border-slate-800 bg-slate-900/60 px-3.5 py-3 flex items-center gap-2.5">
            <span className="w-9 h-9 rounded-full bg-slate-800 flex items-center justify-center shrink-0">
              <i className={`ti ${c.icon} text-tapasya-orange`} />
            </span>
            <div className="min-w-0">
              <p className="font-bold text-white text-sm truncate">{c.value}</p>
              <p className="text-slate-500 text-[10px] mt-0.5">{c.label}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}