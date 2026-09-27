// src/components/practicetest/TestPreviewModal.jsx
// Admin-only "Preview" (plan doc Section 8.2 point 6) — opens right after a
// successful Validate, using `validation.normalized.sections` straight from
// the dry-run response (POST /practice-tests/validate never saves
// anything, so this needs no attempt/DB row at all). Reuses the exact same
// SplitQuestionView + SectionTabs the live engine uses, minus timers/submit
// — so admin sees precisely what a student will see before publishing.
//
// Also doubles as the per-question review/edit screen: the right-side grid
// lets the admin jump to any question in the paper, "Show Answer" reveals
// the correct option + explanation for a quick correctness check, and an
// "Edit" toggle turns the question into an editable form (text, options,
// correct answer, explanation, topic/subTopic, difficulty) so a wrong
// answer or typo caught during review can be fixed right here — edits flow
// back up to the parent via onChange(sections), the same payload shape
// PracticeAdminUpload.jsx already saves. Questions whose explanation was
// tagged "ANSWER NOT VERIFIED:" by the import prompt (see
// constants/practiceTestImportPrompt.js) get a warning dot on their grid
// button and an amber banner instead of the usual green one, so those are
// easy to spot while scanning through the whole paper.

import { useState } from 'react'
import SplitQuestionView from './SplitQuestionView'
import { isAnswerUnverified } from '@/constants/practiceTestImportPrompt'

function EditQuestionForm({ question, onPatch }) {
  function patchOption(key, text) {
    onPatch({ options: question.options.map((o) => (o.key === key ? { ...o, text } : o)) })
  }

  return (
    <div className="px-4 sm:px-6 py-4 space-y-3 overflow-y-auto">
      <div>
        <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1 block">Question Text</label>
        <textarea
          value={question.questionText || ''}
          onChange={(e) => onPatch({ questionText: e.target.value })}
          rows={4}
          className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-300 text-slate-800 text-sm focus:outline-none focus:border-tapasya-orange/50"
        />
      </div>

      <div>
        <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1 block">Options — pick the correct one</label>
        <div className="space-y-1.5">
          {question.options.map((o) => (
            <div key={o.key} className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onPatch({ correctKey: o.key })}
                title="Mark as correct"
                className={`w-7 h-7 shrink-0 rounded-lg border text-xs font-bold flex items-center justify-center ${
                  question.correctKey === o.key
                    ? 'bg-emerald-500 border-emerald-500 text-white'
                    : 'border-slate-300 text-slate-400 hover:border-emerald-400 hover:text-emerald-500'
                }`}
              >
                {o.key}
              </button>
              <input
                value={o.text}
                onChange={(e) => patchOption(o.key, e.target.value)}
                className="flex-1 px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-300 text-slate-800 text-sm focus:outline-none focus:border-tapasya-orange/50"
              />
            </div>
          ))}
        </div>
      </div>

      <div>
        <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1 block">Explanation</label>
        <textarea
          value={question.explanation || ''}
          onChange={(e) => onPatch({ explanation: e.target.value })}
          rows={3}
          placeholder="Solving steps / reasoning..."
          className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-300 text-slate-800 text-xs focus:outline-none focus:border-tapasya-orange/50"
        />
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div>
          <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1 block">Topic</label>
          <input
            value={question.topic || ''}
            onChange={(e) => onPatch({ topic: e.target.value })}
            className="w-full px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-300 text-slate-800 text-xs"
          />
        </div>
        <div>
          <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1 block">Sub-topic</label>
          <input
            value={question.subTopic || ''}
            onChange={(e) => onPatch({ subTopic: e.target.value })}
            className="w-full px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-300 text-slate-800 text-xs"
          />
        </div>
        <div>
          <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1 block">Difficulty</label>
          <select
            value={question.difficulty || 'medium'}
            onChange={(e) => onPatch({ difficulty: e.target.value })}
            className="w-full px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-300 text-slate-800 text-xs"
          >
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </select>
        </div>
      </div>
    </div>
  )
}

