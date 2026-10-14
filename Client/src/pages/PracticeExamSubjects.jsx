// src/pages/PracticeExamSubjects.jsx
// Subjects of ONE exam (Exam -> Subject -> Test). This is the old Practice
// Tests landing grid, now scoped to /practice-tests/exam/:examId. Tapping a
// subject continues to the /practice-tests/:subjectId tests list (jahan us
// subject ke folders bhi dikhte hai). Optional subjects alag section me aate hai.

import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { getPracticeExam } from '@/api/practiceExams'
import { getPracticeSubjects, peekPracticeSubjects } from '@/api/practiceSubjects'

export default function PracticeExamSubjects() {
  const { examId } = useParams()
  const navigate = useNavigate()
  const [exam, setExam] = useState(null)
  const [subjects, setSubjects] = useState(() => peekPracticeSubjects(examId))
  const [error, setError] = useState('')

  useEffect(() => {
    setSubjects(peekPracticeSubjects(examId))
    getPracticeExam(examId).then(setExam).catch(() => setError('Exam nahi mila'))
    getPracticeSubjects(examId).then(setSubjects).catch(() => { if (!peekPracticeSubjects(examId)) setError('Subjects load nahi ho paye') })
    import('./PracticeSubjectTests').catch(() => {})
  }, [examId])

  const accent = exam?.color || '#f97316'
  // Folders (parentId set) subject ke andar dikhte hai, yahan sirf top-level subjects
  const topLevel = subjects?.filter((s) => !s.parentId) || []
  const mainSubjects = topLevel.filter((s) => !s.isOptional)
  const optionalSubjects = topLevel.filter((s) => s.isOptional)

  return (
    <div className="min-h-screen px-4 py-6 md:px-8" style={{ background: 'radial-gradient(ellipse 70% 50% at 50% 0%, rgba(249,115,22,0.06) 0%, #0f172a 60%)' }}>
      <button
        onClick={() => navigate('/practice-tests')}
        className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-slate-200 mb-3"
      >
        <i className="ti ti-arrow-left" /> Exams
      </button>

      <div className="flex items-center gap-3 mb-5">
        <div
          className="w-11 h-11 rounded-xl flex items-center justify-center text-lg font-black"
          style={{ background: `${accent}20`, color: accent }}
        >
          {exam?.name?.[0]?.toUpperCase() || '·'}
        </div>
        <div>
          <h1 className="text-xl font-black text-white">{exam?.name || 'Loading...'}</h1>
          <p className="text-slate-500 text-xs">Subject chuno</p>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 text-red-300 text-sm px-4 py-3 mb-4">{error}</div>
      )}

      {subjects === null && !error && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {[1, 2, 3].map((i) => <div key={i} className="h-32 rounded-2xl bg-slate-800/40 animate-pulse" />)}
        </div>
      )}

      {subjects && topLevel.length === 0 && (
        <div className="text-center py-16 text-slate-500">
          <i className="ti ti-clipboard-text text-4xl mb-2 block" />
          <p className="text-sm">Is exam me abhi koi subject nahi hai.</p>
        </div>
      )}

      {mainSubjects.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {mainSubjects.map((s) => (
            <SubjectCard key={s._id} s={s} examName={exam?.name} onOpen={() => navigate(`/practice-tests/${s._id}`)} />
          ))}
        </div>
      )}

      {optionalSubjects.length > 0 && (
        <>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mt-7 mb-2 flex items-center gap-1.5">
            <i className="ti ti-sparkles text-tapasya-orange" /> Optional
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {optionalSubjects.map((s) => (
              <SubjectCard key={s._id} s={s} examName={exam?.name} onOpen={() => navigate(`/practice-tests/${s._id}`)} />
            ))}
          </div>
        </>
      )}
    </div>
  )
}

function SubjectCard({ s, examName, onOpen }) {
  return (
    <button
      onClick={onOpen}
      className="text-left rounded-2xl p-5 flex flex-col gap-4 active:scale-[0.98] transition-transform"
      style={{ background: 'linear-gradient(135deg, #101a30 0%, #0d1728 100%)', border: `1px solid ${s.color}30` }}
    >
      <div className="flex items-center gap-3 min-w-0">
        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl font-black shrink-0 ring-2"
          style={{ background: `${s.color}20`, color: s.color, boxShadow: `0 0 0 2px ${s.color}25 inset` }}
        >
          {s.name?.[0]?.toUpperCase()}
        </div>
        <div className="min-w-0">
          <p className="text-white font-bold text-base truncate">{s.name}</p>
          <p className="text-slate-500 text-xs mt-0.5 truncate">
            {examName}{s.isOptional ? ' · Optional' : ''}
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800/70 text-slate-300 text-xs font-semibold">
            <i className="ti ti-file-text" /> {s.testCount} test{s.testCount === 1 ? '' : 's'}
          </span>
          {s.folderCount > 0 && (
            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800/70 text-slate-300 text-xs font-semibold">
              <i className="ti ti-folder" /> {s.folderCount}
            </span>
          )}
        </div>
        <span className="flex items-center gap-1 text-xs font-bold" style={{ color: s.color }}>
          View Tests <i className="ti ti-arrow-right" />
        </span>
      </div>
    </button>
  )
}