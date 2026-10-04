// src/pages/PracticeTestSolutions.jsx
// Question-by-question review (reached from Result/Analysis CTAs, or a
// Weakness-panel chip via ?qNo=31 deep link). Groups questions that share
// a `groupId` under their shared direction block (passage/puzzle/DI table)
// — same grouping mechanism the live engine uses, see
// models/PracticeTest.js's directionSchema comment.
//
// Round-3: each question also shows "You: Xs · Class avg: Ys" whenever the
// server has enough data. AttemptSwitcher shows up whenever this test has
// more than one attempt so a past attempt's solutions are one click away.
//
// Round-4 (UI): the top block (back + title + score chips, section tabs,
// status filter, question palette) is now sticky, so it stays on screen
// while you scroll through the questions. Palette dots jump straight to a
// question; filter pills narrow the list to Correct / Incorrect /
// Unattempted. Cards got a status accent, clearer option labels
// ("Your answer" / "Correct answer") and difficulty/time chips.
//
// Dark/brand theme, continuing on from the Result page. Only the live
// engine (PracticeTestPlay.jsx) stays light/white.
//
// NOTE: <main> in App.jsx is the scroll container (overflow-y-auto), so
// `sticky top-0` below sticks to the top of that area, not the window.

import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { getPracticeSolutions } from '@/api/practiceAttempts'
import { sanitizeHtml } from '@/utils/sanitizeHtml'
import { formatReasoningText } from '@/utils/formatDirectionText'
import AttemptSwitcher from '@/components/practicetest/AttemptSwitcher'

const STATUS_META = {
  correct: {
    label: 'Correct',
    icon: 'ti-check',
    badge: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
    accent: 'border-l-emerald-500/70',
    dot: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40',
    chip: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25',
  },
  wrong: {
    label: 'Incorrect',
    icon: 'ti-x',
    badge: 'bg-red-500/10 text-red-400 border-red-500/30',
    accent: 'border-l-red-500/70',
    dot: 'bg-red-500/15 text-red-300 border-red-500/40',
    chip: 'bg-red-500/10 text-red-400 border-red-500/25',
  },
  skipped: {
    label: 'Unattempted',
    icon: 'ti-minus',
    badge: 'bg-slate-800 text-slate-400 border-slate-700',
    accent: 'border-l-slate-600',
    dot: 'bg-slate-800/80 text-slate-400 border-slate-700',
    chip: 'bg-slate-800/80 text-slate-400 border-slate-700',
  },
}

const FILTERS = [
  { key: 'all', label: 'All', active: 'bg-slate-200 text-slate-900 border-slate-200' },
  { key: 'correct', label: 'Correct', active: 'bg-emerald-500 text-white border-emerald-500' },
  { key: 'wrong', label: 'Incorrect', active: 'bg-red-500 text-white border-red-500' },
  { key: 'skipped', label: 'Unattempted', active: 'bg-slate-500 text-white border-slate-500' },
]

const DIFFICULTY_CLASS = {
  easy: 'text-emerald-400 bg-emerald-500/10',
  medium: 'text-amber-400 bg-amber-500/10',
  hard: 'text-red-400 bg-red-500/10',
}

function statusOf(q) {
  if (q.userAnswer == null) return 'skipped'
  return q.wasCorrect ? 'correct' : 'wrong'
}

function formatSec(s) {
  const total = Math.round(s || 0)
  return `${Math.floor(total / 60)}m ${total % 60}s`
}

function countStatuses(questions) {
  const c = { correct: 0, wrong: 0, skipped: 0 }
  for (const q of questions) c[statusOf(q)] += 1
  return c
}

function StatChip({ status, value }) {
  const meta = STATUS_META[status]
  return (
    <span
      title={meta.label}
      className={`flex items-center gap-1 px-2 py-1 rounded-lg border text-[11px] font-bold ${meta.chip}`}
    >
      <i className={`ti ${meta.icon} text-[11px]`} /> {value}
    </span>
  )
}

