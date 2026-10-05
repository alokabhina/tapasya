// src/components/practicetest/CandidatePalette.jsx
// Question palette. Two presentations, one component:
//   • lg+ (desktop / tablet landscape): permanent right sidebar
//   • below lg (phones, tablet portrait): slide-in drawer, opened from the
//     header grid icon — only mounted while open, so it costs nothing otherwise.
// This is what fixes the old "palette eats the whole phone screen and the
// question disappears" layout.
//
// Colors: green = answered, red = not answered, grey = not visited,
// purple = marked, purple+green ring = answered & marked.

import { memo, useEffect } from 'react'
import useMediaQuery from '@/hooks/useMediaQuery'

const STATUS_STYLES = {
  answered: 'bg-emerald-500 text-white',
  'not-answered': 'bg-red-500 text-white',
  'not-visited': 'bg-slate-200 text-slate-600',
  marked: 'bg-purple-500 text-white',
  'answered-marked': 'bg-purple-500 text-white ring-2 ring-emerald-400 ring-offset-1 ring-offset-white',
}

function statusOf(responses, qNo) {
  return responses[qNo]?.status || 'not-visited'
}

function PaletteBody({ userName, photoURL, sectionName, questions, responses, currentQNo, onJump, isLastSection, submitting, onSubmitSection, onClose }) {
  const counts = { answered: 0, notAnswered: 0, notVisited: 0, marked: 0, answeredMarked: 0 }
  for (const q of questions) {
    const s = statusOf(responses, q.qNo)
    if (s === 'answered') counts.answered++
    else if (s === 'not-answered') counts.notAnswered++
    else if (s === 'not-visited') counts.notVisited++
    else if (s === 'marked') counts.marked++
    else if (s === 'answered-marked') counts.answeredMarked++
  }

  return (
    <div className="h-full flex flex-col bg-white">
      <div className="shrink-0 flex items-center gap-2 px-4 py-3 border-b border-slate-200">
        {photoURL ? (
          <img src={photoURL} alt="" className="w-8 h-8 rounded-full object-cover" />
        ) : (
          <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 text-xs font-bold">
            {userName?.[0]?.toUpperCase() || 'A'}
          </div>
        )}
        <span className="text-sm font-semibold text-slate-800 truncate flex-1">{userName || 'Aspirant'}</span>
        {onClose && (
          <button type="button" onClick={onClose} aria-label="Close palette" className="w-9 h-9 -mr-2 flex items-center justify-center text-slate-500 active:bg-slate-100 rounded-lg">
            <i className="ti ti-x text-xl" />
          </button>
        )}
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain [-webkit-overflow-scrolling:touch]">
        <div className="grid grid-cols-2 gap-x-2 gap-y-2 px-4 py-3 border-b border-slate-200 text-xs">
          <CountPill color="bg-emerald-500" label="Answered" value={counts.answered} />
          <CountPill color="bg-red-500" label="Not Answered" value={counts.notAnswered} />
          <CountPill color="bg-slate-300" label="Not Visited" value={counts.notVisited} />
          <CountPill color="bg-purple-500" label="Marked" value={counts.marked} />
          <CountPill color="bg-purple-500 ring-2 ring-emerald-400" label="Answered & Marked" value={counts.answeredMarked} full />
        </div>

        <p className="px-4 pt-3 pb-1 text-xs font-bold text-slate-500 uppercase tracking-wide">{sectionName}</p>

        <div className="grid grid-cols-5 gap-1.5 px-4 py-2 pb-4">
          {questions.map((q, i) => {
            const status = statusOf(responses, q.qNo)
            const isCurrent = q.qNo === currentQNo
            return (
              <button
                key={q.qNo}
                type="button"
                onClick={() => onJump(i)}
                className={`h-9 rounded-md text-[13px] font-bold flex items-center justify-center active:scale-95 ${STATUS_STYLES[status]} ${
                  isCurrent ? 'ring-2 ring-offset-2 ring-offset-white ring-tapasya-orange' : ''
                }`}
              >
                {i + 1}
              </button>
            )
          })}
        </div>
      </div>

      <div className="shrink-0 px-4 pt-2.5 border-t border-slate-200 pb-[max(0.625rem,env(safe-area-inset-bottom))]">
        <button
          type="button"
          onClick={onSubmitSection}
          disabled={submitting}
          className="w-full h-9 rounded-lg bg-blue-600 text-white text-[13px] font-bold active:bg-blue-800 hover:bg-blue-700 disabled:opacity-60"
        >
          {isLastSection ? 'Submit' : 'Submit section'}
        </button>
      </div>
    </div>
  )
}

function CandidatePalette({ open, onClose, onJumpToQuestion, ...rest }) {
  const isLg = useMediaQuery('(min-width: 1024px)')

  // lock nothing, just close drawer on Esc
  useEffect(() => {
    if (isLg || !open) return
    const onKey = (e) => { if (e.key === 'Escape') onClose?.() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isLg, open, onClose])

  if (isLg) {
    return (
      <aside className="w-72 shrink-0 border-l border-slate-200 bg-white">
        <PaletteBody {...rest} onJump={onJumpToQuestion} />
      </aside>
    )
  }

  if (!open) return null
  return (
    <div className="fixed inset-0 z-[60]">
      <button type="button" aria-label="Close palette" onClick={onClose} className="absolute inset-0 bg-black/40" />
      <div className="absolute right-0 top-0 bottom-0 w-[86%] max-w-sm shadow-2xl">
        <PaletteBody
          {...rest}
          onClose={onClose}
          // jumping to a question closes the drawer so the question is visible immediately
          onJump={(i) => { onJumpToQuestion(i); onClose?.() }}
          onSubmitSection={() => { onClose?.(); rest.onSubmitSection?.() }}
        />
      </div>
    </div>
  )
}

function CountPill({ color, label, value, full }) {
  return (
    <div className={`flex items-center gap-1.5 ${full ? 'col-span-2' : ''}`}>
      <span className={`w-4 h-4 rounded ${color} shrink-0`} />
      <span className="text-slate-500">{label}:</span>
      <span className="text-slate-800 font-bold">{value}</span>
    </div>
  )
}

export default memo(CandidatePalette)