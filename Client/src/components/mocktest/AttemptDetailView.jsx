// src/components/mocktest/AttemptDetailView.jsx
function StatBox({ label, value, accent }) {
  if (value == null) return null
  return (
    <div className="rounded-xl bg-slate-800/50 border border-slate-800 px-3 py-2.5">
      <p className="text-[10px] text-slate-500">{label}</p>
      <p className={`text-sm font-bold mt-0.5 ${accent || 'text-slate-200'}`}>{value}</p>
    </div>
  )
}

export default function AttemptDetailView({ attempt, onClose, onDelete }) {
  if (!attempt) return null
  const o = attempt.overall || {}

  return (
    <div className="fixed inset-0 z-[105] bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="w-full sm:max-w-2xl bg-slate-900 border border-slate-700 rounded-t-2xl sm:rounded-2xl overflow-hidden max-h-[92vh] flex flex-col animate-fade-in-up">
        <div className="px-5 pt-5 pb-3 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-100">{attempt.title || (attempt.mode === 'full' ? 'Full Mock' : 'Sectional Test')}</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {new Date(attempt.attemptedOn).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
              {attempt.platform && ` · ${attempt.platform}`}
            </p>
          </div>
          <div className="flex items-center gap-1">
            {onDelete && (
              <button onClick={() => onDelete(attempt)} className="w-8 h-8 rounded-lg hover:bg-red-500/10 text-slate-500 hover:text-red-400 flex items-center justify-center">
                <i className="ti ti-trash text-sm" />
              </button>
            )}
            <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-slate-800 text-slate-400 flex items-center justify-center">
              <i className="ti ti-x" />
            </button>
          </div>
        </div>

        <div className="px-5 pb-5 flex-1 overflow-y-auto space-y-4">
          <div className="grid grid-cols-3 gap-2">
            <StatBox label="Score" value={o.score != null ? `${o.score}${o.maxScore ? `/${o.maxScore}` : ''}` : null} accent="text-orange-400" />
            <StatBox label="Accuracy" value={o.accuracy != null ? `${o.accuracy}%` : null} accent="text-blue-400" />
            <StatBox label="Attempted" value={o.attempted != null ? `${o.attempted}${o.totalQuestions ? `/${o.totalQuestions}` : ''}` : null} />
            <StatBox label="Rank" value={o.rank != null ? `${o.rank}${o.outOf ? `/${o.outOf}` : ''}` : null} />
            <StatBox label="Percentile" value={o.percentile != null ? `${o.percentile}` : null} />
            <StatBox label="Cutoff" value={o.cutoff} />
          </div>

          {attempt.sections?.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-slate-300 mb-2">Section-wise</p>
              <div className="space-y-2">
                {attempt.sections.map((s, i) => (
                  <div key={i} className="rounded-xl border border-slate-800 p-3">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs font-semibold text-slate-200">{s.sectionName}</p>
                      <div className="flex items-center gap-3 text-xs">
                        {s.score != null && <span className="text-orange-400">{s.score}{s.maxScore ? `/${s.maxScore}` : ''}</span>}
                        {s.accuracy != null && <span className="text-blue-400">{s.accuracy}%</span>}
                      </div>
                    </div>
                    {s.topics?.length > 0 && (
                      <div className="space-y-1">
                        {s.topics.map((t, ti) => (
                          <div key={ti} className="flex items-center justify-between text-[11px]">
                            <span className="text-slate-400 truncate">{t.name}</span>
                            {t.correctPct != null && (
                              <span className={t.correctPct < 50 ? 'text-red-400' : 'text-green-400'}>{t.correctPct}%</span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {(attempt.topperCompare || attempt.averageCompare) && (
            <div>
              <p className="text-xs font-semibold text-slate-300 mb-2">Compare</p>
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-slate-500">
                    <th className="text-left font-normal pb-1"></th>
                    <th className="text-right font-normal pb-1">Score</th>
                    <th className="text-right font-normal pb-1">Accuracy</th>
                  </tr>
                </thead>
                <tbody className="text-slate-300">
                  <tr><td className="py-1">Tumhara</td><td className="text-right">{o.score ?? '—'}</td><td className="text-right">{o.accuracy ?? '—'}%</td></tr>
                  {attempt.topperCompare && (
                    <tr><td className="py-1">Topper</td><td className="text-right">{attempt.topperCompare.score ?? '—'}</td><td className="text-right">{attempt.topperCompare.accuracy ?? '—'}%</td></tr>
                  )}
                  {attempt.averageCompare && (
                    <tr><td className="py-1">Average</td><td className="text-right">{attempt.averageCompare.score ?? '—'}</td><td className="text-right">{attempt.averageCompare.accuracy ?? '—'}%</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {attempt.notes && (
            <div>
              <p className="text-xs font-semibold text-slate-300 mb-1">Notes</p>
              <p className="text-xs text-slate-400">{attempt.notes}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}