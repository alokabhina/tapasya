// src/components/mocktest/AddMockResultModal.jsx
// Manual result-entry form. Only Score/Accuracy/Attempted are required —
// everything else is optional so a quick, partial entry is still useful.
import { useState } from 'react'
import { addMockAttempt, MOCK_PLATFORMS } from '@/api/mockExams'
import { MOCK_IMPORT_PROMPT, extractJson } from '@/constants/mockImportPrompt'

function emptySection(name = '') {
  return { sectionName: name, score: '', maxScore: '', attempted: '', totalQuestions: '', correct: '', incorrect: '', accuracy: '', timeTakenSec: '', topics: [] }
}
function emptyTopic() {
  return { name: '', correctPct: '', correct: '', total: '' }
}

function num(v) { return v === '' || v == null ? null : Number(v) }
function str(v) { return v == null ? '' : String(v) }
const norm = (s) => (s || '').trim().toLowerCase()

// AI-parsed section names won't always match the exam's saved section names
// exactly — sometimes it's just casing/whitespace ("english " vs "English"),
// but sometimes the AI returns a fuller phrase ("English Language" vs the
// exam's own "English"). Either way, letting that raw text through breaks
// subject-tab filtering later (saved sectionName never equals any tab's
// name, so the result only ever shows under "All"). So this ALWAYS snaps to
// a real exam section: exact match first, then a substring match in either
// direction, and if genuinely nothing matches, falls back to the exam's
// first section rather than leaving the field pointing at free text the
// <select> can't represent (which is what silently broke it before).
function snapSectionName(name, examSections) {
  if (!examSections.length) return name || ''
  const n = norm(name)
  let match = examSections.find((s) => norm(s.name) === n)
  if (!match && n) match = examSections.find((s) => n.includes(norm(s.name)) || norm(s.name).includes(n))
  return (match || examSections[0]).name
}

