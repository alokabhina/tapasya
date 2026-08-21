// src/pages/MockExamDashboard.jsx
import { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getMockDashboard, getMockAttempts, deleteMockAttempt } from '@/api/mockExams'
import ScoreTrendChart from '@/components/mocktest/ScoreTrendChart'
import SubjectAccuracyChart from '@/components/mocktest/SubjectAccuracyChart'
import AttemptsBreakdownChart from '@/components/mocktest/AttemptsBreakdownChart'
import ScoreDistributionChart from '@/components/mocktest/ScoreDistributionChart'
import WeakTopicsList from '@/components/mocktest/WeakTopicsList'
import AddMockResultModal from '@/components/mocktest/AddMockResultModal'
import AttemptDetailView from '@/components/mocktest/AttemptDetailView'

// Section-name matching is normalized (trimmed + case-insensitive) so a
// result saved with slightly different casing/whitespace than the exam's
// current section list (e.g. after a section was renamed, or an AI-parsed
// import used its own casing) still shows up under the right subject tab
// instead of only appearing in "All".
const norm = (s) => (s || '').trim().toLowerCase()

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'full', label: 'Full Mocks' },
  { id: 'sectional', label: 'Sectional Tests' },
]

export default function MockExamDashboard() {
  const { examId } = useParams()
  const navigate = useNavigate()
  const [tab, setTab] = useState('overview')
  const [dashboard, setDashboard] = useState(null)
  const [loading, setLoading] = useState(true)
  const [attempts, setAttempts] = useState([])
  const [attemptsLoading, setAttemptsLoading] = useState(false)
  const [showAdd, setShowAdd] = useState(false)
  const [viewingAttempt, setViewingAttempt] = useState(null)
  const [sectionFilter, setSectionFilter] = useState('all')

  const loadDashboard = useCallback(() => {
    setLoading(true)
    getMockDashboard(examId).then(setDashboard).catch(() => {}).finally(() => setLoading(false))
  }, [examId])

  useEffect(() => { loadDashboard() }, [loadDashboard])

  useEffect(() => {
    if (tab === 'overview') return
    setAttemptsLoading(true)
    getMockAttempts(examId, tab).then(setAttempts).catch(() => {}).finally(() => setAttemptsLoading(false))
  }, [tab, examId])

  function handleResultSaved() {
    setShowAdd(false)
    loadDashboard()
    if (tab !== 'overview') getMockAttempts(examId, tab).then(setAttempts).catch(() => {})
  }

  async function handleDeleteAttempt(attempt) {
    if (!confirm('Ye result delete karna hai?')) return
    await deleteMockAttempt(examId, attempt._id)
    setAttempts((prev) => prev.filter((a) => a._id !== attempt._id))
    setViewingAttempt(null)
    loadDashboard()
  }

  if (loading) {
    return <div className="p-6 max-w-5xl mx-auto"><div className="h-40 rounded-2xl bg-slate-800/60 animate-pulse" /></div>
  }
  if (!dashboard) {
    return <div className="p-6 text-center text-slate-500 text-sm">Exam nahi mila</div>
  }

  const { exam, summary, trend, subjectAccuracy, weakTopics, strongTopics } = dashboard
  const sectionalFiltered = tab === 'sectional' && sectionFilter !== 'all'
    ? attempts.filter((a) => (a.sections || []).some((s) => norm(s.sectionName) === norm(sectionFilter)))
    : attempts

  return (
    <div className="p-3 sm:p-6 max-w-5xl mx-auto pb-24">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <button onClick={() => navigate('/mock-tracker')} className="w-9 h-9 rounded-lg hover:bg-slate-800 text-slate-400 flex items-center justify-center">
            <i className="ti ti-arrow-left text-lg" />
          </button>
          <h2 className="text-lg font-bold text-slate-100">{exam.name}</h2>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="px-3.5 py-2 rounded-lg bg-orange-500 hover:bg-orange-600 text-white text-xs sm:text-sm font-semibold flex items-center gap-1.5"
        >
          <i className="ti ti-plus" /> Add Result
        </button>
      </div>

      <div className="flex items-center gap-1 mb-5 border-b border-slate-800 overflow-x-auto no-scrollbar">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-3 py-2.5 text-sm font-medium border-b-2 transition-colors shrink-0 ${tab === t.id ? 'border-orange-500 text-orange-400' : 'border-transparent text-slate-500'}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="rounded-xl bg-slate-800/50 border border-slate-800 p-3"><p className="text-[10px] text-slate-500">Total Attempts</p><p className="text-lg font-bold text-slate-200">{summary.totalAttempts}</p></div>
            <div className="rounded-xl bg-slate-800/50 border border-slate-800 p-3"><p className="text-[10px] text-slate-500">Best Score</p><p className="text-lg font-bold text-orange-400">{summary.bestScore ?? '—'}</p></div>
            <div className="rounded-xl bg-slate-800/50 border border-slate-800 p-3"><p className="text-[10px] text-slate-500">Avg Score</p><p className="text-lg font-bold text-slate-200">{summary.avgScore ?? '—'}</p></div>
            <div className="rounded-xl bg-slate-800/50 border border-slate-800 p-3"><p className="text-[10px] text-slate-500">Avg Accuracy</p><p className="text-lg font-bold text-blue-400">{summary.avgAccuracy != null ? `${summary.avgAccuracy}%` : '—'}</p></div>
          </div>

          <div className="rounded-2xl border border-slate-800 p-4">
            <p className="text-sm font-semibold text-slate-200 mb-3">Score & Accuracy Trend</p>
            <ScoreTrendChart trend={trend} />
          </div>

          {subjectAccuracy.length > 0 && (
            <div className="rounded-2xl border border-slate-800 p-4">
              <p className="text-sm font-semibold text-slate-200 mb-3">Subject-wise Accuracy</p>
              <SubjectAccuracyChart data={subjectAccuracy} />
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="rounded-2xl border border-slate-800 p-4">
              <p className="text-sm font-semibold text-slate-200 mb-3">Full vs Sectional</p>
              <AttemptsBreakdownChart full={summary.fullAttempts} sectional={summary.sectionalAttempts} />
            </div>
            <div className="rounded-2xl border border-slate-800 p-4">
              <p className="text-sm font-semibold text-slate-200 mb-3">Score Distribution</p>
              <ScoreDistributionChart trend={trend} />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="rounded-2xl border border-slate-800 p-4">
              <p className="text-sm font-semibold text-slate-200 mb-3 flex items-center gap-1.5"><i className="ti ti-alert-triangle text-red-400 text-sm" /> Weak Topics</p>
              <WeakTopicsList topics={weakTopics} variant="weak" examName={exam.name} />
            </div>
            <div className="rounded-2xl border border-slate-800 p-4">
              <p className="text-sm font-semibold text-slate-200 mb-3 flex items-center gap-1.5"><i className="ti ti-thumb-up text-green-400 text-sm" /> Strong Topics</p>
              <WeakTopicsList topics={strongTopics} variant="strong" examName={exam.name} />
            </div>
          </div>
        </div>
      )}

      {(tab === 'full' || tab === 'sectional') && (
        <div>
          {tab === 'sectional' && exam.sections?.length > 0 && (
            <div className="flex items-center gap-1.5 mb-3 overflow-x-auto no-scrollbar">
              <button onClick={() => setSectionFilter('all')} className={`px-2.5 py-1 rounded-full text-[11px] shrink-0 ${sectionFilter === 'all' ? 'bg-orange-500/20 text-orange-400 border border-orange-500/40' : 'bg-slate-800 text-slate-400 border border-slate-700'}`}>All</button>
              {exam.sections.map((s) => (
                <button key={s.name} onClick={() => setSectionFilter(s.name)} className={`px-2.5 py-1 rounded-full text-[11px] shrink-0 ${sectionFilter === s.name ? 'bg-orange-500/20 text-orange-400 border border-orange-500/40' : 'bg-slate-800 text-slate-400 border border-slate-700'}`}>{s.name}</button>
              ))}
            </div>
          )}

          {attemptsLoading ? (
            <div className="space-y-2">{[...Array(3)].map((_, i) => <div key={i} className="h-16 rounded-xl bg-slate-800/60 animate-pulse" />)}</div>
          ) : sectionalFiltered.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-10">Koi result nahi hai abhi</p>
          ) : (
            <div className="space-y-2">
              {sectionalFiltered.map((a) => (
                <button
                  key={a._id}
                  onClick={() => setViewingAttempt(a)}
                  className="w-full flex items-center justify-between gap-3 px-4 py-3 rounded-xl border border-slate-800 hover:border-slate-700 bg-slate-900/50 text-left"
                >
                  <div className="min-w-0">
                    <p className="text-sm text-slate-200 truncate">{a.title || (a.mode === 'full' ? 'Full Mock' : a.sections?.[0]?.sectionName)}</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      {new Date(a.attemptedOn).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                      {a.platform && ` · ${a.platform}`}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-semibold text-orange-400">{a.overall?.score ?? '—'}</p>
                    <p className="text-[11px] text-slate-500">{a.overall?.accuracy != null ? `${a.overall.accuracy}%` : ''}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {showAdd && (
        <AddMockResultModal
          examId={examId}
          examSections={exam.sections}
          onClose={() => setShowAdd(false)}
          onSaved={handleResultSaved}
        />
      )}

      {viewingAttempt && (
        <AttemptDetailView
          attempt={viewingAttempt}
          onClose={() => setViewingAttempt(null)}
          onDelete={handleDeleteAttempt}
        />
      )}
    </div>
  )
}