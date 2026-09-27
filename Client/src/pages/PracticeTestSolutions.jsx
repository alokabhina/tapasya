// src/pages/PracticeTestSolutions.jsx
// Question-by-question review (reached from Result/Analysis CTAs, or a
// Weakness-panel chip via ?qNo=31 deep link). Groups questions that share
// a `groupId` under their shared direction block (passage/puzzle/DI table)
// — same grouping mechanism the live engine uses, see
// models/PracticeTest.js's directionSchema comment.
//
// Round-3: each question now also shows "You: Xs · Class avg: Ys (n
// students)" whenever the server has enough data — routes/practiceAttempts.js's
// /solutions endpoint aggregates timeSpentSec across every user's attempts
// on this test. AttemptSwitcher shows up whenever this test has more than
// one attempt so a past attempt's solutions are one click away too.
//
// Dark/brand theme, continuing on from the Result page. Only the live
// engine (PracticeTestPlay.jsx) stays light/white.

import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { getPracticeSolutions } from '@/api/practiceAttempts'
import { sanitizeHtml } from '@/utils/sanitizeHtml'
import AttemptSwitcher from '@/components/practicetest/AttemptSwitcher'

const STATUS_META = {
  correct:  { label: 'Correct',     className: 'bg-emerald-500/10 text-emerald-400' },
  wrong:    { label: 'Incorrect',   className: 'bg-red-500/10 text-red-400' },
  skipped:  { label: 'Unattempted', className: 'bg-slate-800 text-slate-400' },
}

function statusOf(q) {
  if (q.userAnswer == null) return 'skipped'
  return q.wasCorrect ? 'correct' : 'wrong'
}

function formatSec(s) {
  const total = Math.round(s || 0)
  return `${Math.floor(total / 60)}m ${total % 60}s`
}