function QuestionCard({ q, highlighted, scrollMarginTop }) {
  const status = statusOf(q)
  const meta = STATUS_META[status]
  const hasCommunityTime = q.avgTimeSec != null && q.avgTimeSampleSize >= 3
  const options = Array.isArray(q.options) ? q.options : []
  const diffClass = DIFFICULTY_CLASS[(q.difficulty || '').toLowerCase()] || 'text-slate-400 bg-slate-800/80'
  const fasterThanClass = hasCommunityTime && (q.userTimeSec || 0) <= q.avgTimeSec

  return (
    <div
      id={`q-${q.qNo}`}
      style={{ scrollMarginTop }}
      className={`rounded-2xl border border-l-4 px-4 py-4 transition-colors ${
        highlighted
          ? 'border-tapasya-orange border-l-tapasya-orange bg-tapasya-orange/10'
          : `border-slate-800 bg-slate-900/60 ${meta.accent}`
      }`}
    >
      <div className="flex items-center justify-between mb-2.5">
        <span className="text-xs font-black text-slate-400 tracking-wide">Q{q.qNo}</span>
        <span className={`flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md border ${meta.badge}`}>
          <i className={`ti ${meta.icon} text-[10px]`} /> {meta.label}
        </span>
      </div>

      <p
        className="text-[15px] leading-relaxed text-slate-100 mb-3.5 whitespace-pre-wrap"
        dangerouslySetInnerHTML={{ __html: sanitizeHtml(formatReasoningText(q.questionText)) }}
      />

      <div className="space-y-1.5 mb-3.5">
        {options.map((opt, oi) => {
          const isCorrect = opt.key === q.correctKey
          const isUser = opt.key === q.userAnswer
          let rowCls = 'border-slate-700/80 text-slate-300'
          let keyCls = 'bg-slate-800 text-slate-400'
          if (isCorrect) {
            rowCls = 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200'
            keyCls = 'bg-emerald-500/20 text-emerald-300'
          } else if (isUser) {
            rowCls = 'border-red-500/40 bg-red-500/10 text-red-200'
            keyCls = 'bg-red-500/20 text-red-300'
          }
          return (
            <div key={opt.key ?? oi} className={`flex items-center gap-2.5 rounded-xl border px-3 py-2 text-[13px] ${rowCls}`}>
              <span className={`w-6 h-6 shrink-0 rounded-md flex items-center justify-center text-[11px] font-black ${keyCls}`}>{opt.key}</span>
              <span className="whitespace-pre-wrap min-w-0" dangerouslySetInnerHTML={{ __html: sanitizeHtml(opt.text) }} />
              <span className="ml-auto flex items-center gap-1.5 shrink-0 pl-2">
                {isUser && (
                  <span className={`text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded ${isCorrect ? 'bg-emerald-500/20 text-emerald-300' : 'bg-red-500/20 text-red-300'}`}>
                    Your answer
                  </span>
                )}
                {isCorrect && !isUser && (
                  <span className="text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300">
                    Correct answer
                  </span>
                )}
                {isCorrect && <i className="ti ti-check text-emerald-400" />}
                {isUser && !isCorrect && <i className="ti ti-x text-red-400" />}
              </span>
            </div>
          )
        })}
      </div>

      {q.explanation && (
        <div className="rounded-xl bg-slate-800/50 border border-slate-800 px-3.5 py-3 text-[13px] leading-relaxed text-slate-300 mb-3">
          <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-tapasya-orange mb-1">
            <i className="ti ti-bulb" /> Explanation
          </p>
          <div className="whitespace-pre-wrap" dangerouslySetInnerHTML={{ __html: sanitizeHtml(formatReasoningText(q.explanation)) }} />
        </div>
      )}

      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-1.5 flex-wrap text-[10px]">
          {q.topic && <span className="px-2 py-0.5 rounded-md bg-slate-800/80 text-slate-400">{q.topic}</span>}
          {q.subTopic && <span className="px-2 py-0.5 rounded-md bg-slate-800/80 text-slate-400">{q.subTopic}</span>}
          {q.difficulty && <span className={`px-2 py-0.5 rounded-md font-semibold capitalize ${diffClass}`}>{q.difficulty}</span>}
        </div>
        <div className="flex items-center gap-3 text-[11px] text-slate-500">
          <span className="flex items-center gap-1"><i className="ti ti-clock" /> You: {formatSec(q.userTimeSec)}</span>
          {hasCommunityTime && (
            <span
              className={`flex items-center gap-1 ${fasterThanClass ? 'text-emerald-400' : 'text-amber-400'}`}
              title={`${q.avgTimeSampleSize} students ke data se`}
            >
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
  const [filter, setFilter] = useState('all')
  const [pendingQ, setPendingQ] = useState(null)
  const [headerH, setHeaderH] = useState(170)
  const [error, setError] = useState('')
  const scrolledRef = useRef(false)
  const headerRef = useRef(null)

  useEffect(() => {
    setSections(null)
    setFilter('all')
    scrolledRef.current = false
    getPracticeSolutions(attemptId).then((data) => {
      const loaded = Array.isArray(data?.sections)
        ? data.sections.map((s) => ({ ...s, questions: Array.isArray(s?.questions) ? s.questions : [], directions: Array.isArray(s?.directions) ? s.directions : [] }))
        : []
      if (loaded.length === 0) { setError('Is test mein solutions available nahi hain'); return }
      setSections(loaded)
      setTestId(data.testId)
      setActiveSection(0)
      if (jumpQNo != null) {
        const idx = loaded.findIndex((s) => s.questions.some((q) => q.qNo === jumpQNo))
        if (idx >= 0) setActiveSection(idx)
      }
    }).catch(() => setError('Solutions load nahi ho paye'))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attemptId])

  // Sticky header height changes with the number of rows (tabs only when
  // there is more than one section, wraps on small screens). Measure it so
  // jump-to-question lands just below the header instead of behind it.
  useEffect(() => {
    const el = headerRef.current
    if (!el) return undefined
    const update = () => setHeaderH(el.offsetHeight)
    update()
    if (typeof ResizeObserver === 'undefined') return undefined
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [sections])

  // Deep link (?qNo=) — scroll once after the first render of that section.
  useEffect(() => {
    if (!sections || scrolledRef.current || jumpQNo == null) return
    const el = document.getElementById(`q-${jumpQNo}`)
    if (el) { el.scrollIntoView({ behavior: 'smooth', block: 'start' }); scrolledRef.current = true }
  }, [sections, activeSection, jumpQNo, headerH])

  // Palette click — may need the filter reset first, so scroll after render.
  useEffect(() => {
    if (pendingQ == null) return
    const el = document.getElementById(`q-${pendingQ}`)
    if (el) { el.scrollIntoView({ behavior: 'smooth', block: 'start' }); setPendingQ(null) }
  }, [pendingQ, filter, activeSection, sections])

  if (error) {
    return <div className="min-h-screen bg-[#0f172a] flex items-center justify-center text-red-400 text-sm px-4 text-center">{error}</div>
  }
  if (!sections) {
    return (
      <div className="min-h-screen bg-[#0f172a] px-4 py-6 md:px-8 max-w-3xl mx-auto space-y-3">
        <div className="h-10 rounded-xl bg-slate-800/60 animate-pulse" />
        {[1, 2, 3].map((i) => <div key={i} className="h-32 rounded-2xl bg-slate-800/60 animate-pulse" />)}
      </div>
    )
  }

  const section = sections[activeSection] || sections[0]
  const overall = countStatuses(sections.flatMap((s) => s.questions))
  const sectionCounts = countStatuses(section.questions)
  const visibleQuestions = filter === 'all' ? section.questions : section.questions.filter((q) => statusOf(q) === filter)

  function goToQuestion(q) {
    if (filter !== 'all' && statusOf(q) !== filter) setFilter('all')
    setPendingQ(q.qNo)
  }

  // Group consecutive questions by groupId so a shared passage/puzzle/table
  // renders once above the questions that point to it.
  const groups = []
  let lastGroupId
  for (const q of visibleQuestions) {
    if (q.groupId && q.groupId === lastGroupId) {
      groups[groups.length - 1].questions.push(q)
    } else {
      groups.push({ groupId: q.groupId, questions: [q] })
      lastGroupId = q.groupId
    }
  }

  return (
    <div className="min-h-screen bg-[#0f172a] px-4 md:px-8 pb-10 max-w-3xl mx-auto">
      {/* ── Sticky header ─────────────────────────────────────────── */}
      <div
        ref={headerRef}
        className="sticky top-0 z-20 -mx-4 md:-mx-8 px-4 md:px-8 pt-4 pb-3 bg-[#0f172a]/95 backdrop-blur border-b border-slate-800/80"
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => navigate(`/practice-tests/result/${attemptId}`)}
              title="Back to Result"
              aria-label="Back to Result"
              className="w-8 h-8 shrink-0 rounded-lg bg-slate-800/60 text-slate-300 hover:text-white hover:bg-slate-800 flex items-center justify-center"
            >
              <i className="ti ti-arrow-left" />
            </button>
            <div className="min-w-0">
              <h1 className="text-lg font-black text-white leading-tight">Solutions</h1>
              <p className="text-[11px] text-slate-500 leading-tight truncate">
                {sections.reduce((n, s) => n + s.questions.length, 0)} questions
                {sections.length > 1 ? ` · ${sections.length} sections` : ''}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <StatChip status="correct" value={overall.correct} />
            <StatChip status="wrong" value={overall.wrong} />
            <StatChip status="skipped" value={overall.skipped} />
          </div>
        </div>

        {sections.length > 1 && (
          <div className="flex gap-2 overflow-x-auto no-scrollbar mt-3">
            {sections.map((s, i) => {
              const c = countStatuses(s.questions)
              const active = activeSection === i
              return (
                <button
                  key={s.name ?? i}
                  onClick={() => { setActiveSection(i); scrolledRef.current = true }}
                  className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap flex items-center gap-1.5 ${
                    active ? 'bg-tapasya-orange text-white' : 'bg-slate-800/60 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {s.name}
                  <span className={`text-[10px] font-semibold ${active ? 'text-white/80' : 'text-slate-500'}`}>
                    {c.correct}/{s.questions.length}
                  </span>
                </button>
              )
            })}
          </div>
        )}

        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar mt-3">
          {FILTERS.map((f) => {
            const count = f.key === 'all' ? section.questions.length : sectionCounts[f.key]
            const active = filter === f.key
            return (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={`shrink-0 px-2.5 py-1 rounded-full border text-[11px] font-bold flex items-center gap-1.5 ${
                  active ? f.active : 'border-slate-700 text-slate-400 hover:text-slate-200 hover:border-slate-600'
                }`}
              >
                {f.label}
                <span className={`text-[10px] ${active ? 'opacity-80' : 'text-slate-500'}`}>{count}</span>
              </button>
            )
          })}
        </div>

        <div className="flex gap-1.5 overflow-x-auto no-scrollbar mt-2.5 pb-0.5">
          {section.questions.map((q) => {
            const st = statusOf(q)
            const dimmed = filter !== 'all' && st !== filter
            return (
              <button
                key={q.qNo}
                onClick={() => goToQuestion(q)}
                title={`Q${q.qNo} · ${STATUS_META[st].label}`}
                className={`w-7 h-7 shrink-0 rounded-md border text-[11px] font-bold transition-opacity ${STATUS_META[st].dot} ${dimmed ? 'opacity-30' : ''} ${
                  q.qNo === jumpQNo ? 'ring-1 ring-tapasya-orange' : ''
                }`}
              >
                {q.qNo}
              </button>
            )
          })}
        </div>
      </div>

      {/* ── Content ───────────────────────────────────────────────── */}
      <div className="pt-4">
        <AttemptSwitcher testId={testId} currentAttemptId={attemptId} basePath="solutions" />

        {groups.length === 0 ? (
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 px-4 py-10 text-center">
            <p className="text-sm text-slate-400">Is filter mein koi question nahi hai.</p>
            <button
              onClick={() => setFilter('all')}
              className="mt-3 px-3 py-1.5 rounded-lg bg-slate-800 text-slate-200 text-xs font-bold hover:bg-slate-700"
            >
              Show all questions
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {groups.map((g, gi) => {
              const direction = g.groupId ? section.directions.find((d) => d.groupId === g.groupId) : null
              return (
                <div key={gi} className="space-y-3">
                  {direction && (
                    <div className="rounded-2xl border border-slate-800 bg-slate-900/60 px-4 py-3.5">
                      <p className="flex items-center gap-1.5 text-xs font-bold text-slate-200 mb-1">
                        <i className="ti ti-info-circle text-tapasya-orange" /> {direction.title || 'Directions'}
                      </p>
                      <div
                        className="text-[13px] leading-relaxed text-slate-400 whitespace-pre-wrap [&_table]:whitespace-normal"
                        dangerouslySetInnerHTML={{ __html: sanitizeHtml(formatReasoningText(direction.content, { isDirection: true })) }}
                      />
                    </div>
                  )}
                  {g.questions.map((q) => (
                    <QuestionCard key={q.qNo} q={q} highlighted={q.qNo === jumpQNo} scrollMarginTop={headerH + 12} />
                  ))}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}