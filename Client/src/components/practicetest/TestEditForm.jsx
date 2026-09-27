// src/components/practicetest/TestEditForm.jsx
// Structured editor shown after a successful Validate, or immediately
// when editing an existing (not-yet-attempted) test — Round-2 Issues D+E.
//
// Operates directly on the full payload object (same shape the AI-JSON
// import uses: title/examTag/instructions/sections[]) and hands the
// edited object back via onChange. PracticeAdminUpload.jsx sends this
// same object through as `payload` on Save, so it goes through the
// existing /validate + POST/PATCH routes exactly like a fresh JSON
// upload would — no server changes needed for this screen.
//
// Question-level editing (question text, options, correct answer,
// explanation, topic/subTopic, difficulty) lives in TestPreviewModal.jsx's
// "Edit" toggle instead — reviewing a question and fixing it happen in the
// same place. This form only covers section-level metadata (name/duration/
// marks/cutoff/calculator) and section add/remove.
// A freshly-added section starts with 0 questions; admin pastes that
// section's own JSON (same shape as one entry of the main "sections"
// array) to fill it in before saving — this is what lets a Full Mock Test
// (Issue E) get built from the admin UI one section at a time, instead of
// only via one big combined JSON paste (which already worked before).

import { useState } from 'react'
import { extractJson } from '@/constants/practiceTestImportPrompt'

function NumberField({ label, value, onChange, step = '1', allowEmpty = false }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[11px] text-slate-500">{label}</span>
      <input
        type="number"
        step={step}
        value={value ?? ''}
        onChange={(e) => {
          const v = e.target.value
          if (v === '' && allowEmpty) { onChange(null); return }
          const n = parseFloat(v)
          onChange(Number.isNaN(n) ? (allowEmpty ? null : 0) : n)
        }}
        className="w-full px-2.5 py-1.5 rounded-lg bg-white border border-slate-300 text-slate-800 text-sm focus:outline-none focus:border-tapasya-orange/50"
      />
    </label>
  )
}

