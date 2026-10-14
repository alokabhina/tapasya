// src/pages/PracticeSubjectTests.jsx
// Test cards within one subject (plan doc Section 2) — e.g. "Speed Math
// Test 1", "Speed Math Test 2" under the "Quant" subject. Published tests
// only; draft tests are admin-panel-only (PracticeAdminSubjects.jsx).
//
// Folders: agar is subject ke andar folders bane hai (admin ne banaye) to wo
// tests ke upar folder cards me dikhte hai; folder kholne par uske apne tests.
// Folder page par back button parent subject par le jata hai.
//
// Round-3: rebuilt to match the reference design — badge pills instead of
// plain icon+text, and for an attempted test a "Last Attempt <date>" row +
// Score/Percentage + progress bar plus Solution/Analysis/Reattempt buttons
// (vs just "Start Test" for a fresh one). Backed by
// routes/practiceTests.js's GET / now attaching each test's `userStats`
// (best/last attempt) alongside the card data — no extra round-trip.

import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { getPracticeSubject, getPracticeFolders } from '@/api/practiceSubjects'
import { getPracticeTests } from '@/api/practiceTests'

function formatDuration(totalSec) {
  const mins = Math.round((totalSec || 0) / 60)
  return `${mins} min`
}

function Badge({ icon, children }) {
  return (
    <span className="flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-800/70 text-slate-300 text-[11px] font-semibold">
      <i className={`ti ${icon}`} /> {children}
    </span>
  )
}

