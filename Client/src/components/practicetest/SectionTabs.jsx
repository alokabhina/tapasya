// src/components/practicetest/SectionTabs.jsx
// Section tabs + live question info (Qn. Time / Marks / Q-no).
// Phone: two tidy rows (scrollable tabs, then a small info strip).
// md+: one row. Completed sections stay visible but locked.
//
// <QuestionTimer/> is a self-ticking leaf so the 1-second Qn. Time update
// never re-renders the question body.

import { memo, useEffect, useRef, useState } from 'react'

const QuestionTimer = memo(function QuestionTimer({ baseSec, startRef, paused, qNo }) {
  const [show, setShow] = useState(true)
  const calc = () => Math.max(0, Math.floor((baseSec || 0) + (Date.now() - startRef.current) / 1000))
  const [secs, setSecs] = useState(calc)

  useEffect(() => { setShow(true) }, [qNo])
  useEffect(() => {
    setSecs(calc())
    if (paused || !show) return
    const id = setInterval(() => setSecs(calc()), 1000)
    return () => clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qNo, paused, show, baseSec])

  return (
    <span className="flex items-center gap-1.5 text-[11px] sm:text-xs text-slate-500 whitespace-nowrap">
      {show ? (
        <>
          <i className="ti ti-clock text-sm" />
          <span className="tabular-nums">Qn. Time : {String(Math.floor(secs / 60)).padStart(2, '0')}:{String(secs % 60).padStart(2, '0')}</span>
        </>
      ) : (
        <span className="text-slate-400">Qn. Time hidden</span>
      )}
      <button type="button" onClick={() => setShow((v) => !v)} title={show ? 'Hide question timer' : 'Show question timer'}
        className="text-slate-400 active:text-slate-600 p-0.5">
        <i className={`ti ${show ? 'ti-eye' : 'ti-eye-off'} text-sm`} />
      </button>
    </span>
  )
})

export default function SectionTabs({
  sections, currentSectionIndex, qNo, displayPosition, marksCorrect, marksWrong,
  questionBaseSec, questionStartRef, paused,
}) {
  const activeRef = useRef(null)
  useEffect(() => {
    activeRef.current?.scrollIntoView?.({ inline: 'center', block: 'nearest' })
  }, [currentSectionIndex])

  return (
    <div className="shrink-0 flex flex-col md:flex-row md:items-center bg-white border-b border-slate-200">
      <div className="min-w-0 flex-1 flex items-center gap-5 overflow-x-auto no-scrollbar px-3 sm:px-5 pt-2 md:pt-3">
        {sections.map((section, i) => {
          const isCurrent = i === currentSectionIndex
          const isCompleted = i < currentSectionIndex
          return (
            <span
              key={section.name}
              ref={isCurrent ? activeRef : null}
              title={isCompleted ? 'Yeh section submit ho chuka hai — wapas nahi ja sakte' : section.name}
              className={`shrink-0 flex items-center gap-1.5 text-[13px] sm:text-sm font-semibold whitespace-nowrap pb-1.5 border-b-2 ${
                isCurrent ? 'text-tapasya-orange border-tapasya-orange'
                  : isCompleted ? 'text-slate-400 border-transparent' : 'text-slate-500 border-transparent'
              }`}
            >
              {section.name}
              {isCompleted && <i className="ti ti-lock text-xs" />}
            </span>
          )
        })}
      </div>

      <div className="shrink-0 flex items-center justify-between md:justify-end gap-3 md:gap-4 px-3 sm:px-5 py-1.5 md:py-3 bg-slate-50 md:bg-white border-t border-slate-100 md:border-t-0">
        <QuestionTimer baseSec={questionBaseSec} startRef={questionStartRef} paused={paused} qNo={qNo} />
        <span className="text-[11px] sm:text-xs text-slate-500 whitespace-nowrap">
          Marks : <span className="text-emerald-600 font-semibold">+{marksCorrect}</span>
          {' | '}
          <span className="text-red-600 font-semibold">-{marksWrong}</span>
        </span>
        <span className="flex items-center gap-1 text-[11px] sm:text-xs text-slate-500 whitespace-nowrap md:pl-3 md:border-l md:border-slate-200">
          <i className="ti ti-list-numbers text-sm" /> Q: {displayPosition}
        </span>
      </div>
    </div>
  )
}