// src/components/practicetest/SectionTabs.jsx
// Top bar row below TestHeader — section tabs on the left, the live
// question's Qn.Time (eye-toggle) / Marks / Q-no on the right. Reference-UI
// rule: a completed section's tab stays visible but is NOT clickable — once
// you submit/move past a section you can't go back into it, that's the
// banking-exam convention this replicates.
//
// Round-3 layout fix: the Submit button used to live in this row (Round-2
// Issue B) — it moved down into ActionBar.jsx's bottom-right corner next to
// "Save & Next" instead, so this toolbar isn't as cramped. In its place,
// the Qn.Time pill now sits first (was Q-no's spot) since it's checked far
// more often mid-question, and Q-no moved to the right end with its own
// small margin/divider.
//
// The "hide Qn. Time" eye-toggle used to live inside SplitQuestionView —
// it moved here along with the rest of the Q-info line, and still resets
// back to visible on every new question via the `qNo` prop.
//
// Light theme, matches the reference (Guidely) screenshot.

import { useEffect, useState } from 'react'

export default function SectionTabs({
  sections,
  currentSectionIndex,
  qNo,
  displayPosition,
  marksCorrect,
  marksWrong,
  questionTimeSec,
}) {
  const [showTimer, setShowTimer] = useState(true)
  useEffect(() => { setShowTimer(true) }, [qNo])

  const mins = Math.floor((questionTimeSec || 0) / 60)
  const secs = Math.floor((questionTimeSec || 0) % 60)

  return (
    <div className="flex flex-wrap items-center gap-4 px-3 sm:px-5 py-3 bg-white border-b border-slate-200">
      <div className="flex items-center gap-5 overflow-x-auto">
        {sections.map((section, i) => {
          const isCurrent = i === currentSectionIndex
          const isCompleted = i < currentSectionIndex
          return (
            <span
              key={section.name}
              title={isCompleted ? 'Yeh section submit ho chuka hai — wapas nahi ja sakte' : section.name}
              className={`flex items-center gap-1.5 text-sm font-semibold whitespace-nowrap pb-1.5 border-b-2 transition-colors ${
                isCurrent
                  ? 'text-tapasya-orange border-tapasya-orange'
                  : isCompleted
                  ? 'text-slate-400 border-transparent cursor-not-allowed'
                  : 'text-slate-500 border-transparent'
              }`}
            >
              {section.name}
              {isCompleted && <i className="ti ti-lock text-xs" />}
              <i className="ti ti-info-circle text-xs opacity-60" />
            </span>
          )
        })}
      </div>

      <div className="flex items-center gap-4 ml-auto text-xs text-slate-500 whitespace-nowrap">
        <span className="flex items-center gap-1.5">
          {showTimer ? (
            <>
              <i className="ti ti-clock text-sm" />
              Qn. Time : {String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}
            </>
          ) : (
            <span className="text-slate-400">Qn. Time hidden</span>
          )}
          <button
            type="button"
            onClick={() => setShowTimer((v) => !v)}
            title={showTimer ? 'Hide question timer' : 'Show question timer'}
            className="text-slate-400 hover:text-slate-600"
          >
            <i className={`ti ${showTimer ? 'ti-eye' : 'ti-eye-off'} text-sm`} />
          </button>
        </span>

        <span>
          Marks : <span className="text-emerald-600 font-semibold">+{marksCorrect}</span>
          {' | '}
          <span className="text-red-600 font-semibold">-{marksWrong}</span>
        </span>

        <span className="flex items-center gap-1 ml-1 pl-3 border-l border-slate-200">
          <i className="ti ti-list-numbers text-sm" /> Q: {displayPosition}
        </span>
      </div>
    </div>
  )
}