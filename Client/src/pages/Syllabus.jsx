// pages/Syllabus.jsx
import { useState, useEffect, useCallback } from 'react'
import api from '@/api/client'
import AddTopicModal from '@/components/syllabus/AddTopicModal'
import PDFParser from '@/components/syllabus/PDFParser'

async function getSyllabus()       { return api.get('/syllabus').then(r => r.data) }
async function getStats()          { return api.get('/syllabus/stats').then(r => r.data) }
async function apiAddTopics(body)  { return api.post('/syllabus', body).then(r => r.data) }
async function apiPatchTopic(id,b) { return api.patch(`/syllabus/${id}`, b).then(r => r.data) }
async function apiDeleteTopic(id)  { return api.delete(`/syllabus/${id}`).then(r => r.data) }
async function apiDeleteExam(id)   { return api.delete(`/exams/${id}`).then(r => r.data) }

const CONFIDENCE_CONFIG = [
  { val: 0, label: '—',      color: '#475569', ring: 'ring-slate-600',  dot: 'bg-slate-500'  },
  { val: 1, label: 'Weak',   color: '#ef4444', ring: 'ring-red-500',    dot: 'bg-red-500'    },
  { val: 2, label: 'OK',     color: '#f59e0b', ring: 'ring-amber-500',  dot: 'bg-amber-500'  },
  { val: 3, label: 'Strong', color: '#22c55e', ring: 'ring-green-500',  dot: 'bg-green-500'  },
]

const EXAM_COLORS = ['#a855f7','#3b82f6','#f97316','#22c55e','#ef4444','#ec4899','#14b8a6','#f59e0b']