export default function TestPreviewModal({ sections, onClose, onChange }) {
  const [sectionIndex, setSectionIndex] = useState(0)
  const [questionIndex, setQuestionIndex] = useState(0)
  const [selectedKey, setSelectedKey] = useState(null)
  const [showAnswer, setShowAnswer] = useState(false)
  const [isEditing, setIsEditing] = useState(false)

  const section = sections[sectionIndex]
  const question = section.questions[questionIndex]
  const direction = question.groupId ? section.directions?.find((d) => d.groupId === question.groupId) : null
  const globalQNo = sections.slice(0, sectionIndex).reduce((n, s) => n + s.questions.length, 0) + questionIndex + 1
  const totalQuestions = sections.reduce((n, s) => n + s.questions.length, 0)
  const unverified = isAnswerUnverified(question.explanation)

  function goTo(sIdx, qIdx) {
    setSectionIndex(sIdx)
    setQuestionIndex(qIdx)
    setSelectedKey(null)
    setShowAnswer(false)
    setIsEditing(false)
  }

  function next() {
    if (questionIndex < section.questions.length - 1) goTo(sectionIndex, questionIndex + 1)
    else if (sectionIndex < sections.length - 1) goTo(sectionIndex + 1, 0)
  }
  function prev() {
    if (questionIndex > 0) goTo(sectionIndex, questionIndex - 1)
    else if (sectionIndex > 0) goTo(sectionIndex - 1, sections[sectionIndex - 1].questions.length - 1)
  }

  function patchQuestion(fields) {
    if (!onChange) return
    const updatedSections = sections.map((s, si) => {
      if (si !== sectionIndex) return s
      return {
        ...s,
        questions: s.questions.map((q, qi) => (qi === questionIndex ? { ...q, ...fields } : q)),
      }
    })
    onChange(updatedSections)
  }

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-white text-slate-800">
      <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-slate-200 gap-2">
        <span className="text-xs font-black px-2 py-1 rounded bg-tapasya-orange/15 text-tapasya-orange whitespace-nowrap">PREVIEW · not saved yet</span>
        <div className="flex items-center gap-2">
          {onChange && (
            <button
              onClick={() => setIsEditing((v) => !v)}
              className={`text-xs font-bold px-2.5 py-1.5 rounded-lg flex items-center gap-1 ${
                isEditing ? 'bg-tapasya-orange text-white' : 'border border-slate-300 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <i className={`ti ${isEditing ? 'ti-check' : 'ti-pencil'}`} /> {isEditing ? 'Done Editing' : 'Edit'}
            </button>
          )}
          <button onClick={onClose} className="text-slate-500 hover:text-slate-800 flex items-center gap-1 text-xs font-semibold">
            <i className="ti ti-x" /> Close
          </button>
        </div>
      </div>

      <div className="px-3 sm:px-5 bg-white border-b border-slate-200">
        {/* Preview tabs are always clickable — nothing is "locked" like the live engine */}
        <div className="flex items-center gap-4 py-2 overflow-x-auto">
          {sections.map((s, i) => (
            <button
              key={s.name}
              onClick={() => goTo(i, 0)}
              className={`text-xs font-bold whitespace-nowrap pb-1 border-b-2 ${
                i === sectionIndex ? 'text-tapasya-orange border-tapasya-orange' : 'text-slate-400 border-transparent hover:text-slate-600'
              }`}
            >
              {s.name}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 flex flex-col md:flex-row min-h-0 overflow-hidden">
        <div className="flex-1 flex flex-col min-h-0 overflow-y-auto">
          {isEditing ? (
            <EditQuestionForm question={question} onPatch={patchQuestion} />
          ) : (
            <SplitQuestionView
              question={question}
              direction={direction}
              qNo={question.qNo ?? globalQNo}
              displayPosition={`${globalQNo} / ${totalQuestions}`}
              marksCorrect={question.marksCorrectOverride ?? section.marksCorrect}
              marksWrong={question.marksWrongOverride ?? section.marksWrong}
              questionTimeSec={0}
              selectedKey={selectedKey}
              onSelectOption={setSelectedKey}
            />
          )}

          <div className="flex items-center justify-between gap-2 px-3 sm:px-5 py-3 bg-white border-t border-slate-200">
            <button onClick={prev} className="px-4 py-2 rounded-lg border border-slate-300 text-slate-600 text-sm font-semibold hover:bg-slate-50">
              <i className="ti ti-chevron-left" /> Prev
            </button>
            {!isEditing && (
              <button onClick={() => setShowAnswer((v) => !v)} className="px-4 py-2 rounded-lg border border-tapasya-orange/40 text-tapasya-orange text-sm font-semibold hover:bg-tapasya-orange/10">
                {showAnswer ? 'Hide' : 'Show'} Answer
              </button>
            )}
            <button onClick={next} className="px-4 py-2 rounded-lg bg-tapasya-orange text-white text-sm font-bold hover:bg-tapasya-orange-dark">
              Next <i className="ti ti-chevron-right" />
            </button>
          </div>

          {!isEditing && showAnswer && (
            <div className="px-4 sm:px-6 pb-4 bg-white">
              <div
                className={`rounded-lg border px-3 py-2 text-xs ${
                  unverified ? 'bg-amber-500/10 border-amber-500/30 text-amber-700' : 'bg-emerald-500/10 border-emerald-500/25 text-emerald-700'
                }`}
              >
                <span className="font-bold flex items-center gap-1">
                  {unverified && <i className="ti ti-alert-triangle" />}
                  Correct: {question.correctKey}
                </span>
                {question.explanation && <p className="mt-1 opacity-80">{question.explanation}</p>}
                <p className="mt-1 opacity-60">{question.topic}{question.subTopic ? ` · ${question.subTopic}` : ''} · {question.difficulty}</p>
              </div>
            </div>
          )}
        </div>

        {/* Simple question grid instead of the full CandidatePalette — no
            status tracking makes sense in a preview with no attempt behind it.
            A small amber dot flags questions the import AI couldn't verify. */}
        <div className="w-full md:w-56 shrink-0 border-t md:border-t-0 md:border-l border-slate-200 bg-white p-3 overflow-y-auto">
          <p className="text-xs font-bold text-slate-500 mb-2">{section.name} — {section.questions.length} Qs</p>
          <div className="grid grid-cols-8 md:grid-cols-6 gap-1.5">
            {section.questions.map((q, i) => (
              <button
                key={i}
                onClick={() => goTo(sectionIndex, i)}
                className={`relative w-8 h-8 rounded-lg text-xs font-bold flex items-center justify-center ${
                  i === questionIndex ? 'bg-tapasya-orange text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                }`}
              >
                {i + 1}
                {isAnswerUnverified(q.explanation) && (
                  <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-amber-500 ring-1 ring-white" title="Answer not verified — check this one" />
                )}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}