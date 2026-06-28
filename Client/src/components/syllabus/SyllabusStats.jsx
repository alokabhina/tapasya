// components/syllabus/SyllabusStats.jsx
export default function SyllabusStats({ stats, exams, subjects, topics, onSelectExam }) {
  if (!stats) return null

  const { total, done, pct, byExam, bySubject } = stats

  return (
    <div className="p-6 space-y-6 max-w-4xl">
      {/* Overall ring */}
      <div className="bg-slate-800/50 rounded-xl p-5 flex items-center gap-6 border border-slate-700/50">
        <CircleProgress pct={pct} size={80} stroke={7} color="#a855f7" />
        <div>
          <p className="text-2xl font-bold text-white">{done} <span className="text-slate-400 text-base font-normal">/ {total} topics done</span></p>
          <p className="text-slate-400 text-sm mt-0.5">{pct}% overall syllabus complete</p>
        </div>
      </div>

      {/* Exam-wise */}
      {exams.length > 0 && (
        <section>
          <h2 className="text-sm font-medium text-slate-400 uppercase tracking-wider mb-3">Exam-wise</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {exams.map(exam => {
              const s = byExam[exam._id] || { total: 0, done: 0 }
              const p = s.total ? Math.round((s.done / s.total) * 100) : 0
              return (
                <button
                  key={exam._id}
                  onClick={() => onSelectExam(exam._id)}
                  className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4 flex items-center gap-4 hover:border-slate-600 transition-colors text-left group"
                >
                  <CircleProgress pct={p} size={52} stroke={5} color={exam.color || '#a855f7'} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate group-hover:text-purple-300 transition-colors">{exam.name}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{s.done}/{s.total} topics · {p}%</p>
                    <div className="mt-2 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-500" style={{ width: `${p}%`, background: exam.color || '#a855f7' }} />
                    </div>
                  </div>
                  <i className="ti ti-chevron-right text-slate-600 group-hover:text-slate-400 transition-colors text-base" />
                </button>
              )
            })}
          </div>
        </section>
      )}

      {/* Subject-wise */}
      {subjects.length > 0 && (
        <section>
          <h2 className="text-sm font-medium text-slate-400 uppercase tracking-wider mb-3">Subject-wise</h2>
          <div className="space-y-2">
            {subjects.map(sub => {
              const s = bySubject[sub._id] || { total: 0, done: 0 }
              const p = s.total ? Math.round((s.done / s.total) * 100) : 0
              if (s.total === 0) return null
              return (
                <div key={sub._id} className="bg-slate-800/40 border border-slate-700/40 rounded-xl px-4 py-3 flex items-center gap-3">
                  <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: sub.color || '#f97316' }} />
                  <span className="text-sm text-white flex-1 truncate">{sub.name}</span>
                  <span className="text-xs text-slate-400 tabular-nums">{s.done}/{s.total}</span>
                  <div className="w-28 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-500" style={{ width: `${p}%`, background: sub.color || '#f97316' }} />
                  </div>
                  <span className="text-xs text-slate-300 tabular-nums w-9 text-right">{p}%</span>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {total === 0 && (
        <div className="text-center py-16 text-slate-500">
          <i className="ti ti-books text-4xl block mb-3" />
          <p className="text-sm">No topics yet. Add your syllabus topics to start tracking.</p>
        </div>
      )}
    </div>
  )
}

function CircleProgress({ pct, size, stroke, color }) {
  const r    = (size - stroke) / 2
  const circ = 2 * Math.PI * r
  const offset = circ - (pct / 100) * circ
  return (
    <svg width={size} height={size} className="flex-shrink-0 -rotate-90">
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#1e293b" strokeWidth={stroke} />
      <circle
        cx={size/2} cy={size/2} r={r} fill="none"
        stroke={color} strokeWidth={stroke}
        strokeDasharray={circ} strokeDashoffset={offset}
        strokeLinecap="round"
        style={{ transition: 'stroke-dashoffset 0.6s ease' }}
      />
      <text
        x={size/2} y={size/2}
        textAnchor="middle" dominantBaseline="central"
        className="rotate-90"
        transform={`rotate(90,${size/2},${size/2})`}
        fontSize={size < 60 ? '10' : '13'}
        fill="white" fontWeight="600"
      >{pct}%</text>
    </svg>
  )
}