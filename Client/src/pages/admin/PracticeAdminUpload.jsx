// src/pages/admin/PracticeAdminUpload.jsx
// Admin-only Upload Test screen (plan doc Section 8.2). Also doubles as the
// Edit screen when opened with ?testId=... (Section 8.3): metadata is
// always editable, but re-uploading a new JSON payload is blocked once the
// test hasAttempts — the admin has to Clone instead (that action lives on
// PracticeAdminSubjects.jsx's test list).

import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { getPracticeSubjects, isPracticeAdmin } from '@/api/practiceSubjects'
import {
  getPracticeTestFull, validatePracticeTestPayload, createPracticeTest, updatePracticeTest,
} from '@/api/practiceTests'
import { PRACTICE_TEST_IMPORT_PROMPT, extractJson } from '@/constants/practiceTestImportPrompt'
import TestPreviewModal from '@/components/practicetest/TestPreviewModal'
import TestEditForm from '@/components/practicetest/TestEditForm'

// Converts a full test doc (from getPracticeTestFull) into the same
// payload shape the AI-JSON import uses, so TestEditForm can edit an
// existing test's metadata right away without needing a fresh JSON paste
// + Validate first (Round-2 Issue D: "edit-existing-test flow bhi isi
// form ko reuse karega").
function testDocToPayload(t) {
  return {
    title: t.title,
    examTag: t.examTag || '',
    instructions: t.instructions || '',
    sections: (t.sections || []).map((s) => ({
      name: s.name,
      durationSec: s.durationSec,
      marksCorrect: s.marksCorrect,
      marksWrong: s.marksWrong,
      cutoff: s.cutoff,
      hasCalculator: !!s.hasCalculator,
      directions: s.directions || [],
      questions: (s.questions || []).map((q) => ({
        qNo: q.qNo,
        groupId: q.groupId ?? null,
        questionText: q.questionText,
        options: q.options,
        correctKey: q.correctKey,
        explanation: q.explanation || '',
        topic: q.topic,
        subTopic: q.subTopic || '',
        difficulty: q.difficulty || 'medium',
        marksCorrectOverride: q.marksCorrectOverride ?? null,
        marksWrongOverride: q.marksWrongOverride ?? null,
      })),
    })),
  }
}

