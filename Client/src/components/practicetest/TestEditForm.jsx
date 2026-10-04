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

// Controlled number input jo kabhi galat value state me nahi jaane deta:
//  - min/max: arrows aur typing dono me clamp (minus time/cutoff ab possible nahi)
//  - step: sirf arrows ka jump (typing me koi bhi decimal chalega, e.g. 0.33)
//  - 2 decimals tak round (0.1+0.2 jaisi 0.30000000000000004 float garbage nahi)
//  - draft text: typing ke beech "0." / "" jaisi intermediate state na toote;
//    blur pe value normalize hoti hai (empty -> fallback / null)
function roundTo2(n) { return Math.round(n * 100) / 100 }

function NumberField({ label, value, onChange, step = 1, min = 0, max, allowEmpty = false, fallback = min, hint }) {
  const [draft, setDraft] = useState(null) // typing ke dauran ka raw text, warna null

  // typing ke dauran sirf negative aur upper limit rokte hain (taaki "0.5" type
  // karte waqt pehle "0" pe value uchhal ke 1 na ho jaye); asli minimum blur pe lagta hai.
  function clamp(n, floor = min) {
    let v = roundTo2(n)
    if (v < floor) v = floor
    if (max != null && v > max) v = max
    return v
  }

  function handleChange(e) {
    const raw = e.target.value
    setDraft(raw)
    if (raw === '') { if (allowEmpty) onChange(null); return } // blur pe fallback lagega
    const n = parseFloat(raw)
    if (Number.isNaN(n)) return
    onChange(clamp(n, 0))
  }

  function handleBlur() {
    setDraft(null)
    if (value == null || Number.isNaN(Number(value))) {
      onChange(allowEmpty ? null : clamp(fallback))
    } else {
      onChange(clamp(Number(value)))
    }
  }

  // Draft sirf tab dikhao jab wo abhi bhi usi value ka text ho jo state me hai —
  // warna clamp hui value (e.g. -5 -> 0) turant screen pe dikhe.
  const shown = draft !== null && (draft === '' || parseFloat(draft) === Number(value)) ? draft : (value ?? '')

  return (
    <label className="flex flex-col gap-1">
      <span className="text-[11px] text-slate-500">{label}</span>
      <input
        type="number"
        inputMode="decimal"
        step={step}
        min={min}
        max={max}
        value={shown}
        onChange={handleChange}
        onBlur={handleBlur}
        onKeyDown={(e) => { if (e.key === '-' || e.key === 'e' || e.key === 'E' || e.key === '+') e.preventDefault() }}
        className="w-full px-2.5 py-1.5 rounded-lg bg-white border border-slate-300 text-slate-800 text-sm focus:outline-none focus:border-tapasya-orange/50"
      />
      {hint && <span className="text-[10px] text-slate-500">{hint}</span>}
    </label>
  )
}

const MAX_DURATION_MIN = 600

// Cutoff section ke total marks se zyada nahi ho sakta (questions x marksCorrect).
// Naye section me abhi questions nahi hain to koi upper limit nahi.
function cutoffMax(section) {
  const n = section?.questions?.length || 0
  const mc = Number(section?.marksCorrect) || 0
  return n > 0 && mc > 0 ? roundTo2(n * mc) : undefined
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
                min={1}
                max={MAX_DURATION_MIN}
                step={1}
                fallback={1}
                value={section.durationSec ? roundTo2(section.durationSec / 60) : ''}
                onChange={(v) => patchSection(i, { durationSec: Math.round((v || 0) * 60) })}
              />
              <NumberField
                label="Marks Correct (+)" min={0.25} max={10} step={0.5} fallback={1}
                value={section.marksCorrect}
                onChange={(v) => {
                  // marks badle to cutoff ka upper limit bhi badalta hai — cutoff usse upar na reh jaye
                  const limit = (section.questions?.length || 0) * (Number(v) || 0)
                  const fixCutoff = section.cutoff != null && limit > 0 && section.cutoff > limit
                  patchSection(i, fixCutoff ? { marksCorrect: v, cutoff: roundTo2(limit) } : { marksCorrect: v })
                }}
              />
              <NumberField label="Marks Wrong (−)" min={0} max={10} step={0.25} fallback={0} value={section.marksWrong} onChange={(v) => patchSection(i, { marksWrong: v })} />
              <NumberField
                label="Cutoff"
                min={0}
                max={cutoffMax(section)}
                step={1}
                allowEmpty
                hint={cutoffMax(section) != null ? `max ${cutoffMax(section)} (total marks)` : undefined}
                value={section.cutoff}
                onChange={(v) => patchSection(i, { cutoff: v })}
              />
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