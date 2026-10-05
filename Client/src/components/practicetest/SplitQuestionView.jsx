// src/components/practicetest/SplitQuestionView.jsx
// Question renderer. Layout adapts to screen:
//   • no direction          -> single scrolling column (max-w-3xl, centered)
//   • direction + width>=640 -> side-by-side (passage | question), each with its own scroll
//   • direction + phone     -> stacked: collapsible passage on top (max 40% height,
//                              own scroll) + question below (own scroll)
// Question text is ALWAYS visible — it never gets squeezed out by other panels.
//
// Wrapped in React.memo and fed stable props so selecting an option or a
// timer tick elsewhere doesn't re-render / re-sanitize everything (low-RAM friendly).
//
// Left panel still blocks mouse-wheel scrolling on desktop (intentional, exam-style —
// drag the thick scrollbar). Touch scrolling is untouched.
//
// whitespace-pre-wrap is deliberate: AI-imported paper text relies on literal
// spacing/line breaks (coding-decoding rows, puzzle paragraphs).

import { memo, useMemo, useState, useEffect } from 'react'
import { sanitizeHtml } from '@/utils/sanitizeHtml'
import { formatReasoningText } from '@/utils/formatDirectionText'
import useMediaQuery from '@/hooks/useMediaQuery'

const FONT_LEVELS = [
  { question: 16, option: 15, direction: 14 },
  { question: 17, option: 16, direction: 15 }, // default
  { question: 19, option: 17, direction: 16 },
  { question: 21, option: 18, direction: 17 },
]

function blockWheel(e) { e.preventDefault() }

const tableCls =
  '[&_table]:w-full [&_table]:border-collapse [&_table]:whitespace-normal [&_td]:border [&_td]:border-slate-200 [&_td]:px-2 [&_td]:py-1 [&_th]:border [&_th]:border-slate-200 [&_th]:px-2 [&_th]:py-1 [&_img]:max-w-full [&_img]:h-auto'

function SplitQuestionView({ question, direction, qNo, selectedKey, onSelectOption, fontScale = 1, isFirstInGroup = true }) {
  const wide = useMediaQuery('(min-width: 640px)')
  const isLg = useMediaQuery('(min-width: 1024px)')
  // Phone + tablet (< lg): the shared direction opens by itself only on the FIRST
  // question of its group. On the later questions it stays folded behind a one-tap
  // "Directions" bar, so the question gets the whole screen. Desktop (lg+) always
  // shows it side by side, as before.
  const [passageOpen, setPassageOpen] = useState(isLg || isFirstInGroup)
  useEffect(() => { setPassageOpen(isLg || isFirstInGroup) }, [qNo, isLg, isFirstInGroup])

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
    <div className="flex flex-col gap-4 pb-4">
      <div
        className={`text-slate-800 font-bold leading-relaxed whitespace-pre-wrap break-words ${tableCls}`}
        style={{ fontSize: sizes.question }}
        dangerouslySetInnerHTML={{ __html: safeQuestionHtml }}
      />
      <div className="flex flex-col gap-2" role="radiogroup">
        {question.options.map((opt) => {
          const isSelected = selectedKey === opt.key
          return (
            <label
              key={opt.key}
              className={`flex items-start gap-3 px-3 py-2.5 min-h-[42px] rounded-lg border cursor-pointer select-none active:scale-[0.99] ${
                isSelected ? 'border-tapasya-orange bg-tapasya-orange/5' : 'border-slate-200 bg-white'
              }`}
            >
              <input
                type="radio"
                name={`q-${qNo}`}
                checked={isSelected}
                onChange={() => onSelectOption(qNo, opt.key)}
                className="mt-1 w-4 h-4 shrink-0 accent-tapasya-orange"
              />
              <span className="text-slate-800 font-medium whitespace-pre-wrap break-words min-w-0" style={{ fontSize: sizes.option }}>{opt.text}</span>
            </label>
          )
        })}
      </div>
    </div>
  )

  const scrollCls = 'overflow-y-auto overscroll-contain [-webkit-overflow-scrolling:touch]'

  // Mode 1: standalone question
  if (!direction) {
    return (
      <div className={`flex-1 min-h-0 bg-white px-3.5 sm:px-6 py-4 ${scrollCls}`}>
        <div className="max-w-3xl mx-auto">{questionBlock}</div>
      </div>
    )
  }

  const passage = (
    <>
      {direction.title && <p className="text-sm font-bold text-slate-800 mb-2">{direction.title}</p>}
      <div
        className={`text-slate-800 leading-relaxed whitespace-pre-wrap break-words ${tableCls}`}
        style={{ fontSize: sizes.direction }}
        dangerouslySetInnerHTML={{ __html: safeDirectionHtml }}
      />
    </>
  )

  // Folded state (phone + tablet, later questions of a group): slim bar + full-width question
  if (!isLg && !passageOpen) {
    return (
      <div className="flex-1 flex flex-col min-h-0 bg-white">
        <button type="button" onClick={() => setPassageOpen(true)}
          className="shrink-0 flex items-center justify-between px-3.5 sm:px-6 py-2 bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-600 uppercase tracking-wide active:bg-slate-100">
          <span className="flex items-center gap-1.5"><i className="ti ti-file-text text-sm" /> Directions dekhein</span>
          <i className="ti ti-chevron-down text-base" />
        </button>
        <div className={`flex-1 min-h-0 px-3.5 sm:px-6 py-3.5 ${scrollCls}`}>
          <div className="max-w-3xl mx-auto">{questionBlock}</div>
        </div>
      </div>
    )
  }

  // Mode 2a: tablet / landscape / desktop — side by side
  if (wide) {
    return (
      <div className="flex-1 flex min-h-0 bg-white">
        <div className="w-1/2 flex flex-col min-h-0 border-r border-slate-200">
          {!isLg && (
            <button type="button" onClick={() => setPassageOpen(false)}
              className="shrink-0 flex items-center justify-between px-4 sm:px-6 py-2 bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-600 uppercase tracking-wide active:bg-slate-100">
              <span className="flex items-center gap-1.5"><i className="ti ti-file-text text-sm" /> Directions</span>
              <span className="flex items-center gap-1 normal-case font-semibold text-slate-400">Hide <i className="ti ti-x text-sm" /></span>
            </button>
          )}
          <div className={`flex-1 min-h-0 exam-scrollbar px-4 sm:px-6 py-4 ${scrollCls}`} onWheelCapture={blockWheel}>
            {passage}
          </div>
        </div>
        <div className={`w-1/2 min-w-0 px-4 sm:px-6 py-4 ${scrollCls}`}>{questionBlock}</div>
      </div>
    )
  }

  // Mode 2b: phone portrait — passage panel on top (first question), question below
  return (
    <div className="flex-1 flex flex-col min-h-0 bg-white">
      <div className="shrink-0 border-b border-slate-200 bg-slate-50 flex flex-col" style={{ maxHeight: '40%' }}>
        <button type="button" onClick={() => setPassageOpen(false)}
          className="shrink-0 flex items-center justify-between px-3.5 py-2 text-xs font-bold text-slate-600 uppercase tracking-wide active:bg-slate-100">
          <span className="flex items-center gap-1.5"><i className="ti ti-file-text text-sm" /> Directions / Passage</span>
          <i className="ti ti-chevron-up text-base" />
        </button>
        <div className={`min-h-0 px-3.5 pb-3 ${scrollCls}`}>{passage}</div>
      </div>
      <div className={`flex-1 min-h-0 px-3.5 py-3.5 ${scrollCls}`}>{questionBlock}</div>
    </div>
  )
}

export default memo(SplitQuestionView)