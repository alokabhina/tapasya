// src/components/practicetest/SplitQuestionView.jsx
// The core question renderer — one component handles all 3 layout modes
// from the reference UI (plan doc Section 7.3), driven entirely by whether
// `direction` is present:
//   1. direction == null  -> full-width single question (standalone)
//   2. direction present  -> left panel (shared passage/puzzle/table/
//                            instruction) + right panel (this question's
//                            stem + options)
// The same `direction` object/reference is reused unchanged across every
// question in its group, so pass the same reference in from the parent —
// that's what keeps the left panel from remounting/flickering while
// navigating within a group.
//
// Left panel scrolls with a normal mouse wheel (plain `overflow-y-auto`,
// no scroll-blocking JS anywhere). The reference UI (Guidely) has a known
// bug where only scrollbar-drag works there — we deliberately don't
// reproduce that, see practice-test-feature-plan.md Section 7.3.
//
// Light theme — matches the reference screenshot exactly. The "Qn. Time"
// stopwatch (with its eye-icon toggle) and the Q-no/Marks line used to
// live here but moved up into SectionTabs.jsx's combined top bar
// (Round-2 Issue B) — this component only renders the question + options
// now.

import { useMemo } from 'react'
import { sanitizeHtml } from '@/utils/sanitizeHtml'

export default function SplitQuestionView({
  question,
  direction,
  qNo,
  selectedKey,
  onSelectOption,
}) {
  const safeDirectionHtml = useMemo(() => sanitizeHtml(direction?.content), [direction?.content])
  const safeQuestionHtml = useMemo(() => sanitizeHtml(question?.questionText), [question?.questionText])

  if (!question) return null

  const questionBlock = (
    <div className="flex flex-col gap-4">
      <div
        className="text-slate-800 text-base font-semibold leading-relaxed"
        dangerouslySetInnerHTML={{ __html: safeQuestionHtml }}
      />

      <div className="flex flex-col gap-2.5">
        {question.options.map((opt) => {
          const isSelected = selectedKey === opt.key
          return (
            <label
              key={opt.key}
              className={`flex items-start gap-3 px-4 py-3 rounded-xl border cursor-pointer transition-colors ${
                isSelected
                  ? 'border-tapasya-orange bg-tapasya-orange/5'
                  : 'border-slate-200 hover:border-slate-300 bg-white'
              }`}
            >
              <input
                type="radio"
                name={`q-${qNo}`}
                checked={isSelected}
                onChange={() => onSelectOption(opt.key)}
                className="mt-1 accent-tapasya-orange"
              />
              <span className="text-sm text-slate-700">{opt.text}</span>
            </label>
          )
        })}
      </div>
    </div>
  )

  // Mode 1: standalone, no shared context — full width
  if (!direction) {
    return (
      <div className="flex-1 overflow-y-auto bg-white px-4 sm:px-6 py-5">
        <div className="max-w-2xl mx-auto">
          {questionBlock}
        </div>
      </div>
    )
  }

  // Mode 2: split — left shared context, right this question
  return (
    <div className="flex-1 flex flex-col md:flex-row min-h-0 bg-white">
      <div className="md:w-1/2 border-b md:border-b-0 md:border-r border-slate-200 overflow-y-auto px-4 sm:px-6 py-5">
        {direction.title && <p className="text-sm font-bold text-slate-800 mb-2">{direction.title}</p>}
        <div
          className="text-sm text-slate-600 leading-relaxed [&_table]:w-full [&_table]:border-collapse [&_td]:border [&_td]:border-slate-200 [&_td]:px-2 [&_td]:py-1 [&_th]:border [&_th]:border-slate-200 [&_th]:px-2 [&_th]:py-1"
          dangerouslySetInnerHTML={{ __html: safeDirectionHtml }}
        />
      </div>
      <div className="md:w-1/2 overflow-y-auto px-4 sm:px-6 py-5">
        {questionBlock}
      </div>
    </div>
  )
}