export default function PracticeSubjectTests() {
  const { subjectId } = useParams()
  const navigate = useNavigate()
  const [subject, setSubject] = useState(null)
  const [tests, setTests] = useState(null)
  const [folders, setFolders] = useState([])
  const [error, setError] = useState('')

  useEffect(() => {
    // subject <-> folder navigate karne par same component reuse hota hai — purana data hata do
    setSubject(null); setTests(null); setFolders([]); setError('')
    getPracticeSubject(subjectId).then(setSubject).catch(() => setError('Subject nahi mila'))
    getPracticeTests(subjectId).then(setTests).catch(() => setError('Tests load nahi ho paye'))
    getPracticeFolders(subjectId).then(setFolders).catch(() => setFolders([]))
    import('./PracticeTestInstructions').catch(() => {})
    import('./PracticeTestResult').catch(() => {})
  }, [subjectId])

  return (
    <div className="min-h-screen px-4 py-6 md:px-8 bg-[#0f172a]">
      <button
        onClick={() => navigate(
          subject?.parentId ? `/practice-tests/${subject.parentId}`
            : subject?.examId ? `/practice-tests/exam/${subject.examId}`
            : '/practice-tests'
        )}
        className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-slate-200 mb-3"
      >
        <i className="ti ti-arrow-left" /> {subject?.parentId ? (subject.parentName || 'Back') : 'Subjects'}
      </button>

      <div className="flex items-center gap-3 mb-5">
        <div
          className="w-11 h-11 rounded-xl flex items-center justify-center text-lg font-black"
          style={{ background: `${subject?.color || '#f97316'}20`, color: subject?.color || '#f97316' }}
        >
          {subject?.name?.[0]?.toUpperCase() || '·'}
        </div>
        <div>
          <h1 className="text-xl font-black text-white flex items-center gap-2">
            {subject?.name || 'Loading...'}
            {subject?.isOptional && (
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-tapasya-orange/15 text-tapasya-orange">Optional</span>
            )}
          </h1>
          <p className="text-slate-500 text-xs">
            {tests?.length ?? 0} test{tests?.length === 1 ? '' : 's'} available
            {folders.length > 0 ? ` · ${folders.length} folder${folders.length === 1 ? '' : 's'}` : ''}
          </p>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 text-red-300 text-sm px-4 py-3 mb-4">{error}</div>
      )}

      {tests === null && !error && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <div key={i} className="h-32 rounded-2xl bg-slate-800/40 animate-pulse" />)}
        </div>
      )}

      {folders.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-5">
          {folders.map((f) => (
            <button
              key={f._id}
              onClick={() => navigate(`/practice-tests/${f._id}`)}
              className="text-left rounded-2xl px-4 py-4 flex items-center gap-3 active:scale-[0.98] transition-transform"
              style={{ background: 'linear-gradient(135deg, #101a30 0%, #0d1728 100%)', border: `1px solid ${f.color}30` }}
            >
              <div
                className="w-11 h-11 rounded-xl flex items-center justify-center text-xl shrink-0"
                style={{ background: `${f.color}20`, color: f.color }}
              >
                <i className="ti ti-folder" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-white font-bold text-sm truncate flex items-center gap-1.5">
                  {f.name}
                  {f.isOptional && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-tapasya-orange/15 text-tapasya-orange">Optional</span>}
                </p>
                <p className="text-slate-500 text-xs mt-0.5">{f.testCount} test{f.testCount === 1 ? '' : 's'}</p>
              </div>
              <i className="ti ti-chevron-right text-slate-500" />
            </button>
          ))}
        </div>
      )}

      {tests?.length === 0 && folders.length === 0 && (
        <div className="text-center py-16 text-slate-500">
          <i className="ti ti-file-off text-4xl mb-2 block" />
          <p className="text-sm">Is subject mein abhi koi test published nahi hai.</p>
        </div>
      )}

      <div className="space-y-3">
        {tests?.map((t) => {
          const stats = t.userStats
          const pct = stats?.attempted && stats.bestMaxScore ? Math.round((stats.bestScore / stats.bestMaxScore) * 100) : null
          return (
            <div
              key={t._id}
              className="rounded-2xl px-4 py-4 sm:px-5 sm:py-5"
              style={{ background: 'linear-gradient(135deg, #101a30 0%, #0d1728 100%)', border: '1px solid rgba(255,255,255,0.07)' }}
            >
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="min-w-0">
                  <p className="text-white font-bold text-sm sm:text-base truncate">{t.title}</p>
                  {t.examTag && <p className="text-slate-500 text-xs mt-0.5 truncate">{t.examTag}</p>}
                  <div className="flex items-center gap-2 mt-2.5 flex-wrap">
                    <Badge icon="ti-file-text">Full Length</Badge>
                    <Badge icon="ti-list-numbers">{t.totalQuestions} Questions</Badge>
                    <Badge icon="ti-star">{t.totalMarks} Marks</Badge>
                    <Badge icon="ti-clock">{formatDuration(t.totalDurationSec)}</Badge>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {stats?.attempted ? (
                    <>
                      <button
                        onClick={() => navigate(`/practice-tests/solutions/${stats.lastAttemptId}`)}
                        className="px-3 py-1.5 rounded-lg border border-slate-700 text-slate-300 text-xs font-bold hover:bg-slate-800"
                      >
                        Solution
                      </button>
                      <button
                        onClick={() => navigate(`/practice-tests/result/${stats.lastAttemptId}`)}
                        className="px-3 py-1.5 rounded-lg border border-slate-700 text-slate-300 text-xs font-bold hover:bg-slate-800"
                      >
                        Analysis
                      </button>
                      <button
                        onClick={() => navigate(`/practice-tests/${subjectId}/${t._id}`)}
                        className="px-3 py-1.5 rounded-lg bg-tapasya-orange text-white text-xs font-bold hover:bg-tapasya-orange-dark flex items-center gap-1"
                      >
                        Reattempt <i className="ti ti-arrow-right" />
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => navigate(`/practice-tests/${subjectId}/${t._id}`)}
                      className="px-3.5 py-1.5 rounded-lg bg-tapasya-orange text-white text-xs font-bold hover:bg-tapasya-orange-dark flex items-center gap-1"
                    >
                      Start Test <i className="ti ti-arrow-right" />
                    </button>
                  )}
                </div>
              </div>

              <div className="mt-3.5 pt-3.5 border-t border-slate-800 flex items-center gap-4 sm:gap-6 flex-wrap text-xs">
                {stats?.attempted ? (
                  <>
                    <span className="flex items-center gap-1.5 text-slate-400">
                      <i className="ti ti-calendar" /> Last Attempt
                      <span className="text-slate-300">{stats.lastAttemptDate ? new Date(stats.lastAttemptDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' }) : '—'}</span>
                    </span>
                    <span className="flex items-center gap-1.5 text-slate-400">
                      <i className="ti ti-trophy text-tapasya-orange" /> Score
                      <span className="text-white font-bold">{stats.bestScore} / {stats.bestMaxScore}</span>
                    </span>
                    <span className="flex items-center gap-1.5 text-slate-400">
                      <i className="ti ti-target" /> Percentage
                      <span className="font-bold" style={{ color: pct >= 60 ? '#34d399' : pct >= 40 ? '#f97316' : '#f87171' }}>{pct}%</span>
                    </span>
                    <div className="flex-1 min-w-[100px] h-2 rounded-full bg-slate-800 overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${Math.min(100, Math.max(0, pct))}%`, background: pct >= 60 ? '#34d399' : pct >= 40 ? '#f97316' : '#f87171' }} />
                    </div>
                  </>
                ) : (
                  <span className="flex items-center gap-1.5 text-slate-500">
                    <i className="ti ti-circle-dashed" /> Not attempted yet
                  </span>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}