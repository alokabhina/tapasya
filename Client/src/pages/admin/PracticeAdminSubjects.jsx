// src/pages/admin/PracticeAdminSubjects.jsx
// Admin-only: Subject CRUD grid + the full test list across every subject
// (plan doc Section 2 IA: `/practice-tests/admin`, Section 8.1). Gated
// client-side via isPracticeAdmin() — the two allowed emails from
// middleware/practiceAdmin.js. Backend 403s a non-admin regardless, this
// is just so a regular user gets bounced instead of seeing a 403 page.

import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  getPracticeSubjects, isPracticeAdmin, createPracticeSubject, updatePracticeSubject, deletePracticeSubject,
} from '@/api/practiceSubjects'
import {
  getPracticeExams, createPracticeExam, updatePracticeExam, deletePracticeExam,
} from '@/api/practiceExams'
import { getAdminPracticeTests, updatePracticeTest, deletePracticeTest, clonePracticeTest, bulkDeletePracticeTests } from '@/api/practiceTests'

const SWATCHES = ['#f97316', '#06b6d4', '#a855f7', '#22c55e', '#ef4444', '#eab308', '#3b82f6', '#ec4899']

export default function PracticeAdminSubjects() {
  const navigate = useNavigate()
  const [checking, setChecking] = useState(true)
  const [exams, setExams] = useState([])
  const [showNewExam, setShowNewExam] = useState(false)
  const [subjects, setSubjects] = useState([])
  const [tests, setTests] = useState([])
  const [filterSubject, setFilterSubject] = useState('')
  const [selected, setSelected] = useState(() => new Set()) // multi-select for bulk delete
  const [showNewForm, setShowNewForm] = useState(false)
  const [presetParentId, setPresetParentId] = useState('') // card ke "+ Folder" button se form pre-fill
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    isPracticeAdmin().then((ok) => {
      if (!ok) { navigate('/practice-tests', { replace: true }); return }
      setChecking(false)
      loadAll()
    }).catch(() => navigate('/practice-tests', { replace: true }))
  }, [])

  function loadAll() {
    setSelected(new Set())
    getPracticeExams().then(setExams).catch(() => setError('Exams load nahi ho paye'))
    getPracticeSubjects().then(setSubjects).catch(() => setError('Subjects load nahi ho paye'))
    getAdminPracticeTests().then(setTests).catch(() => setError('Tests load nahi ho paye'))
  }

  async function handleDeleteSubject(s) {
    if (!window.confirm(`"${s.name}" subject delete karna hai?`)) return
    setBusy(true)
    try {
      await deletePracticeSubject(s._id)
      loadAll()
    } catch (e) {
      alert(e?.response?.data?.error || 'Delete nahi ho paya')
    } finally { setBusy(false) }
  }

  async function handleDeleteExam(x) {
    if (!window.confirm(`"${x.name}" exam delete karna hai?`)) return
    setBusy(true)
    try {
      await deletePracticeExam(x._id)
      loadAll()
    } catch (e) {
      alert(e?.response?.data?.error || 'Delete nahi ho paya')
    } finally { setBusy(false) }
  }

  function toggleSelect(id) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  async function handleBulkDelete(visible) {
    const picked = visible.filter((t) => selected.has(t._id))
    if (picked.length === 0 || busy) return
    const withAttempts = picked.filter((t) => t.hasAttempts).length
    const msg = `${picked.length} test(s) delete karne hai?`
      + (withAttempts ? `\n\n${withAttempts} test(s) me students ke attempts bhi hai — wo saare attempts bhi permanently delete ho jayenge (leaderboard/history se bhi).` : '')
      + '\n\nYeh action undo nahi ho sakta.'
    if (!window.confirm(msg)) return
    setBusy(true)
    try {
      await bulkDeletePracticeTests(picked.map((t) => t._id))
      loadAll()
    } catch (e) { alert(e?.response?.data?.error || 'Delete nahi ho paya') } finally { setBusy(false) }
  }

  async function handleToggleStatus(t) {
    setBusy(true)
    try {
      await updatePracticeTest(t._id, { status: t.status === 'published' ? 'draft' : 'published' })
      loadAll()
    } catch { alert('Update nahi ho paya') } finally { setBusy(false) }
  }

  async function handleDeleteTest(t) {
    const msg = t.hasAttempts
      ? `"${t.title}" test delete karna hai? Isme students ke attempts bhi ho chuke hai — wo saare attempts bhi permanently delete ho jayenge (leaderboard/history se bhi gayab). Yeh action undo nahi ho sakta.`
      : `"${t.title}" test delete karna hai?`
    if (!window.confirm(msg)) return
    setBusy(true)
    try {
      await deletePracticeTest(t._id)
      loadAll()
    } catch (e) { alert(e?.response?.data?.error || 'Delete nahi ho paya') } finally { setBusy(false) }
  }

  async function handleClone(t) {
    setBusy(true)
    try {
      const clone = await clonePracticeTest(t._id)
      loadAll()
      navigate(`/practice-tests/admin/upload?testId=${clone._id}`)
    } catch { alert('Clone nahi ho paya') } finally { setBusy(false) }
  }

  if (checking) return <div className="min-h-screen flex items-center justify-center text-slate-500 text-sm">Checking access...</div>

  const subjectById = Object.fromEntries(subjects.map((s) => [s._id, s]))
  const examById = Object.fromEntries(exams.map((x) => [x._id, x]))
  const topLevelSubjects = subjects.filter((s) => !s.parentId)
  const subjectLabel = (s) => {
    const parent = s.parentId ? subjectById[s.parentId] : null
    return `${examById[s.examId]?.name ? `${examById[s.examId].name} · ` : ''}${parent ? `${parent.name} › ` : ''}${s.name}`
  }
  const filterIds = filterSubject
    ? new Set([filterSubject, ...subjects.filter((s) => s.parentId === filterSubject).map((s) => s._id)])
    : null
  const visibleTests = filterIds ? tests.filter((t) => filterIds.has(t.subjectId)) : tests
  const selectedVisible = visibleTests.filter((t) => selected.has(t._id))
  const allVisibleSelected = visibleTests.length > 0 && selectedVisible.length === visibleTests.length

  return (
    <div className="min-h-screen px-4 py-6 md:px-8">
      <button onClick={() => navigate('/practice-tests')} className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-slate-200 mb-4">
        <i className="ti ti-arrow-left" /> Practice Tests
      </button>

      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <h1 className="text-xl font-black text-white flex items-center gap-2"><i className="ti ti-shield-lock text-tapasya-orange" /> Practice Test Admin</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/practice-tests/admin/reports')}
            className="flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-xl border border-red-500/40 text-red-400 hover:bg-red-500/10"
          >
            <i className="ti ti-flag-3" /> Reports
          </button>
          <button
            onClick={() => navigate('/practice-tests/admin/upload')}
            className="flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-xl bg-tapasya-orange text-white hover:bg-tapasya-orange-dark"
          >
            <i className="ti ti-upload" /> Upload Test
          </button>
        </div>
      </div>

      {error && <div className="rounded-xl border border-red-500/30 bg-red-500/10 text-red-300 text-sm px-4 py-3 mb-4">{error}</div>}

      {/* ── Exams (top level: Exam -> Subject -> Test) ───────────────── */}
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">Exams</p>
        <button onClick={() => setShowNewExam((v) => !v)} className="text-xs font-semibold text-tapasya-orange hover:underline">
          {showNewExam ? 'Cancel' : '+ New Exam'}
        </button>
      </div>

      {showNewExam && <NewExamForm onCreated={() => { setShowNewExam(false); loadAll() }} order={exams.length} />}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-8">
        {exams.map((x) => (
          <ExamCard key={x._id} exam={x} busy={busy} onSaved={loadAll} onDelete={() => handleDeleteExam(x)} />
        ))}
        {exams.length === 0 && <p className="text-slate-500 text-sm col-span-full">Koi exam nahi bana — pehle ek exam banao (e.g. IBPS Clerk), phir uske subjects.</p>}
      </div>

      {/* ── Subjects (grouped by exam) ────────────────────────────────── */}
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">Subjects</p>
        <button
          onClick={() => { setPresetParentId(''); setShowNewForm((v) => !v) }}
          disabled={exams.length === 0}
          title={exams.length === 0 ? 'Pehle ek exam banao' : ''}
          className="text-xs font-semibold text-tapasya-orange hover:underline disabled:opacity-40"
        >
          {showNewForm ? 'Cancel' : '+ New Subject / Folder'}
        </button>
      </div>

      {showNewForm && (
        <NewSubjectForm
          key={presetParentId || 'new'}
          exams={exams}
          subjects={topLevelSubjects}
          presetParentId={presetParentId}
          onCreated={() => { setShowNewForm(false); setPresetParentId(''); loadAll() }}
          order={subjects.length}
        />
      )}

      <div className="mb-8 space-y-4">
        {exams.map((x) => {
          // top-level subject ke turant baad uske folders (nested order)
          const list = []
          for (const s of topLevelSubjects.filter((t) => t.examId === x._id)) {
            list.push(s)
            list.push(...subjects.filter((f) => f.parentId === s._id))
          }
          if (list.length === 0) return null
          return (
            <div key={x._id}>
              <p className="text-[11px] font-bold mb-1.5 flex items-center gap-1.5" style={{ color: x.color }}>
                <span className="w-2 h-2 rounded-full" style={{ background: x.color }} /> {x.name}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {list.map((s) => (
                  <SubjectCard
                    key={s._id}
                    subject={s}
                    parentName={s.parentId ? subjectById[s.parentId]?.name : ''}
                    exams={exams}
                    busy={busy}
                    onSaved={loadAll}
                    onDelete={() => handleDeleteSubject(s)}
                    onAddFolder={() => { setPresetParentId(s._id); setShowNewForm(true) }}
                  />
                ))}
              </div>
            </div>
          )
        })}
        {subjects.length === 0 && <p className="text-slate-500 text-sm">Koi subject nahi bana — exam select karke subject banao.</p>}
      </div>

      {/* ── All tests ─────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-3 flex-wrap">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">All Tests</p>
          {visibleTests.length > 0 && (
            <label className="flex items-center gap-1.5 text-xs text-slate-400 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={allVisibleSelected}
                onChange={() => setSelected(allVisibleSelected ? new Set() : new Set(visibleTests.map((t) => t._id)))}
                className="w-4 h-4 accent-tapasya-orange"
              />
              Select all
            </label>
          )}
          {selectedVisible.length > 0 && (
            <button
              disabled={busy}
              onClick={() => handleBulkDelete(visibleTests)}
              className="flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-lg border border-red-500/40 text-red-400 hover:bg-red-500/10 disabled:opacity-50"
            >
              <i className="ti ti-trash" /> Delete selected ({selectedVisible.length})
            </button>
          )}
        </div>
        <select
          value={filterSubject}
          onChange={(e) => { setFilterSubject(e.target.value); setSelected(new Set()) }}
          className="text-xs px-2.5 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-300"
        >
          <option value="">All subjects</option>
          {subjects.map((s) => <option key={s._id} value={s._id}>{subjectLabel(s)}</option>)}
        </select>
      </div>

      <div className="space-y-2">
        {visibleTests.map((t) => (
          <div key={t._id} className={`flex items-center justify-between gap-3 rounded-xl border px-4 py-3 ${selected.has(t._id) ? 'border-tapasya-orange/50 bg-tapasya-orange/5' : 'border-slate-800 bg-slate-900/50'}`}>
            <input
              type="checkbox"
              checked={selected.has(t._id)}
              onChange={() => toggleSelect(t._id)}
              aria-label={`Select ${t.title}`}
              className="w-4 h-4 shrink-0 accent-tapasya-orange cursor-pointer"
            />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold text-slate-100 truncate">{t.title}</p>
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${t.status === 'published' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-slate-700 text-slate-400'}`}>
                  {t.status}
                </span>
                {t.hasAttempts && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-purple-500/15 text-purple-400">has attempts</span>}
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {subjectById[t.subjectId] ? subjectLabel(subjectById[t.subjectId]) : '—'} · {t.totalQuestions} Qs · {t.totalMarks} marks
              </p>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                disabled={busy}
                title={t.hasAttempts ? 'Attempts ho chuke hai — sirf images add/change ho sakti hai (questions ke liye Clone karo)' : 'Edit'}
                onClick={() => navigate(`/practice-tests/admin/upload?testId=${t._id}`)}
                className="w-8 h-8 rounded-lg border border-slate-700 text-slate-300 hover:bg-slate-800 flex items-center justify-center disabled:opacity-30"
              >
                <i className="ti ti-edit text-sm" />
              </button>
              <button
                disabled={busy}
                onClick={() => handleToggleStatus(t)}
                title={t.status === 'published' ? 'Unpublish' : 'Publish'}
                className="w-8 h-8 rounded-lg border border-slate-700 text-slate-300 hover:bg-slate-800 flex items-center justify-center"
              >
                <i className={`ti ${t.status === 'published' ? 'ti-eye-off' : 'ti-eye'} text-sm`} />
              </button>
              {t.hasAttempts && (
                <>
                  <button onClick={() => navigate(`/practice-tests/admin/${t._id}/leaderboard`)} title="Leaderboard" className="w-8 h-8 rounded-lg border border-slate-700 text-slate-300 hover:bg-slate-800 flex items-center justify-center">
                    <i className="ti ti-trophy text-sm" />
                  </button>
                  <button disabled={busy} onClick={() => handleClone(t)} title="Clone as new test" className="w-8 h-8 rounded-lg border border-slate-700 text-slate-300 hover:bg-slate-800 flex items-center justify-center">
                    <i className="ti ti-copy text-sm" />
                  </button>
                </>
              )}
              <button
                disabled={busy}
                title={t.hasAttempts ? 'Attempts ho chuke hai — delete karne se wo bhi mit jayenge' : 'Delete'}
                onClick={() => handleDeleteTest(t)}
                className="w-8 h-8 rounded-lg border border-red-500/30 text-red-400 hover:bg-red-500/10 flex items-center justify-center disabled:opacity-30"
              >
                <i className="ti ti-trash text-sm" />
              </button>
            </div>
          </div>
        ))}
        {visibleTests.length === 0 && <p className="text-slate-500 text-sm">Koi test nahi mila.</p>}
      </div>
    </div>
  )
}

function NewExamForm({ onCreated, order }) {
  const [name, setName] = useState('')
  const [color, setColor] = useState(SWATCHES[0])
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    if (!name.trim() || saving) return
    setSaving(true)
    try {
      await createPracticeExam({ name: name.trim(), color, order })
      onCreated()
    } catch (e) { alert(e?.response?.data?.error || 'Save nahi ho paya') } finally { setSaving(false) }
  }

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/50 px-4 py-3 mb-3 flex flex-wrap items-center gap-2">
      <input
        autoFocus
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Exam name, e.g. IBPS Clerk"
        className="flex-1 min-w-[160px] px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-100 text-sm focus:outline-none focus:border-tapasya-orange/50"
      />
      <div className="flex items-center gap-1">
        {SWATCHES.map((c) => (
          <button key={c} onClick={() => setColor(c)} className="w-6 h-6 rounded-full" style={{ background: c, boxShadow: color === c ? `0 0 0 2px #0f172a, 0 0 0 4px ${c}` : 'none' }} />
        ))}
      </div>
      <button onClick={handleSave} disabled={saving} className="px-4 py-2 rounded-lg bg-tapasya-orange text-white text-sm font-bold hover:bg-tapasya-orange-dark disabled:opacity-60">
        {saving ? 'Saving...' : 'Save'}
      </button>
    </div>
  )
}

function ExamCard({ exam, busy, onSaved, onDelete }) {
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(exam.name)
  const [color, setColor] = useState(exam.color)
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    if (!name.trim()) return
    setSaving(true)
    try { await updatePracticeExam(exam._id, { name: name.trim(), color }); setEditing(false); onSaved() }
    catch (e) { alert(e?.response?.data?.error || 'Update nahi ho paya') } finally { setSaving(false) }
  }

  return (
    <div className="rounded-2xl p-4" style={{ background: 'linear-gradient(135deg, #101a30 0%, #0d1728 100%)', border: `1px solid ${exam.color}30` }}>
      {editing ? (
        <div className="space-y-2">
          <input value={name} onChange={(e) => setName(e.target.value)} className="w-full px-2.5 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-100 text-sm" />
          <div className="flex items-center gap-1">
            {SWATCHES.map((c) => (
              <button key={c} onClick={() => setColor(c)} className="w-5 h-5 rounded-full" style={{ background: c, boxShadow: color === c ? `0 0 0 2px #101a30, 0 0 0 3px ${c}` : 'none' }} />
            ))}
          </div>
          <div className="flex gap-2">
            <button onClick={handleSave} disabled={saving} className="flex-1 py-1.5 rounded-lg bg-tapasya-orange text-white text-xs font-bold">Save</button>
            <button onClick={() => setEditing(false)} className="flex-1 py-1.5 rounded-lg border border-slate-700 text-slate-300 text-xs font-semibold">Cancel</button>
          </div>
        </div>
      ) : (
        <>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-base font-black shrink-0" style={{ background: `${exam.color}20`, color: exam.color }}>
              {exam.name?.[0]?.toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-white font-bold text-sm truncate">{exam.name}</p>
              <p className="text-slate-500 text-xs">{exam.subjectCount ?? 0} subject(s) · {exam.testCount ?? 0} test(s)</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setEditing(true)} className="flex-1 text-xs font-bold py-1.5 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700">
              <i className="ti ti-edit mr-1" /> Edit
            </button>
            <button disabled={busy} onClick={onDelete} className="flex-1 text-xs font-bold py-1.5 rounded-lg border border-red-500/30 text-red-400 hover:bg-red-500/10">
              <i className="ti ti-trash mr-1" /> Delete
            </button>
          </div>
        </>
      )}
    </div>
  )
}

function NewSubjectForm({ exams = [], subjects = [], presetParentId = '', onCreated, order }) {
  const [name, setName] = useState('')
  const [parentId, setParentId] = useState(presetParentId)   // '' = normal subject, else folder inside this subject
  const [examId, setExamId] = useState(
    () => subjects.find((x) => x._id === presetParentId)?.examId || exams[0]?._id || ''
  )
  const [isOptional, setIsOptional] = useState(false)
  const [color, setColor] = useState(SWATCHES[0])
  const [saving, setSaving] = useState(false)

  const isFolder = !!parentId
  const examSubjects = subjects.filter((s) => s.examId === examId)

  function handleExamChange(id) {
    setExamId(id)
    setParentId('')   // exam badla to purana parent subject valid nahi
  }

  async function handleSave() {
    if (!name.trim() || !examId || saving) return
    setSaving(true)
    try {
      await createPracticeSubject({
        name: name.trim(),
        examId,
        parentId: parentId || undefined,
        isOptional,
        color,
        order,
      })
      onCreated()
    } catch (e) { alert(e?.response?.data?.error || 'Save nahi ho paya') } finally { setSaving(false) }
  }

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/50 px-4 py-3 mb-3 space-y-2.5">
      <div className="flex flex-wrap items-center gap-2">
        <select
          value={examId}
          onChange={(e) => handleExamChange(e.target.value)}
          className="px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-100 text-sm"
        >
          {exams.map((x) => <option key={x._id} value={x._id}>{x.name}</option>)}
        </select>
        <select
          value={parentId}
          onChange={(e) => setParentId(e.target.value)}
          className="px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-100 text-sm"
        >
          <option value="">Naya subject (top-level)</option>
          {examSubjects.map((s) => <option key={s._id} value={s._id}>Folder inside: {s.name}</option>)}
        </select>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={isFolder ? 'Folder name, e.g. Optional Papers' : 'Subject name, e.g. Quant'}
          className="flex-1 min-w-[160px] px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-100 text-sm focus:outline-none focus:border-tapasya-orange/50"
        />
        <div className="flex items-center gap-1">
          {SWATCHES.map((c) => (
            <button key={c} onClick={() => setColor(c)} className="w-6 h-6 rounded-full" style={{ background: c, boxShadow: color === c ? `0 0 0 2px #0f172a, 0 0 0 4px ${c}` : 'none' }} />
          ))}
        </div>
      </div>
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer select-none">
          <input type="checkbox" checked={isOptional} onChange={(e) => setIsOptional(e.target.checked)} className="w-4 h-4 accent-tapasya-orange" />
          Optional {isFolder ? 'folder' : 'subject'} (students ko alag "Optional" section me dikhega)
        </label>
        <button onClick={handleSave} disabled={saving} className="px-4 py-2 rounded-lg bg-tapasya-orange text-white text-sm font-bold hover:bg-tapasya-orange-dark disabled:opacity-60">
          {saving ? 'Saving...' : isFolder ? 'Create Folder' : 'Save'}
        </button>
      </div>
    </div>
  )
}

function SubjectCard({ subject, parentName = '', exams = [], busy, onSaved, onDelete, onAddFolder }) {
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(subject.name)
  const [examId, setExamId] = useState(subject.examId || '')
  const [color, setColor] = useState(subject.color)
  const [isOptional, setIsOptional] = useState(!!subject.isOptional)
  const [saving, setSaving] = useState(false)
  const isFolder = !!subject.parentId

  async function handleSave() {
    setSaving(true)
    try {
      // folder ka exam parent se hi chalta hai — exam sirf top-level subject me badalta hai
      await updatePracticeSubject(subject._id, { name: name.trim(), color, isOptional, ...(!isFolder && examId ? { examId } : {}) })
      setEditing(false)
      onSaved()
    }
    catch (e) { alert(e?.response?.data?.error || 'Update nahi ho paya') } finally { setSaving(false) }
  }

  return (
    <div className="rounded-2xl p-4" style={{ background: 'linear-gradient(135deg, #101a30 0%, #0d1728 100%)', border: `1px solid ${subject.color}30` }}>
      {editing ? (
        <div className="space-y-2">
          <input value={name} onChange={(e) => setName(e.target.value)} className="w-full px-2.5 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-100 text-sm" />
          {!isFolder && (
            <select value={examId} onChange={(e) => setExamId(e.target.value)} className="w-full px-2.5 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-100 text-xs">
              {exams.map((x) => <option key={x._id} value={x._id}>{x.name}</option>)}
            </select>
          )}
          <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer select-none">
            <input type="checkbox" checked={isOptional} onChange={(e) => setIsOptional(e.target.checked)} className="w-4 h-4 accent-tapasya-orange" />
            Optional
          </label>
          <div className="flex items-center gap-1">
            {SWATCHES.map((c) => (
              <button key={c} onClick={() => setColor(c)} className="w-5 h-5 rounded-full" style={{ background: c, boxShadow: color === c ? `0 0 0 2px #101a30, 0 0 0 3px ${c}` : 'none' }} />
            ))}
          </div>
          <div className="flex gap-2">
            <button onClick={handleSave} disabled={saving} className="flex-1 py-1.5 rounded-lg bg-tapasya-orange text-white text-xs font-bold">Save</button>
            <button onClick={() => setEditing(false)} className="flex-1 py-1.5 rounded-lg border border-slate-700 text-slate-300 text-xs font-semibold">Cancel</button>
          </div>
        </div>
      ) : (
        <>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-base font-black shrink-0" style={{ background: `${subject.color}20`, color: subject.color }}>
              {isFolder ? <i className="ti ti-folder" /> : subject.name?.[0]?.toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-white font-bold text-sm truncate flex items-center gap-1.5">
                {subject.name}
                {subject.isOptional && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-tapasya-orange/15 text-tapasya-orange">Optional</span>}
              </p>
              <p className="text-slate-500 text-xs truncate">
                {isFolder ? `Folder in ${parentName || '—'} · ` : ''}
                {subject.ownTestCount ?? subject.testCount ?? 0} test(s)
                {!isFolder && subject.folderCount > 0 ? ` · ${subject.folderCount} folder(s)` : ''}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setEditing(true)} className="flex-1 text-xs font-bold py-1.5 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700">
              <i className="ti ti-edit mr-1" /> Edit
            </button>
            {!isFolder && (
              <button onClick={onAddFolder} title="Is subject ke andar folder banao" className="flex-1 text-xs font-bold py-1.5 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700">
                <i className="ti ti-folder-plus mr-1" /> Folder
              </button>
            )}
            <button disabled={busy} onClick={onDelete} className="flex-1 text-xs font-bold py-1.5 rounded-lg border border-red-500/30 text-red-400 hover:bg-red-500/10">
              <i className="ti ti-trash mr-1" /> Delete
            </button>
          </div>
        </>
      )}
    </div>
  )
}