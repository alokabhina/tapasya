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
// Left panel deliberately blocks wheel/trackpad scrolling (onWheelCapture
// below) and only scrolls via dragging the visible scrollbar thumb — this
// mirrors real bank-exam software on purpose now (Alok's explicit call;
// the reference UI's "bug" the old comment here used to avoid is the
// wanted behaviour). Touch-drag on mobile/tablet is left untouched since
// that's the only scroll gesture touch devices have. See .exam-scrollbar
// in styles/globals.css for the thicker, grabbable scrollbar this needs.
//
// fontScale (0-3, see FONT_LEVELS) drives question/option/direction text
// size — TestHeader's A-/A+ buttons control it, state lives in
// PracticeTestPlay.jsx (persisted to localStorage).
//
// whitespace-pre-wrap on every text container below (question, options,
// direction) — content comes from AI-imported paper text and often relies
// on literal spacing/line breaks that matter: coding-decoding rows aligned
// with runs of spaces, or a blank line separating a puzzle's "Directions"
// paragraph from the question. Default HTML whitespace handling collapses
// all of that into one line/one space, which is exactly the "space missing"
// / "sab chipka hua" bug — pre-wrap preserves it while still wrapping long
// lines normally. Real <table> markup inside direction.content is reset
// back to whitespace-normal (see [&_table]:whitespace-normal below) since
// that's genuinely structured HTML, not manually-spaced plain text.
//
// Light theme — matches the reference screenshot exactly. The "Qn. Time"
// stopwatch (with its eye-icon toggle) and the Q-no/Marks line used to
// live here but moved up into SectionTabs.jsx's combined top bar
// (Round-2 Issue B) — this component only renders the question + options
// now.

import { useMemo } from 'react'
import { sanitizeHtml } from '@/utils/sanitizeHtml'
import { formatReasoningText } from '@/utils/formatDirectionText'

const FONT_LEVELS = [
  { question: 16, option: 14, direction: 13 },
  { question: 17, option: 15, direction: 14 }, // default — a step up from the old fixed sizes
  { question: 19, option: 16, direction: 15 },
  { question: 21, option: 17, direction: 16 },
]

function blockWheel(e) { e.preventDefault() }

export default function SplitQuestionView({
  question,
  direction,
  qNo,
  selectedKey,
  onSelectOption,
  fontScale = 1,
}) {
  const safeDirectionHtml = useMemo(
    () => sanitizeHtml(formatReasoningText(direction?.content, { isDirection: true })),
    [direction?.content],
  )
  const safeQuestionHtml = useMemo(
    () => sanitizeHtml(formatReasoningText(question?.questionText)),
    [question?.questionText],
  )
  const sizes = FONT_LEVELS[Math.min(Math.max(fontScale, 0), FONT_LEVELS.length - 1)]

  if (!question) return null

  const questionBlock = (
    <div className="flex flex-col gap-4">
      <div
        className="text-slate-800 font-bold leading-relaxed whitespace-pre-wrap"
        style={{ fontSize: sizes.question }}
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
              <span className="text-slate-800 font-medium whitespace-pre-wrap" style={{ fontSize: sizes.option }}>{opt.text}</span>
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
      <div
        className="md:w-1/2 border-b md:border-b-0 md:border-r border-slate-200 overflow-y-auto exam-scrollbar px-4 sm:px-6 py-5"
        onWheelCapture={blockWheel}
      >
        {direction.title && <p className="text-sm font-bold text-slate-800 mb-2">{direction.title}</p>}
        <div
          className="text-slate-800 leading-relaxed whitespace-pre-wrap [&_table]:w-full [&_table]:border-collapse [&_table]:whitespace-normal [&_td]:border [&_td]:border-slate-200 [&_td]:px-2 [&_td]:py-1 [&_th]:border [&_th]:border-slate-200 [&_th]:px-2 [&_th]:py-1"
          style={{ fontSize: sizes.direction }}
          dangerouslySetInnerHTML={{ __html: safeDirectionHtml }}
        />
      </div>
      <div className="md:w-1/2 overflow-y-auto px-4 sm:px-6 py-5">
        {questionBlock}
      </div>
    </div>
  )
}