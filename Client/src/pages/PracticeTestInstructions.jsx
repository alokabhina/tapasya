// src/pages/PracticeTestInstructions.jsx
// Pre-start instructions page (plan doc Section 2 + Section 7.6 flow entry
// point). Shows rules + marking scheme per section, then "Start Test" ->
// POST /practice-attempts (server dedupes an in-progress attempt into a
// resume automatically, see routes/practiceAttempts.js) -> navigate into
// the live engine with `replace: true` so browser-back can't land here
// mid-test (plan doc Section 14 back-button edge case).

import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { getPracticeTest } from '@/api/practiceTests'
import { startPracticeAttempt, getPracticeAttemptHistory } from '@/api/practiceAttempts'

export default function PracticeTestInstructions() {
  const { subjectId, testId } = useParams()
  const navigate = useNavigate()
  const [test, setTest] = useState(null)
  const [history, setHistory] = useState([])
  const [starting, setStarting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    getPracticeTest(testId).then(setTest).catch(() => setError('Test nahi mila ya abhi published nahi hai'))
    getPracticeAttemptHistory(testId).then(setHistory).catch(() => {})
  }, [testId])

  const inProgress = history.find((a) => a.status === 'in-progress')
  const hasSubmitted = history.some((a) => a.status !== 'in-progress')

  async function handleStart() {
    if (starting) return
    setStarting(true)
    setError('')
    try {
      const { attempt } = await startPracticeAttempt(testId)
      navigate(`/practice-tests/${subjectId}/${testId}/attempt/${attempt._id}`, { replace: true })
    } catch (e) {
      setError(e?.response?.data?.error || 'Test start nahi ho paya, dobara try karo')
      setStarting(false)
    }
  }

  if (error && !test) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <p className="text-red-400 text-sm">{error}</p>
      </div>
    )
  }

  if (!test) {
    return (
      <div className="min-h-screen px-4 py-6 md:px-8">
        <div className="h-6 w-40 rounded bg-slate-800/50 animate-pulse mb-4" />
        <div className="h-40 rounded-2xl bg-slate-800/40 animate-pulse" />
      </div>
    )
  }

  return (
    <div className="min-h-screen px-4 py-6 md:px-8 max-w-2xl mx-auto">
      <button
        onClick={() => navigate(`/practice-tests/${subjectId}`)}
        className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-slate-200 mb-4"
      >
        <i className="ti ti-arrow-left" /> Back
      </button>

      <h1 className="text-xl font-black text-white">{test.title}</h1>
      {test.examTag && <p className="text-slate-500 text-sm mt-1">{test.examTag}</p>}

      <div className="grid grid-cols-3 gap-2 my-5">
        <StatBox icon="ti-list-numbers" label="Questions" value={test.totalQuestions} />
        <StatBox icon="ti-star" label="Max Marks" value={test.totalMarks} />
        <StatBox icon="ti-clock" label="Duration" value={`${Math.round((test.totalDurationSec || 0) / 60)}m`} />
      </div>

      {test.instructions && (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/50 px-4 py-4 mb-5">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-2">Instructions</p>
          <p className="text-sm text-slate-300 whitespace-pre-line leading-relaxed">{test.instructions}</p>
        </div>
      )}

      <div className="rounded-2xl border border-slate-800 bg-slate-900/50 px-4 py-4 mb-5">
        <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-3">Sections &amp; Marking Scheme</p>
        <div className="space-y-2.5">
          {test.sections?.map((s) => (
            <div key={s.name} className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-slate-100 font-semibold truncate">{s.name}</span>
                {s.hasCalculator && <i className="ti ti-calculator text-slate-500 text-sm" title="Calculator available" />}
              </div>
              <div className="flex items-center gap-3 text-xs text-slate-500 shrink-0">
                <span>{Math.round(s.durationSec / 60)} min</span>
                {s.cutoff != null && <span>Cutoff: {s.cutoff}</span>}
              </div>
            </div>
          ))}
        </div>
      </div>

      {history.length > 0 && (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/50 px-4 py-4 mb-5">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-2">Your Attempts</p>
          <div className="flex flex-wrap gap-2">
            {history.filter((a) => a.status !== 'in-progress').map((a) => (
              <span key={a.attemptNumber} className="text-xs px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300">
                #{a.attemptNumber} · {a.overall?.score ?? '—'} pts
              </span>
            ))}
          </div>
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 text-red-300 text-sm px-4 py-3 mb-4">{error}</div>
      )}

      <button
        onClick={handleStart}
        disabled={starting}
        className="w-full rounded-2xl px-5 py-4 flex items-center justify-center gap-2 font-black text-white active:scale-[0.98] transition-transform disabled:opacity-60"
        style={{ background: 'linear-gradient(135deg, #f97316, #ea580c)', boxShadow: '0 8px 28px rgba(249,115,22,0.3)' }}
      >
        {starting ? (
          <><i className="ti ti-loader-2 animate-spin" /> Starting...</>
        ) : inProgress ? (
          <><i className="ti ti-player-play" /> Resume Test</>
        ) : hasSubmitted ? (
          <><i className="ti ti-repeat" /> Reattempt</>
        ) : (
          <><i className="ti ti-player-play" /> Start Test</>
        )}
      </button>
    </div>
  )
}

function StatBox({ icon, label, value }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/50 px-3 py-3 text-center">
      <i className={`ti ${icon} text-tapasya-orange text-lg`} />
      <p className="text-white font-bold text-sm mt-1">{value}</p>
      <p className="text-slate-500 text-[10px] mt-0.5">{label}</p>
    </div>
  )
}