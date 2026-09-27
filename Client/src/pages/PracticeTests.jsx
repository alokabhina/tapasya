// src/pages/PracticeTests.jsx
// Practice Tests landing — subject cards (plan doc Section 2). Separate,
// dedicated feature from Mock Tracker (self-report) — this is the live
// test-taking engine, admin-uploaded real papers. See
// practice-test-feature-plan.md Section 0 for why the two are split.
//
// Round-3: subject cards made richer to match the same visual language as
// PracticeSubjectTests.jsx's test cards — bigger accent-ring icon, exam
// category badge, test-count badge, and a "View Tests" cta instead of a
// bare chevron.

import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getPracticeSubjects, isPracticeAdmin } from '@/api/practiceSubjects'

export default function PracticeTests() {
  const navigate = useNavigate()
  const [subjects, setSubjects] = useState(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    getPracticeSubjects().then(setSubjects).catch(() => setError('Subjects load nahi ho paye'))
    isPracticeAdmin().then(setIsAdmin).catch(() => {})
  }, [])

  return (
    <div className="min-h-screen px-4 py-6 md:px-8" style={{ background: 'radial-gradient(ellipse 70% 50% at 50% 0%, rgba(249,115,22,0.06) 0%, #0f172a 60%)' }}>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight">📝 Practice Tests</h1>
          <p className="text-slate-400 text-sm mt-0.5">Full-length sectional papers, live exam-style engine</p>
        </div>
        {isAdmin && (
          <div className="flex gap-2">
            <button
              onClick={() => navigate('/practice-tests/admin')}
              className="flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-xl border border-tapasya-orange/30 text-tapasya-orange hover:bg-tapasya-orange/10"
            >
              <i className="ti ti-shield-lock" /> Admin
            </button>
            <button
              onClick={() => navigate('/practice-tests/admin/upload')}
              className="flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-xl bg-tapasya-orange text-white hover:bg-tapasya-orange-dark"
            >
              <i className="ti ti-upload" /> Upload Test
            </button>
          </div>
        )}
      </div>

      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 text-red-300 text-sm px-4 py-3 mb-4">{error}</div>
      )}

      {subjects === null && !error && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {[1, 2, 3].map((i) => <div key={i} className="h-32 rounded-2xl bg-slate-800/40 animate-pulse" />)}
        </div>
      )}

      {subjects?.length === 0 && (
        <div className="text-center py-16 text-slate-500">
          <i className="ti ti-clipboard-text text-4xl mb-2 block" />
          <p className="text-sm">Abhi tak koi subject nahi bana hai.</p>
          {isAdmin && <p className="text-xs mt-1">Admin panel se ek subject bana ke shuru karo.</p>}
        </div>
      )}

      {subjects?.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {subjects.map((s) => (
            <button
              key={s._id}
              onClick={() => navigate(`/practice-tests/${s._id}`)}
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
                  {s.examCategory && <p className="text-slate-500 text-xs mt-0.5 truncate">{s.examCategory}</p>}
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800/70 text-slate-300 text-xs font-semibold">
                  <i className="ti ti-file-text" /> {s.testCount} test{s.testCount === 1 ? '' : 's'}
                </span>
                <span className="flex items-center gap-1 text-xs font-bold" style={{ color: s.color }}>
                  View Tests <i className="ti ti-arrow-right" />
                </span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}