export default function AddMockResultModal({ examSections = [], onClose, onSaved, examId }) {
  const [entryMethod, setEntryMethod] = useState('manual') // 'manual' | 'ai'
  const [pastedJson, setPastedJson] = useState('')
  const [parsing, setParsing] = useState(false)
  const [parseError, setParseError] = useState('')
  const [copied, setCopied] = useState(false)
  // Advanced fields the manual form has no inputs for — only ever populated
  // via AI parse, shown read-only in the review step so nothing saves blind.
  const [topperCompare, setTopperCompare] = useState(null)
  const [averageCompare, setAverageCompare] = useState(null)
  const [marksDistribution, setMarksDistribution] = useState([])
  const [rawImportedText, setRawImportedText] = useState(null)

  const [mode, setMode] = useState('full') // 'full' | 'sectional'
  const [sectionalName, setSectionalName] = useState(examSections[0]?.name || '')
  const [sectionSnapNote, setSectionSnapNote] = useState('') // shown when an AI-parsed section name got auto-corrected to an existing exam section
  const [title, setTitle] = useState('')
  const [platform, setPlatform] = useState('')
  const [customPlatform, setCustomPlatform] = useState('')
  const [attemptedOn, setAttemptedOn] = useState(() => new Date().toISOString().slice(0, 10))
  const [overall, setOverall] = useState({ score: '', maxScore: '', accuracy: '', attempted: '', totalQuestions: '', rank: '', outOf: '' })
  const [sections, setSections] = useState(() => examSections.map((s) => emptySection(s.name)))
  const [saving, setSaving] = useState(false)

  const effectivePlatform = platform === 'Other' ? customPlatform.trim() : platform

  function updateSectionField(i, field, val) {
    setSections((prev) => prev.map((s, idx) => (idx === i ? { ...s, [field]: val } : s)))
  }
  function addTopic(sIdx) {
    setSections((prev) => prev.map((s, idx) => (idx === sIdx ? { ...s, topics: [...s.topics, emptyTopic()] } : s)))
  }
  function updateTopic(sIdx, tIdx, field, val) {
    setSections((prev) => prev.map((s, idx) => idx === sIdx
      ? { ...s, topics: s.topics.map((t, ti) => (ti === tIdx ? { ...t, [field]: val } : t)) }
      : s))
  }
  function removeTopic(sIdx, tIdx) {
    setSections((prev) => prev.map((s, idx) => idx === sIdx ? { ...s, topics: s.topics.filter((_, ti) => ti !== tIdx) } : s))
  }

  function handleCopyPrompt() {
    navigator.clipboard.writeText(MOCK_IMPORT_PROMPT).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }).catch(() => alert('Copy nahi ho paya, manually select karke copy kar lo'))
  }

  // Parses the AI's JSON reply and prefills the SAME manual form fields —
  // it never saves directly. User always lands back on the manual tab to
  // review/edit everything before hitting Save.
  function handleParse() {
    setParseError('')
    if (!pastedJson.trim()) { setParseError('Pehle JSON paste karo'); return }
    setParsing(true)
    try {
      const data = extractJson(pastedJson)

      if (data.mode === 'full' || data.mode === 'sectional') setMode(data.mode)
      setTitle(data.title || '')
      if (data.platform) {
        const known = MOCK_PLATFORMS.includes(data.platform)
        setPlatform(known ? data.platform : 'Other')
        if (!known) setCustomPlatform(data.platform)
      }

      const o = data.overall || {}
      setOverall({
        score: str(o.score), maxScore: str(o.maxScore), accuracy: str(o.accuracy),
        attempted: str(o.attempted), totalQuestions: str(o.totalQuestions),
        rank: str(o.rank), outOf: str(o.outOf),
      })

      const parsedSections = (data.sections || []).map((s) => {
        const originalName = (s.sectionName || '').trim()
        const snapped = snapSectionName(originalName, examSections)
        return {
          sectionName: snapped,
          _originalName: originalName, // kept only in memory for the correction hint below, never saved
          score: str(s.score), maxScore: str(s.maxScore), attempted: str(s.attempted),
          totalQuestions: str(s.totalQuestions), correct: str(s.correct), incorrect: str(s.incorrect),
          accuracy: str(s.accuracy), timeTakenSec: str(s.timeTakenSec),
          topics: (s.topics || []).map((t) => ({ name: t.name || '', correctPct: str(t.correctPct), correct: str(t.correct), total: str(t.total) })),
        }
      })
      const corrected = parsedSections.find((s) => s._originalName && norm(s._originalName) !== norm(s.sectionName))
      setSectionSnapNote(corrected ? `"${corrected._originalName}" ko "${corrected.sectionName}" section se match kiya gaya — check kar lo sahi hai` : '')
      if (parsedSections.length) {
        setSections(parsedSections)
        if (data.mode === 'sectional') setSectionalName(parsedSections[0].sectionName)
      }

      setTopperCompare(data.topperCompare || null)
      setAverageCompare(data.averageCompare || null)
      setMarksDistribution(data.marksDistribution || [])
      setRawImportedText(pastedJson)

      setEntryMethod('manual') // land back on the reviewable form
    } catch (err) {
      setParseError(err.message || 'Parse fail ho gaya, JSON check karo')
    } finally {
      setParsing(false)
    }
  }

  function validate() {
    if (overall.score === '' || overall.accuracy === '' || overall.attempted === '') {
      alert('Score, Accuracy aur Attempted zaroori hain')
      return false
    }
    if (mode === 'sectional' && !sectionalName.trim()) {
      alert('Section chuno')
      return false
    }
    return true
  }

  async function handleSave() {
    if (!validate() || saving) return
    setSaving(true)
    try {
      const payload = {
        mode,
        title: title.trim() || null,
        platform: effectivePlatform || null,
        attemptedOn,
        overall: {
          score: num(overall.score), maxScore: num(overall.maxScore),
          accuracy: num(overall.accuracy), attempted: num(overall.attempted),
          totalQuestions: num(overall.totalQuestions), rank: num(overall.rank), outOf: num(overall.outOf),
        },
        sections: mode === 'full'
          ? sections.filter((s) => s.sectionName.trim()).map((s) => ({
              sectionName: s.sectionName.trim(),
              score: num(s.score), maxScore: num(s.maxScore), attempted: num(s.attempted),
              totalQuestions: num(s.totalQuestions), correct: num(s.correct), incorrect: num(s.incorrect),
              accuracy: num(s.accuracy), timeTakenSec: num(s.timeTakenSec),
              topics: s.topics.filter((t) => t.name.trim()).map((t) => ({
                name: t.name.trim(), correctPct: num(t.correctPct), correct: num(t.correct), total: num(t.total),
              })),
            }))
          : [{
              sectionName: sectionalName.trim(),
              score: num(overall.score), maxScore: num(overall.maxScore), attempted: num(overall.attempted),
              totalQuestions: num(overall.totalQuestions), accuracy: num(overall.accuracy),
              topics: sections[0]?.topics.filter((t) => t.name.trim()).map((t) => ({
                name: t.name.trim(), correctPct: num(t.correctPct), correct: num(t.correct), total: num(t.total),
              })) || [],
            }],
        topperCompare,
        averageCompare,
        marksDistribution,
        rawImportedText,
      }
      const attempt = await addMockAttempt(examId, payload)
      onSaved?.(attempt)
    } catch {
      alert('Save nahi ho paya, dobara try karo')
    } finally {
      setSaving(false)
    }
  }

  const inputCls = "w-full px-2.5 py-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-100 text-xs focus:outline-none focus:border-orange-500/50"
  const labelCls = "text-[11px] text-slate-500 mb-1 block"
  // For inputs sitting SIDE BY SIDE in a flex row (the topic name + % pair
  // below) — inputCls's own "w-full" fights with flex-1/w-16 sizing (two
  // width rules on the same element, and w-full ends up winning in the
  // compiled CSS regardless of which comes later in the class string).
  // That's what was making the topic name box collapse to a sliver while
  // the % box stretched to fill the row. Building these two without the
  // conflicting "w-full" fixes it.
  const topicInputBase = inputCls.replace('w-full ', '')

  return (
    <div className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="w-full sm:max-w-lg bg-slate-900 border border-slate-700 rounded-t-2xl sm:rounded-2xl overflow-hidden animate-fade-in-up max-h-[92vh] flex flex-col">
        <div className="px-5 pt-5 pb-3 flex items-center justify-between">
          <h3 className="text-base font-bold text-slate-100">Result Add Karo</h3>
          <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-slate-800 text-slate-400 flex items-center justify-center">
            <i className="ti ti-x" />
          </button>
        </div>

        {/* Entry method: manual form vs AI-assisted paste */}
        <div className="px-5 mb-3 flex gap-2">
          {[{ id: 'manual', label: 'Manually bharo' }, { id: 'ai', label: 'AI se paste karo' }].map((m) => (
            <button
              key={m.id}
              onClick={() => setEntryMethod(m.id)}
              className={`flex-1 py-2 rounded-lg text-xs font-medium border transition-colors flex items-center justify-center gap-1.5 ${entryMethod === m.id ? 'bg-slate-700 border-slate-600 text-slate-100' : 'bg-slate-800/60 border-slate-800 text-slate-500'}`}
            >
              {m.id === 'ai' && <i className="ti ti-sparkles text-sm" />}
              {m.label}
            </button>
          ))}
        </div>

        {entryMethod === 'ai' ? (
          <div className="px-5 flex-1 overflow-y-auto space-y-3">
            <div className="rounded-xl border border-slate-800 p-3 space-y-2">
              <p className="text-xs text-slate-400 leading-relaxed">
                1. Result page ka text copy karo (ya screenshot ka description likho)<br />
                2. Neeche wala prompt copy karke, us text ke saath kisi bhi AI (ChatGPT/Claude/Gemini) ko do<br />
                3. AI ka JSON reply neeche paste karke "Parse Karo" dabao — phir form mein review kar sakte ho
              </p>
              <button
                onClick={handleCopyPrompt}
                className="w-full py-2 rounded-lg bg-slate-800 border border-slate-700 text-xs text-slate-200 flex items-center justify-center gap-1.5"
              >
                <i className={`ti ${copied ? 'ti-check' : 'ti-copy'} text-sm ${copied ? 'text-green-400' : ''}`} />
                {copied ? 'Copy ho gaya!' : 'Prompt Copy Karo'}
              </button>
            </div>

            <div>
              <label className="text-[11px] text-slate-500 mb-1 block">AI ka JSON reply yahan paste karo</label>
              <textarea
                value={pastedJson}
                onChange={(e) => setPastedJson(e.target.value)}
                rows={8}
                placeholder='{ "mode": "full", "overall": { ... }, ... }'
                className="w-full px-3 py-2.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-100 text-xs font-mono focus:outline-none focus:border-orange-500/50"
              />
              {parseError && <p className="text-[11px] text-red-400 mt-1">{parseError}</p>}
            </div>

            <button
              onClick={handleParse}
              disabled={parsing || !pastedJson.trim()}
              className="w-full py-2.5 rounded-lg bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white text-sm font-semibold flex items-center justify-center gap-1.5"
            >
              {parsing ? <div className="w-3.5 h-3.5 rounded-full border-2 border-white/50 border-t-white animate-spin" /> : <i className="ti ti-wand" />}
              Parse Karo
            </button>
            <p className="text-[10px] text-slate-600 text-center pb-2">Parse hone ke baad "Manually bharo" tab mein review karke save karna hoga</p>
          </div>
        ) : (
        <div className="px-5 flex-1 overflow-y-auto space-y-4">
          {/* Mode toggle */}
          <div className="flex gap-2">
            {['full', 'sectional'].map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`flex-1 py-2 rounded-lg text-xs font-medium border transition-colors ${mode === m ? 'bg-orange-500/15 border-orange-500/40 text-orange-400' : 'bg-slate-800 border-slate-700 text-slate-400'}`}
              >
                {m === 'full' ? 'Full Mock' : 'Sectional Test'}
              </button>
            ))}
          </div>

          {rawImportedText && (
            <div className="rounded-lg bg-blue-500/10 border border-blue-500/20 px-3 py-2 flex items-center gap-2">
              <i className="ti ti-sparkles text-blue-400 text-sm shrink-0" />
              <p className="text-[11px] text-blue-300">AI se fill hua hai — save karne se pehle check kar lo</p>
            </div>
          )}

          {mode === 'sectional' && (
            <div>
              <label className={labelCls}>Section</label>
              <select value={sectionalName} onChange={(e) => setSectionalName(e.target.value)} className={inputCls}>
                {examSections.length === 0 && <option value="">Koi section nahi hai</option>}
                {examSections.map((s) => <option key={s.name} value={s.name}>{s.name}</option>)}
              </select>
              {sectionSnapNote && <p className="text-[10px] text-amber-500/80 mt-1">{sectionSnapNote}</p>}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Title (optional)</label>
              <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Full Test 5" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Date</label>
              <input type="date" value={attemptedOn} onChange={(e) => setAttemptedOn(e.target.value)} className={inputCls} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Platform (optional)</label>
              <select value={platform} onChange={(e) => setPlatform(e.target.value)} className={inputCls}>
                <option value="">Select karo</option>
                {MOCK_PLATFORMS.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            {platform === 'Other' && (
              <div>
                <label className={labelCls}>Platform ka naam</label>
                <input type="text" value={customPlatform} onChange={(e) => setCustomPlatform(e.target.value)} placeholder="Naam likho" className={inputCls} />
              </div>
            )}
          </div>

          {/* Overall */}
          <div className="rounded-xl border border-slate-800 p-3">
            <p className="text-xs font-semibold text-slate-300 mb-2">Overall</p>
            <div className="grid grid-cols-3 gap-2">
              <div><label className={labelCls}>Score *</label><input type="number" value={overall.score} onChange={(e) => setOverall((o) => ({ ...o, score: e.target.value }))} className={inputCls} /></div>
              <div><label className={labelCls}>Max Score</label><input type="number" value={overall.maxScore} onChange={(e) => setOverall((o) => ({ ...o, maxScore: e.target.value }))} className={inputCls} /></div>
              <div><label className={labelCls}>Accuracy % *</label><input type="number" value={overall.accuracy} onChange={(e) => setOverall((o) => ({ ...o, accuracy: e.target.value }))} className={inputCls} /></div>
              <div><label className={labelCls}>Attempted *</label><input type="number" value={overall.attempted} onChange={(e) => setOverall((o) => ({ ...o, attempted: e.target.value }))} className={inputCls} /></div>
              <div><label className={labelCls}>Total Qs</label><input type="number" value={overall.totalQuestions} onChange={(e) => setOverall((o) => ({ ...o, totalQuestions: e.target.value }))} className={inputCls} /></div>
              <div><label className={labelCls}>Rank</label><input type="number" value={overall.rank} onChange={(e) => setOverall((o) => ({ ...o, rank: e.target.value }))} className={inputCls} /></div>
              <div><label className={labelCls}>Out of</label><input type="number" value={overall.outOf} onChange={(e) => setOverall((o) => ({ ...o, outOf: e.target.value }))} className={inputCls} /></div>
            </div>
          </div>

          {/* Sections — full mode only */}
          {mode === 'full' && sections.map((s, i) => (
            <div key={i} className="rounded-xl border border-slate-800 p-3">
              <p className="text-xs font-semibold text-slate-300 mb-2">{s.sectionName || `Section ${i + 1}`}</p>
              <div className="grid grid-cols-3 gap-2 mb-2">
                <div><label className={labelCls}>Score</label><input type="number" value={s.score} onChange={(e) => updateSectionField(i, 'score', e.target.value)} className={inputCls} /></div>
                <div><label className={labelCls}>Accuracy %</label><input type="number" value={s.accuracy} onChange={(e) => updateSectionField(i, 'accuracy', e.target.value)} className={inputCls} /></div>
                <div><label className={labelCls}>Attempted</label><input type="number" value={s.attempted} onChange={(e) => updateSectionField(i, 'attempted', e.target.value)} className={inputCls} /></div>
              </div>

              {s.topics.map((t, ti) => (
                <div key={ti} className="flex items-center gap-1.5 mb-1.5">
                  <input type="text" placeholder="Topic naam" value={t.name} onChange={(e) => updateTopic(i, ti, 'name', e.target.value)} className={topicInputBase + ' flex-1 min-w-0'} />
                  <input type="number" placeholder="%" value={t.correctPct} onChange={(e) => updateTopic(i, ti, 'correctPct', e.target.value)} className={topicInputBase + ' w-16 shrink-0'} />
                  <button onClick={() => removeTopic(i, ti)} className="w-7 h-7 rounded-md bg-slate-800 text-slate-500 hover:text-red-400 flex items-center justify-center shrink-0"><i className="ti ti-x text-xs" /></button>
                </div>
              ))}
              <button onClick={() => addTopic(i)} className="text-[11px] text-orange-400 flex items-center gap-1 mt-1">
                <i className="ti ti-plus text-xs" /> Topic add karo
              </button>
            </div>
          ))}

          {/* Topics for sectional mode */}
          {mode === 'sectional' && (
            <div className="rounded-xl border border-slate-800 p-3">
              <p className="text-xs font-semibold text-slate-300 mb-2">Topic-wise (optional)</p>
              {(sections[0]?.topics || []).map((t, ti) => (
                <div key={ti} className="flex items-center gap-1.5 mb-1.5">
                  <input type="text" placeholder="Topic naam" value={t.name} onChange={(e) => updateTopic(0, ti, 'name', e.target.value)} className={topicInputBase + ' flex-1 min-w-0'} />
                  <input type="number" placeholder="%" value={t.correctPct} onChange={(e) => updateTopic(0, ti, 'correctPct', e.target.value)} className={topicInputBase + ' w-16 shrink-0'} />
                  <button onClick={() => removeTopic(0, ti)} className="w-7 h-7 rounded-md bg-slate-800 text-slate-500 hover:text-red-400 flex items-center justify-center shrink-0"><i className="ti ti-x text-xs" /></button>
                </div>
              ))}
              <button onClick={() => { if (!sections[0]) setSections([emptySection(sectionalName)]); addTopic(0) }} className="text-[11px] text-orange-400 flex items-center gap-1 mt-1">
                <i className="ti ti-plus text-xs" /> Topic add karo
              </button>
            </div>
          )}

          {(topperCompare || averageCompare || marksDistribution.length > 0) && (
            <div className="rounded-xl border border-slate-800 p-3">
              <p className="text-xs font-semibold text-slate-300 mb-2">AI se mila extra data (read-only)</p>
              {topperCompare && (
                <p className="text-[11px] text-slate-400 mb-1">
                  Topper — Score: {topperCompare.score ?? '—'}, Accuracy: {topperCompare.accuracy ?? '—'}%
                </p>
              )}
              {averageCompare && (
                <p className="text-[11px] text-slate-400 mb-1">
                  Average — Score: {averageCompare.score ?? '—'}, Accuracy: {averageCompare.accuracy ?? '—'}%
                </p>
              )}
              {marksDistribution.length > 0 && (
                <p className="text-[11px] text-slate-400">Marks distribution: {marksDistribution.length} buckets mile</p>
              )}
              <p className="text-[10px] text-slate-600 mt-1.5">Ye save hoga attempt ke saath, edit yahan se nahi ho sakta</p>
            </div>
          )}
        </div>
        )}

        <div className="flex gap-2 p-5">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 text-sm font-medium">Cancel</button>
          <button onClick={handleSave} disabled={saving} className="flex-1 py-2.5 rounded-lg bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white text-sm font-semibold">
            {saving ? 'Saving...' : 'Save karo'}
          </button>
        </div>
      </div>
    </div>
  )
}