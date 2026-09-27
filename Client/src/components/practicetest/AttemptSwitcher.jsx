// src/components/practicetest/AttemptSwitcher.jsx
// Small pill row used on both PracticeTestResult.jsx and
// PracticeTestSolutions.jsx — "jo jo purana result dekh saku, attempt
// change karte hi uska result show ho" (Round-3 ask). Lists every past
// attempt for this test (api/practiceAttempts.js's getPracticeAttemptHistory,
// server already had this endpoint — routes/practiceAttempts.js's
// GET /history/:testId) and swaps the URL straight to that attempt's
// Result/Solutions page on click. Hidden entirely for a first-and-only
// attempt — nothing to switch between yet.

import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getPracticeAttemptHistory } from '@/api/practiceAttempts'

export default function AttemptSwitcher({ testId, currentAttemptId, basePath }) {
  const navigate = useNavigate()
  const [history, setHistory] = useState(null)

  useEffect(() => {
    if (!testId) return
    getPracticeAttemptHistory(testId).then(setHistory).catch(() => {})
  }, [testId])

  if (!history || history.length < 2) return null

  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-1 mb-4 no-scrollbar">
      <span className="text-[11px] font-bold text-slate-500 shrink-0 flex items-center gap-1">
        <i className="ti ti-history" /> Attempts:
      </span>
      {history.map((a) => (
        <button
          key={a._id}
          onClick={() => a._id !== currentAttemptId && navigate(`/practice-tests/${basePath}/${a._id}`)}
          title={a.submittedAt ? new Date(a.submittedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : ''}
          className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-bold border ${
            a._id === currentAttemptId
              ? 'bg-tapasya-orange text-white border-tapasya-orange'
              : 'bg-slate-900/60 text-slate-400 border-slate-800 hover:text-slate-200 hover:border-slate-700'
          }`}
        >
          #{a.attemptNumber} · {a.overall?.score ?? '—'}
        </button>
      ))}
    </div>
  )
}