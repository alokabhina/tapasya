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
import { getAdminPracticeTests, updatePracticeTest, deletePracticeTest, clonePracticeTest } from '@/api/practiceTests'

const SWATCHES = ['#f97316', '#06b6d4', '#a855f7', '#22c55e', '#ef4444', '#eab308', '#3b82f6', '#ec4899']

export default function PracticeAdminSubjects() {
  const navigate = useNavigate()
  const [checking, setChecking] = useState(true)
  const [subjects, setSubjects] = useState([])
  const [tests, setTests] = useState([])
  const [filterSubject, setFilterSubject] = useState('')
  const [showNewForm, setShowNewForm] = useState(false)
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
  const visibleTests = filterSubject ? tests.filter((t) => t.subjectId === filterSubject) : tests

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

      {/* ── Subjects ──────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">Subjects</p>
        <button onClick={() => setShowNewForm((v) => !v)} className="text-xs font-semibold text-tapasya-orange hover:underline">
          {showNewForm ? 'Cancel' : '+ New Subject'}
        </button>
      </div>

      {showNewForm && <NewSubjectForm onCreated={() => { setShowNewForm(false); loadAll() }} order={subjects.length} />}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-8">
        {subjects.map((s) => (
          <SubjectCard key={s._id} subject={s} busy={busy} onSaved={loadAll} onDelete={() => handleDeleteSubject(s)} />
        ))}
        {subjects.length === 0 && <p className="text-slate-500 text-sm col-span-full">Koi subject nahi bana — pehle ek subject banao.</p>}
      </div>

      {/* ── All tests ─────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">All Tests</p>
        <select
          value={filterSubject}
          onChange={(e) => setFilterSubject(e.target.value)}
          className="text-xs px-2.5 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-300"
        >
          <option value="">All subjects</option>
          {subjects.map((s) => <option key={s._id} value={s._id}>{s.name}</option>)}
        </select>
      </div>

      <div className="space-y-2">
        {visibleTests.map((t) => (
          <div key={t._id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-900/50 px-4 py-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold text-slate-100 truncate">{t.title}</p>
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${t.status === 'published' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-slate-700 text-slate-400'}`}>
                  {t.status}
                </span>
                {t.hasAttempts && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-purple-500/15 text-purple-400">has attempts</span>}
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {subjectById[t.subjectId]?.name || '—'} · {t.totalQuestions} Qs · {t.totalMarks} marks
              </p>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                disabled={busy || t.hasAttempts}
                title={t.hasAttempts ? 'Attempts ho chuke hai — edit ke liye pehle Clone karo' : 'Edit'}
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

function NewSubjectForm({ onCreated, order }) {
  const [name, setName] = useState('')
  const [color, setColor] = useState(SWATCHES[0])
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    if (!name.trim() || saving) return
    setSaving(true)
    try {
      await createPracticeSubject({ name: name.trim(), color, order })
      onCreated()
    } catch { alert('Save nahi ho paya') } finally { setSaving(false) }
  }

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/50 px-4 py-3 mb-3 flex flex-wrap items-center gap-2">
      <input
        autoFocus
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Subject name, e.g. Quant"
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

function SubjectCard({ subject, busy, onSaved, onDelete }) {
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(subject.name)
  const [color, setColor] = useState(subject.color)
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    setSaving(true)
    try { await updatePracticeSubject(subject._id, { name: name.trim(), color }); setEditing(false); onSaved() }
    catch { alert('Update nahi ho paya') } finally { setSaving(false) }
  }

  return (
    <div className="rounded-2xl p-4" style={{ background: 'linear-gradient(135deg, #101a30 0%, #0d1728 100%)', border: `1px solid ${subject.color}30` }}>
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
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-base font-black shrink-0" style={{ background: `${subject.color}20`, color: subject.color }}>
              {subject.name?.[0]?.toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-white font-bold text-sm truncate">{subject.name}</p>
              <p className="text-slate-500 text-xs">{subject.testCount ?? 0} test(s)</p>
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