function QuestionCard({ q, highlighted }) {
  const status = statusOf(q)
  const meta = STATUS_META[status]
  const hasCommunityTime = q.avgTimeSec != null && q.avgTimeSampleSize >= 3

  return (
    <div id={`q-${q.qNo}`} className={`rounded-xl border px-4 py-3.5 ${highlighted ? 'border-tapasya-orange bg-tapasya-orange/10' : 'border-slate-800 bg-slate-900/60'}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-bold text-slate-500">Q{q.qNo}</span>
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${meta.className}`}>{meta.label}</span>
      </div>
      <p className="text-sm text-slate-200 mb-3 whitespace-pre-wrap" dangerouslySetInnerHTML={{ __html: sanitizeHtml(q.questionText) }} />
      <div className="space-y-1.5 mb-3">
        {q.options.map((opt) => {
          const isCorrect = opt.key === q.correctKey
          const isUser = opt.key === q.userAnswer
          let cls = 'border-slate-700 text-slate-300'
          if (isCorrect) cls = 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300'
          else if (isUser) cls = 'border-red-500/40 bg-red-500/10 text-red-300'
          return (
            <div key={opt.key} className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs ${cls}`}>
              <span className="font-bold w-4">{opt.key}</span>
              <span className="whitespace-pre-wrap" dangerouslySetInnerHTML={{ __html: sanitizeHtml(opt.text) }} />
              {isCorrect && <i className="ti ti-check ml-auto text-emerald-400" />}
              {isUser && !isCorrect && <i className="ti ti-x ml-auto text-red-400" />}
            </div>
          )
        })}
      </div>
      {q.explanation && (
        <div className="rounded-lg bg-slate-800/50 border border-slate-800 px-3 py-2 text-xs text-slate-300 mb-2">
          <span className="font-bold text-slate-100">Explanation: </span>
          <span className="whitespace-pre-wrap" dangerouslySetInnerHTML={{ __html: sanitizeHtml(q.explanation) }} />
        </div>
      )}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <p className="text-[10px] text-slate-500">{q.topic}{q.subTopic ? ` · ${q.subTopic}` : ''} · {q.difficulty}</p>
        <div className="flex items-center gap-2 text-[10px] text-slate-500">
          <span className="flex items-center gap-1"><i className="ti ti-clock" /> You: {formatSec(q.userTimeSec)}</span>
          {hasCommunityTime && (
            <span className="flex items-center gap-1 text-slate-400" title={`${q.avgTimeSampleSize} students ke data se`}>
              <i className="ti ti-users" /> Class avg: {formatSec(q.avgTimeSec)}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

export default function PracticeTestSolutions() {
  const { attemptId } = useParams()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const jumpQNo = searchParams.get('qNo') ? Number(searchParams.get('qNo')) : null

  const [testId, setTestId] = useState(null)
  const [sections, setSections] = useState(null)
  const [activeSection, setActiveSection] = useState(0)
  const [error, setError] = useState('')
  const scrolledRef = useRef(false)

  useEffect(() => {
    setSections(null)
    scrolledRef.current = false
    getPracticeSolutions(attemptId).then((data) => {
      setSections(data.sections)
      setTestId(data.testId)
      if (jumpQNo != null) {
        const idx = data.sections.findIndex((s) => s.questions.some((q) => q.qNo === jumpQNo))
        if (idx >= 0) setActiveSection(idx)
      }
    }).catch(() => setError('Solutions load nahi ho paye'))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attemptId])

  useEffect(() => {
    if (!sections || scrolledRef.current || jumpQNo == null) return
    const el = document.getElementById(`q-${jumpQNo}`)
    if (el) { el.scrollIntoView({ behavior: 'smooth', block: 'center' }); scrolledRef.current = true }
  }, [sections, activeSection, jumpQNo])

  if (error) {
    return <div className="min-h-screen bg-[#0f172a] flex items-center justify-center text-red-400 text-sm px-4 text-center">{error}</div>
  }
  if (!sections) {
    return (
      <div className="min-h-screen bg-[#0f172a] px-4 py-6 md:px-8 max-w-2xl mx-auto space-y-3">
        {[1, 2, 3].map((i) => <div key={i} className="h-32 rounded-xl bg-slate-800/60 animate-pulse" />)}
      </div>
    )
  }

  const section = sections[activeSection]

  // Group consecutive questions by groupId so a shared passage/puzzle/table
  // renders once above the questions that point to it.
  const groups = []
  let lastGroupId
  for (const q of section.questions) {
    if (q.groupId && q.groupId === lastGroupId) {
      groups[groups.length - 1].questions.push(q)
    } else {
      groups.push({ groupId: q.groupId, questions: [q] })
      lastGroupId = q.groupId
    }
  }

  return (
    <div className="min-h-screen bg-[#0f172a] px-4 py-6 md:px-8 max-w-2xl mx-auto">
      <button
        onClick={() => navigate(`/practice-tests/result/${attemptId}`)}
        className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-300 mb-4"
      >
        <i className="ti ti-arrow-left" /> Result
      </button>

      <h1 className="text-xl font-black text-white mb-4">Solutions</h1>

      <AttemptSwitcher testId={testId} currentAttemptId={attemptId} basePath="solutions" />

      {sections.length > 1 && (
        <div className="flex gap-2 overflow-x-auto mb-4 pb-1">
          {sections.map((s, i) => (
            <button
              key={s.name}
              onClick={() => { setActiveSection(i); scrolledRef.current = true }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap ${
                activeSection === i ? 'bg-tapasya-orange text-white' : 'bg-slate-800/60 text-slate-400 hover:text-slate-200'
              }`}
            >
              {s.name}
            </button>
          ))}
        </div>
      )}

      <div className="space-y-4">
        {groups.map((g, gi) => {
          const direction = g.groupId ? section.directions?.find((d) => d.groupId === g.groupId) : null
          return (
            <div key={gi} className="space-y-3">
              {direction && (
                <div className="rounded-xl border border-slate-800 bg-slate-900/60 px-4 py-3">
                  {direction.title && <p className="text-xs font-bold text-slate-200 mb-1">{direction.title}</p>}
                  <div className="text-xs text-slate-400 whitespace-pre-wrap [&_table]:whitespace-normal" dangerouslySetInnerHTML={{ __html: sanitizeHtml(direction.content) }} />
                </div>
              )}
              {g.questions.map((q) => (
                <QuestionCard key={q.qNo} q={q} highlighted={q.qNo === jumpQNo} />
              ))}
            </div>
          )
        })}
      </div>
    </div>
  )
}