export default function PracticeAdminUpload() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const routeParams = useParams()
  const editingTestId = searchParams.get('testId') || routeParams.testId || null
  const fileInputRef = useRef(null)

  const [checking, setChecking] = useState(true)
  const [subjects, setSubjects] = useState([])
  const [subjectId, setSubjectId] = useState('')
  const [rawJson, setRawJson] = useState('')
  const [parsed, setParsed] = useState(null)
  const [parseError, setParseError] = useState('')
  const [validation, setValidation] = useState(null) // { valid, errors, topicSuggestions }
  const [validating, setValidating] = useState(false)
  const [saving, setSaving] = useState(false)
  const [copied, setCopied] = useState(false)
  const [existingTest, setExistingTest] = useState(null) // when editing
  const [metaOnly, setMetaOnly] = useState(false)         // true once hasAttempts blocks structural edit
  const [showPreview, setShowPreview] = useState(false)

  useEffect(() => {
    isPracticeAdmin().then((ok) => {
      if (!ok) { navigate('/practice-tests', { replace: true }); return }
      setChecking(false)
      getPracticeSubjects().then(setSubjects).catch(() => {})
      if (editingTestId) {
        getPracticeTestFull(editingTestId).then((t) => {
          setExistingTest(t)
          setSubjectId(t.subjectId)
          setMetaOnly(!!t.hasAttempts)
          if (t.sourceJson) setRawJson(JSON.stringify(t.sourceJson, null, 2))
          // Seed the structured edit form straight from the saved test —
          // admin can tweak section details without re-pasting JSON.
          if (!t.hasAttempts) setParsed(testDocToPayload(t))
        }).catch(() => alert('Test load nahi ho paya'))
      }
    }).catch(() => navigate('/practice-tests', { replace: true }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function handleCopyPrompt() {
    navigator.clipboard.writeText(PRACTICE_TEST_IMPORT_PROMPT)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function handleFileUpload(e) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => setRawJson(String(reader.result || ''))
    reader.readAsText(file)
  }

  function handleParse() {
    setParseError('')
    setValidation(null)
    try {
      const json = extractJson(rawJson)
      setParsed(json)
    } catch (e) {
      setParsed(null)
      setParseError(e.message || 'JSON parse nahi ho paya')
    }
  }

  async function handleValidate() {
    if (!parsed) { handleParse(); return }
    if (!subjectId) { alert('Pehle subject select karo'); return }
    setValidating(true)
    try {
      const result = await validatePracticeTestPayload(parsed, subjectId)
      setValidation(result)
      // Seed the structured edit form with the normalized result (proper
      // defaults filled in — marksWrong/cutoff/etc.) so it opens editable
      // right after a successful Validate (Round-2 Issue D).
      if (result.valid && result.normalized) setParsed(result.normalized)
    } catch {
      setValidation({ valid: false, errors: ['Validation request fail hui'], topicSuggestions: [] })
    } finally { setValidating(false) }
  }

  async function handleSave(publish) {
    if (saving) return
    if (!metaOnly) {
      if (!parsed) { handleParse(); return }
      if (!subjectId) { alert('Subject select karo'); return }
    }
    setSaving(true)
    try {
      if (editingTestId) {
        const body = { status: publish ? 'published' : 'draft' }
        if (parsed && !metaOnly) body.payload = parsed
        const updated = await updatePracticeTest(editingTestId, body)
        alert('Test update ho gaya')
        navigate('/practice-tests/admin')
      } else {
        const created = await createPracticeTest({ subjectId, payload: parsed, publish })
        alert(publish ? 'Test published ho gaya' : 'Draft save ho gaya')
        navigate('/practice-tests/admin')
      }
    } catch (e) {
      const errs = e?.response?.data?.errors
      alert(errs ? `Validation failed:\n${errs.join('\n')}` : (e?.response?.data?.error || 'Save nahi ho paya'))
    } finally { setSaving(false) }
  }

  if (checking) return <div className="min-h-screen flex items-center justify-center text-slate-500 text-sm">Checking access...</div>

  return (
    <div className="min-h-screen px-4 py-6 md:px-8 max-w-2xl mx-auto">
      <button onClick={() => navigate('/practice-tests/admin')} className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-slate-200 mb-4">
        <i className="ti ti-arrow-left" /> Admin
      </button>

      <h1 className="text-xl font-black text-white mb-1">
        {editingTestId ? `Edit: ${existingTest?.title || '...'}` : 'Upload Test'}
      </h1>
      <p className="text-slate-500 text-xs mb-5">
        {metaOnly
          ? 'Is test pe attempts ho chuke hai — sirf status change ho sakta hai. Questions edit karne ke liye "Clone as new test" use karo.'
          : editingTestId
          ? 'Neeche section details edit kar sakte ho, ya naya AI-JSON paste karke poora test revalidate/replace kar sakte ho.'
          : 'Ek AI-generated JSON paste ya upload karo, validate karo, phir publish.'}
      </p>

      {!editingTestId && (
        <div className="mb-4">
          <label className="text-xs text-slate-400 mb-1 block">Subject</label>
          <select
            value={subjectId}
            onChange={(e) => setSubjectId(e.target.value)}
            className="w-full px-3 py-2.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-100 text-sm"
          >
            <option value="">Select subject...</option>
            {subjects.map((s) => <option key={s._id} value={s._id}>{s.name}</option>)}
          </select>
        </div>
      )}

      {!metaOnly && (
        <>
          <div className="rounded-xl border border-slate-800 bg-slate-900/50 px-4 py-3 mb-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">AI Prompt</p>
              <button onClick={handleCopyPrompt} className="text-xs font-semibold text-tapasya-orange hover:underline flex items-center gap-1">
                <i className={`ti ${copied ? 'ti-check' : 'ti-copy'}`} /> {copied ? 'Copied!' : 'Copy Prompt'}
              </button>
            </div>
            <p className="text-xs text-slate-500">
              Yeh prompt copy karo aur apne AI (ChatGPT/Claude/etc.) ko do — do tarike se chalega:
              (1) paper ka text copy-paste karke prompt ke saath do, YA
              (2) sirf yeh prompt de kar saath mein paper ki PDF/photo attach kar do (text paste karne ki zaroorat nahi).
              Dono case mein AI ki JSON reply neeche paste karo.
            </p>
          </div>

          <div className="mb-4">
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs text-slate-400">Paste JSON</label>
              <button onClick={() => fileInputRef.current?.click()} className="text-xs font-semibold text-slate-400 hover:text-slate-200 flex items-center gap-1">
                <i className="ti ti-file-upload" /> Or upload .json
              </button>
              <input ref={fileInputRef} type="file" accept=".json,application/json" onChange={handleFileUpload} className="hidden" />
            </div>
            <textarea
              value={rawJson}
              onChange={(e) => { setRawJson(e.target.value); setParsed(null); setValidation(null) }}
              rows={10}
              placeholder="{ ... }"
              className="w-full px-3 py-2.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-100 text-xs font-mono focus:outline-none focus:border-tapasya-orange/50"
            />
            {parseError && <p className="text-xs text-red-400 mt-1">{parseError}</p>}
          </div>

          <div className="flex gap-2 mb-4">
            <button onClick={handleParse} className="px-4 py-2 rounded-lg border border-slate-700 text-slate-300 text-sm font-semibold hover:bg-slate-800">
              Parse
            </button>
            <button
              onClick={handleValidate}
              disabled={validating}
              className="px-4 py-2 rounded-lg border border-tapasya-orange/40 text-tapasya-orange text-sm font-semibold hover:bg-tapasya-orange/10 disabled:opacity-60"
            >
              {validating ? 'Validating...' : 'Validate'}
            </button>
          </div>

          {validation && (
            <div className={`rounded-xl border px-4 py-3 mb-4 ${validation.valid ? 'border-emerald-500/30 bg-emerald-500/10' : 'border-red-500/30 bg-red-500/10'}`}>
              <div className="flex items-center justify-between gap-2 mb-1">
                <p className={`text-sm font-bold ${validation.valid ? 'text-emerald-400' : 'text-red-400'}`}>
                  {validation.valid ? 'Valid! Ready to publish.' : `${validation.errors.length} error(s) mile`}
                </p>
                {validation.valid && validation.normalized && (
                  <button
                    onClick={() => setShowPreview(true)}
                    title="Har question ka answer check/edit karo, publish se pehle"
                    className="text-xs font-bold text-emerald-300 hover:underline shrink-0 flex items-center gap-1"
                  >
                    <i className="ti ti-eye" /> Preview &amp; Verify
                  </button>
                )}
              </div>
              {!validation.valid && (
                <ul className="text-xs text-red-300 space-y-1 list-disc list-inside">
                  {validation.errors.map((e, i) => <li key={i}>{e}</li>)}
                </ul>
              )}
              {validation.topicSuggestions?.length > 0 && (
                <div className="mt-2 pt-2 border-t border-white/10">
                  <p className="text-xs font-bold text-amber-400 mb-1">Topic suggestions</p>
                  {validation.topicSuggestions.map((s, i) => (
                    <p key={i} className="text-xs text-amber-300">"{s.raw}" → did you mean "{s.suggested}"?</p>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {!metaOnly && parsed && (editingTestId || validation?.valid) && (
        <TestEditForm payload={parsed} onChange={setParsed} />
      )}

      <div className="flex gap-2">
        {!metaOnly && (
          <button
            onClick={() => handleSave(false)}
            disabled={saving}
            className="flex-1 py-2.5 rounded-xl border border-slate-700 text-slate-300 text-sm font-semibold hover:bg-slate-800 disabled:opacity-60"
          >
            Save Draft
          </button>
        )}
        <button
          onClick={() => handleSave(true)}
          disabled={saving}
          className="flex-1 py-2.5 rounded-xl bg-tapasya-orange text-white text-sm font-bold hover:bg-tapasya-orange-dark disabled:opacity-60"
        >
          {saving ? 'Saving...' : 'Publish'}
        </button>
      </div>

      {showPreview && (parsed?.sections || validation?.normalized?.sections) && (
        <TestPreviewModal
          sections={parsed?.sections || validation.normalized.sections}
          onClose={() => setShowPreview(false)}
          onChange={(sections) => setParsed((p) => ({ ...(p || validation.normalized), sections }))}
        />
      )}
    </div>
  )
}