export default function TestEditForm({ payload, onChange }) {
  const [newSectionDraft, setNewSectionDraft] = useState({}) // sectionIndex -> raw json text, while pasting

  function patch(fields) {
    onChange({ ...payload, ...fields })
  }

  function patchSection(index, fields) {
    const sections = payload.sections.map((s, i) => (i === index ? { ...s, ...fields } : s))
    onChange({ ...payload, sections })
  }

  function removeSection(index) {
    if (payload.sections.length <= 1) { alert('Kam se kam ek section chahiye'); return }
    if (!window.confirm(`"${payload.sections[index].name || 'Yeh section'}" hatana hai? Iske saare questions bhi chale jayenge.`)) return
    onChange({ ...payload, sections: payload.sections.filter((_, i) => i !== index) })
  }

  function addSection() {
    onChange({
      ...payload,
      sections: [
        ...payload.sections,
        {
          name: '', durationSec: 1200, marksCorrect: 1, marksWrong: 0.25, cutoff: null,
          hasCalculator: false, directions: [], questions: [],
        },
      ],
    })
  }

  function loadSectionJson(index) {
    const raw = newSectionDraft[index]
    if (!raw?.trim()) return
    try {
      const json = extractJson(raw)
      const current = payload.sections[index]
      patchSection(index, {
        name: json.name || current.name,
        durationSec: json.durationSec ?? current.durationSec,
        marksCorrect: json.marksCorrect ?? current.marksCorrect,
        marksWrong: json.marksWrong ?? current.marksWrong,
        cutoff: json.cutoff ?? current.cutoff,
        hasCalculator: json.hasCalculator ?? current.hasCalculator,
        directions: Array.isArray(json.directions) ? json.directions : [],
        questions: Array.isArray(json.questions) ? json.questions : [],
      })
      setNewSectionDraft((d) => ({ ...d, [index]: '' }))
    } catch (e) {
      alert(e.message || 'Section JSON parse nahi ho paya')
    }
  }

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/50 px-4 py-4 mb-4 space-y-4">
      <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">Test Details</p>

      <div>
        <label className="text-xs text-slate-400 mb-1 block">Test ka naam</label>
        <input
          value={payload.title || ''}
          onChange={(e) => patch({ title: e.target.value })}
          className="w-full px-3 py-2.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-100 text-sm"
        />
      </div>

      <div>
        <label className="text-xs text-slate-400 mb-1 block">Exam Tag</label>
        <input
          value={payload.examTag || ''}
          onChange={(e) => patch({ examTag: e.target.value })}
          placeholder="e.g. IBPS Clerk Prelims"
          className="w-full px-3 py-2.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-100 text-sm"
        />
      </div>

      <div>
        <label className="text-xs text-slate-400 mb-1 block">Instructions</label>
        <textarea
          value={payload.instructions || ''}
          onChange={(e) => patch({ instructions: e.target.value })}
          rows={3}
          className="w-full px-3 py-2.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-100 text-xs"
        />
      </div>

      <div className="pt-1 flex items-center justify-between">
        <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">Sections</p>
        <button
          type="button"
          onClick={addSection}
          className="text-xs font-semibold text-tapasya-orange hover:underline flex items-center gap-1"
        >
          <i className="ti ti-plus" /> Add Section
        </button>
      </div>

      <div className="space-y-3">
        {payload.sections.map((section, i) => (
          <div key={i} className="rounded-lg border border-slate-700 bg-slate-800/60 px-3 py-3">
            <div className="flex items-center justify-between mb-2 gap-2">
              <input
                value={section.name || ''}
                onChange={(e) => patchSection(i, { name: e.target.value })}
                placeholder={`Section ${i + 1} name`}
                className="flex-1 px-2.5 py-1.5 rounded-lg bg-white border border-slate-300 text-slate-800 text-sm font-semibold"
              />
              <span className="text-[11px] text-slate-400 whitespace-nowrap">{section.questions?.length || 0} Qs</span>
              <button
                type="button"
                onClick={() => removeSection(i)}
                title="Remove section"
                className="text-slate-400 hover:text-red-400 shrink-0"
              >
                <i className="ti ti-trash text-sm" />
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              <NumberField
                label="Duration (min)"
                value={section.durationSec ? Math.round(section.durationSec / 60) : ''}
                onChange={(v) => patchSection(i, { durationSec: Math.round((v || 0) * 60) })}
              />
              <NumberField label="Marks Correct (+)" step="0.01" value={section.marksCorrect} onChange={(v) => patchSection(i, { marksCorrect: v })} />
              <NumberField label="Marks Wrong (−)" step="0.01" value={section.marksWrong} onChange={(v) => patchSection(i, { marksWrong: v })} />
              <NumberField label="Cutoff" step="0.01" allowEmpty value={section.cutoff} onChange={(v) => patchSection(i, { cutoff: v })} />
              <label className="flex flex-col gap-1">
                <span className="text-[11px] text-slate-500">Calculator</span>
                <button
                  type="button"
                  onClick={() => patchSection(i, { hasCalculator: !section.hasCalculator })}
                  className={`px-2.5 py-1.5 rounded-lg border text-xs font-semibold ${
                    section.hasCalculator ? 'border-tapasya-orange text-tapasya-orange bg-tapasya-orange/10' : 'border-slate-300 text-slate-500 bg-white'
                  }`}
                >
                  {section.hasCalculator ? 'On' : 'Off'}
                </button>
              </label>
            </div>

            {(!section.questions || section.questions.length === 0) && (
              <div className="mt-2 pt-2 border-t border-slate-700">
                <p className="text-[11px] text-slate-400 mb-1">
                  Naya section — iske questions ka JSON paste karo (ek section object jaisa: name/durationSec/questions/directions):
                </p>
                <textarea
                  value={newSectionDraft[i] || ''}
                  onChange={(e) => setNewSectionDraft((d) => ({ ...d, [i]: e.target.value }))}
                  rows={3}
                  placeholder="{ ... }"
                  className="w-full px-2.5 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-100 text-xs font-mono"
                />
                <button
                  type="button"
                  onClick={() => loadSectionJson(i)}
                  className="mt-1.5 px-3 py-1.5 rounded-lg border border-slate-600 text-slate-300 text-xs font-semibold hover:bg-slate-800"
                >
                  Load Section JSON
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}