export default function Syllabus() {
  const [exams, setExams]               = useState([])
  const [subjects, setSubjects]         = useState([])
  const [topics, setTopics]             = useState([])
  const [stats, setStats]               = useState(null)
  const [selectedExam, setSelectedExam] = useState(null)
  const [activeView, setActiveView]     = useState('topics')
  const [showAdd, setShowAdd]           = useState(false)
  const [showPDF, setShowPDF]           = useState(false)
  const [loading, setLoading]           = useState(true)
  const [expandedSubjects, setExpandedSubjects] = useState({})
  // Mobile: show exam list or topics panel
  const [mobilePanel, setMobilePanel]   = useState('exams') // 'exams' | 'topics'
  const [examToDelete, setExamToDelete] = useState(null)
  const [deletingExam, setDeletingExam] = useState(false)

  const refreshStats = () => getStats().then(setStats).catch(() => {})

  const fetchAll = useCallback(async () => {
    setLoading(true)
    try {
      const [e, s, t, st] = await Promise.all([
        api.get('/exams').then(r => r.data),
        api.get('/subjects', { params: { scope: 'syllabus' } }).then(r => r.data),
        getSyllabus(),
        getStats(),
      ])
      const examsArr = Array.isArray(e) ? e : []
      setExams(examsArr)
      setSubjects(Array.isArray(s) ? s : [])
      setTopics(Array.isArray(t) ? t : [])
      setStats(st)
      if (examsArr.length > 0) setSelectedExam(prev => prev ?? examsArr[0])
    } catch (err) {
      console.error('[Syllabus] fetchAll error:', err)
      setExams([]); setSubjects([]); setTopics([])
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchAll() }, [fetchAll])

  const handlePatch = async (id, patch) => {
    setTopics(prev => prev.map(t => t._id === id ? { ...t, ...patch } : t))
    try { await apiPatchTopic(id, patch); refreshStats() }
    catch { fetchAll() }
  }

  const handleDelete = async (id) => {
    setTopics(prev => prev.filter(t => t._id !== id))
    try { await apiDeleteTopic(id); refreshStats() }
    catch { fetchAll() }
  }

  const confirmDeleteExam = async () => {
    if (!examToDelete) return
    setDeletingExam(true)
    try {
      await apiDeleteExam(examToDelete._id)
      setExams(prev => prev.filter(e => e._id !== examToDelete._id))
      setTopics(prev => prev.filter(t => t.examId !== examToDelete._id))
      if (selectedExam?._id === examToDelete._id) {
        const remaining = exams.filter(e => e._id !== examToDelete._id)
        setSelectedExam(remaining[0] || null)
        setMobilePanel('exams')
      }
      refreshStats()
      setExamToDelete(null)
    } catch {
      fetchAll()
    } finally {
      setDeletingExam(false)
    }
  }

  const handleAdd = async (payload) => {
    try {
      const data = await apiAddTopics(payload)
      const newTopics = Array.isArray(data) ? data : [data]
      setTopics(prev => [...prev, ...newTopics])
      refreshStats()
      return true
    } catch { return false }
  }

  const selectExam = (exam) => {
    setSelectedExam(exam)
    setMobilePanel('topics')  // on mobile, go to topics after selecting exam
  }

  const topicsForExam = (examId) => topics.filter(t => t.examId === examId)

  const examStats = (examId) => {
    const et = topicsForExam(examId)
    return {
      total: et.length,
      done:  et.filter(t => t.done).length,
      rev1:  et.filter(t => t.revision1).length,
      rev2:  et.filter(t => t.revision2).length,
      pct:   et.length ? Math.round((et.filter(t => t.done).length / et.length) * 100) : 0,
    }
  }

  if (loading) return (
    <div className="flex-1 flex items-center justify-center">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-slate-400 text-sm">Loading syllabus...</p>
      </div>
    </div>
  )

  return (
    // Fills the main content area exactly — no outer page scroll;
    // internal panels (exam list / topics list) scroll independently.
    <div className="h-full flex flex-col overflow-hidden bg-[#0a1020] text-white">

      {/* ── Top Header ── */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800 flex-shrink-0">
        <div className="flex items-center gap-3">
          {/* Mobile back button when in topics panel */}
          {mobilePanel === 'topics' && (
            <button
              onClick={() => setMobilePanel('exams')}
              className="sm:hidden text-slate-400 hover:text-white p-1 -ml-1"
            >
              <i className="ti ti-arrow-left text-lg" />
            </button>
          )}
          <div className="w-8 h-8 rounded-lg bg-purple-600/20 flex items-center justify-center flex-shrink-0">
            <i className="ti ti-books text-purple-400 text-base" />
          </div>
          <div>
            <h1 className="text-base font-semibold text-white leading-none">
              {mobilePanel === 'topics' && selectedExam
                ? <span className="sm:hidden">{selectedExam.name}</span>
                : null}
              <span className={mobilePanel === 'topics' && selectedExam ? 'hidden sm:inline' : ''}>
                Syllabus Tracker
              </span>
            </h1>
            <p className="text-slate-500 text-[11px] mt-0.5">Track your exam preparation</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowPDF(true)}
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition-colors border border-slate-700/60"
          >
            <i className="ti ti-file-upload text-sm" />
            <span className="hidden sm:inline">Import</span>
          </button>
          <button
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs transition-colors"
          >
            <i className="ti ti-plus text-sm" />
            <span className="hidden sm:inline">Add Topics</span>
          </button>
        </div>
      </div>

      {/* ── Main layout ── */}
      <div className="flex-1 flex min-h-0 overflow-hidden">

        {/* LEFT: Exam Panel — hidden on mobile when in topics view */}
        <div className={`
          w-full sm:w-60 flex-shrink-0 border-r border-slate-800 flex flex-col overflow-hidden
          ${mobilePanel === 'topics' ? 'hidden sm:flex' : 'flex'}
        `}>
          <ExamPanel
            exams={exams}
            selectedExam={selectedExam}
            setSelectedExam={selectExam}
            examStats={examStats}
            stats={stats}
            onExamCreated={(exam) => { setExams(prev => [...prev, exam]); selectExam(exam) }}
            onAddTopics={() => setShowAdd(true)}
            onDeleteExam={(exam) => setExamToDelete(exam)}
          />
        </div>

        {/* RIGHT: Topics/Stats panel — hidden on mobile when in exam list */}
        <div className={`
          flex-1 flex flex-col min-w-0 min-h-0
          ${mobilePanel === 'exams' ? 'hidden sm:flex' : 'flex'}
        `}>
          {!selectedExam ? (
            <div className="flex-1 flex items-center justify-center text-slate-500">
              <div className="text-center">
                <i className="ti ti-books text-4xl block mb-3 text-slate-700" />
                <p className="text-sm">Select an exam</p>
                <p className="text-xs text-slate-600 mt-1">or create a new exam to get started</p>
              </div>
            </div>
          ) : (
            <>
              {/* Sub-header */}
              <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-800 flex-shrink-0 bg-gradient-to-r from-slate-900/40 to-transparent">
                <MiniRing pct={examStats(selectedExam._id).pct} color={selectedExam.color || '#a855f7'} size={34} strokeW={3.5} />
                <div className="flex-1 min-w-0">
                  <h2 className="text-sm font-semibold text-white truncate hidden sm:block leading-tight">{selectedExam.name}</h2>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    <span className="text-slate-300 font-medium tabular-nums">{examStats(selectedExam._id).done}</span>
                    <span className="text-slate-600">/{examStats(selectedExam._id).total} done</span>
                    {examStats(selectedExam._id).rev1 > 0 && <span className="ml-2 text-blue-400">R1·{examStats(selectedExam._id).rev1}</span>}
                    {examStats(selectedExam._id).rev2 > 0 && <span className="ml-1.5 text-green-400">R2·{examStats(selectedExam._id).rev2}</span>}
                  </p>
                </div>
                <div className="flex bg-slate-800/80 rounded-lg p-0.5 border border-slate-700/50">
                  {['topics','stats'].map(v => (
                    <button key={v} onClick={() => setActiveView(v)}
                      className={`px-2.5 sm:px-3 py-1 rounded-md text-xs font-medium transition-all duration-200 capitalize ${
                        activeView === v ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                      }`}>{v}</button>
                  ))}
                </div>
                <button
                  onClick={() => setShowAdd(true)}
                  className="flex items-center gap-1 px-2 sm:px-2.5 py-1.5 rounded-lg text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors border border-slate-700/60"
                >
                  <i className="ti ti-plus text-sm" />
                </button>
              </div>

              {activeView === 'topics' ? (
                <TopicsView
                  exam={selectedExam}
                  subjects={subjects}
                  topics={topicsForExam(selectedExam._id)}
                  onPatch={handlePatch}
                  onDelete={handleDelete}
                  onAddClick={() => setShowAdd(true)}
                  expandedSubjects={expandedSubjects}
                  setExpandedSubjects={setExpandedSubjects}
                />
              ) : (
                <ExamStatsView
                  exam={selectedExam}
                  subjects={subjects}
                  topics={topicsForExam(selectedExam._id)}
                />
              )}
            </>
          )}
        </div>
      </div>

      {showAdd && (
        <AddTopicModal
          exams={exams}
          subjects={subjects}
          defaultExamId={selectedExam?._id}
          onClose={() => setShowAdd(false)}
          onAdd={handleAdd}
        />
      )}
      {showPDF && (
        <PDFParser
          exams={exams}
          subjects={subjects}
          defaultExamId={selectedExam?._id}
          onClose={() => setShowPDF(false)}
          onAdd={handleAdd}
        />
      )}
      {examToDelete && (
        <DeleteExamModal
          exam={examToDelete}
          topicCount={topicsForExam(examToDelete._id).length}
          deleting={deletingExam}
          onCancel={() => setExamToDelete(null)}
          onConfirm={confirmDeleteExam}
        />
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// DeleteExamModal — confirm-before-delete with explicit warning
// ─────────────────────────────────────────────────────────────────────────────
function DeleteExamModal({ exam, topicCount, deleting, onCancel, onConfirm }) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4" onClick={onCancel}>
      <div
        onClick={e => e.stopPropagation()}
        className="bg-[#0f1c30] border border-red-900/40 rounded-2xl w-full max-w-sm shadow-2xl p-5"
      >
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center flex-shrink-0">
            <i className="ti ti-alert-triangle text-red-400 text-lg" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">Delete this exam?</h3>
            <p className="text-[11px] text-slate-500">{exam.name}</p>
          </div>
        </div>
        <p className="text-xs text-slate-400 leading-relaxed mb-4">
          This will permanently delete <span className="text-white font-medium">{exam.name}</span>
          {topicCount > 0 && (
            <> along with all <span className="text-red-400 font-medium">{topicCount} topic{topicCount === 1 ? '' : 's'}</span> tracked under it</>
          )}. This action cannot be undone.
        </p>
        <div className="flex gap-2">
          <button
            onClick={onCancel}
            disabled={deleting}
            className="flex-1 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors disabled:opacity-50"
          >Cancel</button>
          <button
            onClick={onConfirm}
            disabled={deleting}
            className="flex-1 py-2 rounded-xl bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white text-xs font-medium transition-colors flex items-center justify-center gap-1.5"
          >
            {deleting ? <><i className="ti ti-loader-2 animate-spin text-sm" />Deleting…</> : <><i className="ti ti-trash text-sm" />Delete Exam</>}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// ExamPanel
// ─────────────────────────────────────────────────────────────────────────────
function ExamPanel({ exams, selectedExam, setSelectedExam, examStats, stats, onExamCreated, onDeleteExam }) {
  const [showForm, setShowForm] = useState(false)
  const [examName, setExamName] = useState('')
  const [examDate, setExamDate] = useState('')
  const [colorIdx, setColorIdx] = useState(0)
  const [creating, setCreating] = useState(false)
  const [err, setErr]           = useState('')

  const handleCreate = async () => {
    if (!examName.trim()) return setErr('Enter exam name')
    if (!examDate)        return setErr('Select exam date')
    setCreating(true); setErr('')
    try {
      const exam = await api.post('/exams', {
        name: examName.trim(),
        examDate,
        color: EXAM_COLORS[colorIdx % EXAM_COLORS.length],
      }).then(r => r.data)
      onExamCreated(exam)
      setExamName(''); setExamDate(''); setShowForm(false)
    } catch { setErr('Failed to create exam') }
    setCreating(false)
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Panel header */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-slate-800 flex-shrink-0">
        <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">Exams</span>
        <button
          onClick={() => { setShowForm(v => !v); setErr('') }}
          className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-medium transition-all ${
            showForm ? 'bg-slate-700 text-slate-300' : 'bg-purple-600/20 hover:bg-purple-600/40 text-purple-400'
          }`}
        >
          <i className={`ti ${showForm ? 'ti-x' : 'ti-plus'} text-xs`} />
          {showForm ? 'Cancel' : 'New Exam'}
        </button>
      </div>

      {/* Create form */}
      {showForm && (
        <div className="px-3 py-3 border-b border-slate-800 bg-slate-900/60 flex-shrink-0 space-y-2">
          <input
            autoFocus value={examName}
            onChange={e => setExamName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleCreate()}
            placeholder="Exam name (e.g. IBPS PO)"
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
          />
          <input
            type="date" value={examDate}
            onChange={e => setExamDate(e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-purple-500"
          />
          <div className="flex gap-1.5 flex-wrap">
            {EXAM_COLORS.map((c, i) => (
              <button key={c} onClick={() => setColorIdx(i)}
                className={`w-5 h-5 rounded-full transition-all ${colorIdx===i ? 'ring-2 ring-white ring-offset-1 ring-offset-slate-900' : 'opacity-70 hover:opacity-100'}`}
                style={{ background: c }}
              />
            ))}
          </div>
          {err && <p className="text-[10px] text-red-400">{err}</p>}
          <button
            onClick={handleCreate}
            disabled={creating || !examName.trim() || !examDate}
            className="w-full py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white text-xs font-medium transition-colors"
          >{creating ? 'Creating…' : 'Create Exam'}</button>
        </div>
      )}

      {/* Exam list */}
      <div className="flex-1 overflow-y-auto py-2 px-2 space-y-0.5">
        {exams.length === 0 && !showForm && (
          <div className="text-center py-10 px-3">
            <i className="ti ti-certificate text-2xl text-slate-700 block mb-2" />
            <p className="text-xs text-slate-500">No exams yet</p>
            <button onClick={() => setShowForm(true)} className="text-purple-400 text-xs mt-2 hover:underline">+ Create first exam</button>
          </div>
        )}
        {exams.map(exam => {
          const es = examStats(exam._id)
          const isActive = selectedExam?._id === exam._id
          const examColor = exam.color || '#a855f7'
          return (
            <div key={exam._id} className="relative group">
              <button onClick={() => setSelectedExam(exam)}
                className={`w-full text-left rounded-xl px-3 py-2.5 pr-8 transition-all duration-200 ${
                  isActive ? 'bg-slate-800' : 'hover:bg-slate-800/50'
                }`}
                style={isActive ? { boxShadow: `0 0 0 1px ${examColor}55, inset 2px 0 0 0 ${examColor}` } : undefined}
              >
                <div className="flex items-start gap-2.5">
                  <span className="w-2.5 h-2.5 rounded-full flex-shrink-0 mt-[3px]" style={{ background: examColor }} />
                  <div className="flex-1 min-w-0">
                    <p className={`text-xs font-medium truncate leading-snug ${isActive ? 'text-white' : 'text-slate-300 group-hover:text-white'}`}>
                      {exam.name}
                    </p>
                    <p className="text-[10px] text-slate-500 mt-0.5 tabular-nums">{es.done}/{es.total} done</p>
                    <div className="mt-1.5 h-1 bg-slate-700 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-500"
                        style={{ width:`${es.pct}%`, background: examColor }} />
                    </div>
                    {(es.rev1>0||es.rev2>0) && (
                      <div className="flex gap-1.5 mt-1.5">
                        {es.rev1>0 && <span className="text-[9px] px-1.5 py-0.5 rounded bg-blue-900/50 text-blue-400 font-medium">R1 {es.rev1}</span>}
                        {es.rev2>0 && <span className="text-[9px] px-1.5 py-0.5 rounded bg-green-900/50 text-green-400 font-medium">R2 {es.rev2}</span>}
                      </div>
                    )}
                  </div>
                  <span className={`text-[10px] font-bold tabular-nums flex-shrink-0 mt-0.5 ${isActive ? 'text-white' : 'text-slate-500'}`}>
                    {es.pct}%
                  </span>
                </div>
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); onDeleteExam?.(exam) }}
                title="Delete exam"
                className="absolute top-2 right-1.5 w-6 h-6 rounded-lg flex items-center justify-center text-slate-600 hover:text-red-400 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-all"
              >
                <i className="ti ti-trash text-xs" />
              </button>
            </div>
          )
        })}
      </div>

      {/* Overall footer */}
      {stats && (
        <div className="border-t border-slate-800 px-3 py-3 flex-shrink-0">
          <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-2.5">Overall</p>
          <div className="flex items-center gap-3">
            <BigRing pct={stats.pct} color="#a855f7" size={52} strokeW={5} />
            <div className="min-w-0">
              <p className="text-sm font-bold text-white">{stats.pct}%</p>
              <p className="text-[10px] text-slate-500 tabular-nums">{stats.done}/{stats.total} topics</p>
              {stats.rev1>0 && <p className="text-[10px] text-blue-400 tabular-nums">R1: {stats.rev1} done</p>}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// TopicsView
// ─────────────────────────────────────────────────────────────────────────────
function TopicsView({ exam, subjects, topics, onPatch, onDelete, onAddClick, expandedSubjects, setExpandedSubjects }) {
  const bySubject = {}
  topics.forEach(t => {
    const k = t.subjectId
    if (!bySubject[k]) bySubject[k] = []
    bySubject[k].push(t)
  })
  const subjectsWithTopics = subjects.filter(s => bySubject[s._id]?.length > 0)

  // Default: all collapsed
  useEffect(() => {
    const init = {}
    subjectsWithTopics.forEach(s => {
      if (expandedSubjects[s._id] === undefined) init[s._id] = false
    })
    if (Object.keys(init).length > 0) {
      setExpandedSubjects(p => ({ ...p, ...init }))
    }
  }, [subjects, topics])

  if (subjectsWithTopics.length === 0) return (
    <div className="flex-1 flex items-center justify-center">
      <div className="text-center text-slate-500">
        <i className="ti ti-books text-4xl block mb-3 text-slate-700" />
        <p className="text-sm">No topics for this exam yet</p>
        <button onClick={onAddClick} className="mt-3 text-purple-400 text-xs hover:underline">+ Add topics</button>
      </div>
    </div>
  )

  return (
    <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-2.5">
      {subjectsWithTopics.map(sub => {
        const sTopics = bySubject[sub._id] || []
        const sDone   = sTopics.filter(t => t.done).length
        const sRev1   = sTopics.filter(t => t.revision1).length
        const sRev2   = sTopics.filter(t => t.revision2).length
        const sPct    = sTopics.length ? Math.round((sDone / sTopics.length) * 100) : 0
        const isOpen  = expandedSubjects[sub._id] === true
        const isComplete = sPct === 100
        const subColor = sub.color || '#f97316'

        return (
          <div
            key={sub._id}
            className="bg-slate-800/40 border border-slate-700/50 rounded-xl overflow-hidden transition-colors hover:border-slate-600/60"
            style={{ borderLeft: `3px solid ${subColor}` }}
          >
            {/* Subject header — always collapsed by default, click to expand */}
            <button
              className="w-full flex items-center gap-2.5 sm:gap-3 px-3 sm:px-4 py-3 hover:bg-slate-700/25 transition-colors text-left"
              onClick={() => setExpandedSubjects(p => ({ ...p, [sub._id]: !isOpen }))}
            >
              <span className="flex-1 text-xs sm:text-sm font-medium text-white truncate">{sub.name}</span>
              <span className="text-[10px] text-slate-500 tabular-nums flex-shrink-0">{sDone}/{sTopics.length}</span>
              {sRev1>0 && <span className="hidden sm:inline text-[9px] px-1.5 py-0.5 rounded bg-blue-900/50 text-blue-400 font-medium">R1 {sRev1}</span>}
              {sRev2>0 && <span className="hidden sm:inline text-[9px] px-1.5 py-0.5 rounded bg-green-900/50 text-green-400 font-medium">R2 {sRev2}</span>}
              <div className="w-10 sm:w-16 h-1.5 bg-slate-700 rounded-full overflow-hidden flex-shrink-0">
                <div className="h-full rounded-full transition-all duration-500" style={{ width:`${sPct}%`, background: subColor }} />
              </div>
              {isComplete ? (
                <i className="ti ti-circle-check-filled text-sm flex-shrink-0" style={{ color: subColor }} />
              ) : (
                <span className="text-xs font-semibold text-slate-300 w-7 sm:w-8 text-right tabular-nums flex-shrink-0">{sPct}%</span>
              )}
              <i className={`ti ${isOpen ? 'ti-chevron-up' : 'ti-chevron-down'} text-slate-500 text-sm flex-shrink-0 transition-transform duration-200`} />
            </button>

            {isOpen && (
              <div className="border-t border-slate-700/40">
                {/* Column headers — hide on very small screens */}
                <div className="hidden sm:flex items-center gap-2 px-4 py-1.5 bg-slate-800/70 border-b border-slate-700/30">
                  <div className="w-5 flex-shrink-0" />
                  <div className="flex-1 text-[10px] text-slate-500 uppercase tracking-wider pl-5">Topic</div>
                  <div className="text-[10px] text-slate-500 uppercase tracking-wider w-10 text-center">R1</div>
                  <div className="text-[10px] text-slate-500 uppercase tracking-wider w-10 text-center">R2</div>
                  <div className="text-[10px] text-slate-500 uppercase tracking-wider w-20 text-center">Confidence</div>
                  <div className="w-7 flex-shrink-0" />
                </div>
                <div className="divide-y divide-slate-700/20">
                  {sTopics.map((topic, idx) => (
                    <TopicRow
                      key={topic._id}
                      topic={topic}
                      index={idx + 1}
                      onPatch={(patch) => onPatch(topic._id, patch)}
                      onDelete={() => onDelete(topic._id)}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// TopicRow — responsive, with inline confidence dots
// ─────────────────────────────────────────────────────────────────────────────
function TopicRow({ topic, index, onPatch, onDelete }) {
  const [deleting, setDeleting] = useState(false)
  const [showConf, setShowConf] = useState(false)
  const conf = CONFIDENCE_CONFIG[topic.confidence || 0]

  const handleDelete = async () => { setDeleting(true); await onDelete(); setDeleting(false) }

  return (
    <div className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 group hover:bg-slate-700/20 transition-colors relative">
      {/* Done checkbox */}
      <button
        onClick={() => onPatch({ done: !topic.done })}
        className={`flex-shrink-0 w-5 h-5 rounded-md border transition-all duration-150 active:scale-90 ${
          topic.done ? 'bg-purple-600 border-purple-600 scale-100' : 'border-slate-600 hover:border-purple-400 hover:scale-105'
        }`}
      >
        {topic.done && <i className="ti ti-check text-[10px] block text-center leading-5 text-white" />}
      </button>

      {/* Index + name */}
      <div className="flex-1 min-w-0 flex items-center gap-1.5 sm:gap-2">
        <span className="text-[10px] text-slate-600 tabular-nums w-4 flex-shrink-0 text-right hidden sm:block">{index}</span>
        <span className={`text-xs sm:text-sm truncate transition-colors ${
          topic.done ? 'line-through text-slate-500' : 'text-slate-200'
        }`}>{topic.name}</span>
      </div>

      {/* Mobile: compact R1/R2 + confidence dots inline */}
      {/* Desktop: full buttons */}

      {/* Rev 1 */}
      <button
        onClick={() => onPatch({ revision1: !topic.revision1 })}
        className={`w-8 sm:w-10 h-6 rounded-md flex items-center justify-center text-xs font-medium transition-all flex-shrink-0 ${
          topic.revision1
            ? 'bg-blue-600/80 text-white'
            : 'bg-slate-700/60 text-slate-500 hover:bg-blue-900/40 hover:text-blue-400'
        }`}
        title="Revision 1"
      >
        {topic.revision1 ? <i className="ti ti-check text-xs" /> : <span className="text-[9px]">R1</span>}
      </button>

      {/* Rev 2 */}
      <button
        onClick={() => onPatch({ revision2: !topic.revision2 })}
        className={`w-8 sm:w-10 h-6 rounded-md flex items-center justify-center text-xs font-medium transition-all flex-shrink-0 ${
          topic.revision2
            ? 'bg-green-600/80 text-white'
            : 'bg-slate-700/60 text-slate-500 hover:bg-green-900/40 hover:text-green-400'
        }`}
        title="Revision 2"
      >
        {topic.revision2 ? <i className="ti ti-check text-xs" /> : <span className="text-[9px]">R2</span>}
      </button>

      {/* Confidence — dot cycle (no popup) */}
      <div className="relative flex-shrink-0 w-16 sm:w-20 flex justify-center">
        {/* Desktop: full label button cycling through states */}
        <button
          onClick={() => {
            const next = (topic.confidence || 0) < 3 ? (topic.confidence || 0) + 1 : 0
            onPatch({ confidence: next })
          }}
          className="hidden sm:flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] font-medium transition-all w-full justify-center hover:opacity-90"
          style={{ background: `${conf.color}22`, color: conf.color, border: `1px solid ${conf.color}44` }}
          title="Click to cycle confidence"
        >
          <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: conf.color }} />
          {conf.label}
        </button>
        {/* Mobile: just a dot */}
        <button
          onClick={() => {
            const next = (topic.confidence || 0) < 3 ? (topic.confidence || 0) + 1 : 0
            onPatch({ confidence: next })
          }}
          className="sm:hidden w-5 h-5 rounded-full flex items-center justify-center"
          style={{ background: `${conf.color}22`, border: `1.5px solid ${conf.color}` }}
          title={`Confidence: ${conf.label}`}
        >
          <span className="w-2 h-2 rounded-full" style={{ background: conf.color }} />
        </button>
      </div>

      {/* Delete */}
      <button
        onClick={handleDelete}
        disabled={deleting}
        className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-600 hover:text-red-400 w-6 sm:w-7 flex-shrink-0 flex items-center justify-center"
      >
        <i className="ti ti-trash text-sm" />
      </button>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// ExamStatsView
// ─────────────────────────────────────────────────────────────────────────────
function ExamStatsView({ exam, subjects, topics }) {
  const total = topics.length
  const done  = topics.filter(t => t.done).length
  const rev1  = topics.filter(t => t.revision1).length
  const rev2  = topics.filter(t => t.revision2).length
  const pct   = total ? Math.round((done / total) * 100) : 0
  const confCounts = { 0:0, 1:0, 2:0, 3:0 }
  topics.forEach(t => { confCounts[t.confidence || 0]++ })

  const bySubject = {}
  topics.forEach(t => {
    if (!bySubject[t.subjectId]) bySubject[t.subjectId] = { done:0, total:0, rev1:0, rev2:0 }
    bySubject[t.subjectId].total++
    if (t.done)      bySubject[t.subjectId].done++
    if (t.revision1) bySubject[t.subjectId].rev1++
    if (t.revision2) bySubject[t.subjectId].rev2++
  })
  const subjectsWithTopics = subjects.filter(s => bySubject[s._id]?.total > 0)

  if (total === 0) return (
    <div className="flex-1 flex items-center justify-center text-slate-500">
      <div className="text-center">
        <i className="ti ti-chart-bar text-3xl block mb-2 text-slate-700" />
        <p className="text-sm">Add topics to see stats</p>
      </div>
    </div>
  )

  return (
    <div className="flex-1 overflow-y-auto p-3 sm:p-5 space-y-3 sm:space-y-4">
      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
        <StatCard label="Completed"  value={done}        total={total} color="#a855f7" icon="ti-circle-check" />
        <StatCard label="Revision 1" value={rev1}        total={total} color="#3b82f6" icon="ti-refresh" />
        <StatCard label="Revision 2" value={rev2}        total={total} color="#22c55e" icon="ti-refresh-dot" />
        <StatCard label="Remaining"  value={total - done} total={total} color="#f59e0b" icon="ti-clock" />
      </div>

      {/* Ring + confidence */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4 sm:p-5 flex flex-row sm:flex-col items-center justify-center gap-4">
          <BigRing pct={pct} color={exam.color || '#a855f7'} size={100} strokeW={9} showText />
          <div className="text-left sm:text-center">
            <p className="text-white font-bold">{pct}% Complete</p>
            <p className="text-slate-400 text-xs">{done} of {total} topics</p>
          </div>
        </div>
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4 sm:p-5">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 sm:mb-4">Confidence Breakdown</p>
          <div className="space-y-2 sm:space-y-3">
            {CONFIDENCE_CONFIG.slice(1).map(c => {
              const cnt = confCounts[c.val]
              const cp  = total ? Math.round((cnt / total) * 100) : 0
              return (
                <div key={c.val} className="flex items-center gap-2 sm:gap-3">
                  <span className="text-xs font-medium w-10 sm:w-12" style={{ color: c.color }}>{c.label}</span>
                  <div className="flex-1 h-2 bg-slate-700 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-700" style={{ width:`${cp}%`, background: c.color }} />
                  </div>
                  <span className="text-xs text-slate-400 tabular-nums w-5 sm:w-6 text-right">{cnt}</span>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Subject breakdown */}
      {subjectsWithTopics.length > 0 && (
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl overflow-hidden">
          <div className="px-3 sm:px-4 py-2.5 border-b border-slate-700/40">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Subject Breakdown</p>
          </div>
          <div className="divide-y divide-slate-700/20">
            {subjectsWithTopics.map(sub => {
              const s = bySubject[sub._id]
              const p = s.total ? Math.round((s.done / s.total) * 100) : 0
              return (
                <div key={sub._id} className="flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2.5 hover:bg-slate-700/20 transition-colors">
                  <div className="flex-1 flex items-center gap-1.5 sm:gap-2 min-w-0">
                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: sub.color||'#f97316' }} />
                    <span className="text-xs text-white truncate">{sub.name}</span>
                  </div>
                  <span className="text-xs text-slate-300 tabular-nums w-12 text-center">{s.done}/{s.total}</span>
                  <span className="hidden sm:block text-xs text-blue-400 tabular-nums w-8 text-center">{s.rev1}</span>
                  <span className="hidden sm:block text-xs text-green-400 tabular-nums w-8 text-center">{s.rev2}</span>
                  <div className="w-14 sm:w-20 h-1.5 bg-slate-700 rounded-full overflow-hidden flex-shrink-0">
                    <div className="h-full rounded-full" style={{ width:`${p}%`, background: sub.color||'#f97316' }} />
                  </div>
                  <span className="text-xs font-semibold text-slate-300 tabular-nums w-8 text-right">{p}%</span>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

function StatCard({ label, value, total, color, icon }) {
  const pct = total ? Math.round((value / total) * 100) : 0
  return (
    <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-3 sm:p-4">
      <div className="flex items-center justify-between mb-1.5 sm:mb-2">
        <i className={`ti ${icon} text-base`} style={{ color }} />
        <span className="text-[10px] text-slate-500 tabular-nums">{pct}%</span>
      </div>
      <p className="text-xl font-bold text-white tabular-nums">{value}</p>
      <p className="text-[10px] sm:text-[11px] text-slate-500 mt-0.5">{label}</p>
      <div className="mt-2 h-1 bg-slate-700 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-700" style={{ width:`${pct}%`, background: color }} />
      </div>
    </div>
  )
}

function MiniRing({ pct, color, size = 34, strokeW = 3.5 }) {
  const r    = (size - strokeW) / 2
  const circ = 2 * Math.PI * r
  const off  = circ - (pct / 100) * circ
  return (
    <svg width={size} height={size} className="flex-shrink-0">
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#1e293b" strokeWidth={strokeW} />
      <circle cx={size/2} cy={size/2} r={r} fill="none"
        stroke={color} strokeWidth={strokeW}
        strokeDasharray={circ} strokeDashoffset={off}
        strokeLinecap="round"
        transform={`rotate(-90 ${size/2} ${size/2})`}
        style={{ transition: 'stroke-dashoffset 0.6s ease' }}
      />
    </svg>
  )
}

function BigRing({ pct, color, size = 80, strokeW = 6, showText = false }) {
  const r    = (size - strokeW) / 2
  const circ = 2 * Math.PI * r
  const off  = circ - (pct / 100) * circ
  return (
    <svg width={size} height={size} className="flex-shrink-0">
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#1e293b" strokeWidth={strokeW} />
      <circle cx={size/2} cy={size/2} r={r} fill="none"
        stroke={color} strokeWidth={strokeW}
        strokeDasharray={circ} strokeDashoffset={off}
        strokeLinecap="round"
        transform={`rotate(-90 ${size/2} ${size/2})`}
        style={{ transition: 'stroke-dashoffset 0.6s ease' }}
      />
      {showText && (
        <text x={size/2} y={size/2} textAnchor="middle" dominantBaseline="central"
          fontSize={size > 80 ? 18 : 13} fill="white" fontWeight="700">{pct}%</text>
      )}
    </svg>
  )
}