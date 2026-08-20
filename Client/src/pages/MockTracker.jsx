// src/pages/MockTracker.jsx
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getMockExams, deleteMockExam } from '@/api/mockExams'
import CreateExamModal from '@/components/mocktest/CreateExamModal'

function Sparkline({ values = [] }) {
  const clean = values.filter((v) => v != null)
  if (clean.length < 2) return null
  const min = Math.min(...clean), max = Math.max(...clean)
  const range = max - min || 1
  const points = clean.map((v, i) => {
    const x = (i / (clean.length - 1)) * 100
    const y = 100 - ((v - min) / range) * 100
    return `${x},${y}`
  }).join(' ')
  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-8">
      <polyline points={points} fill="none" stroke="#fb923c" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export default function MockTracker() {
  const navigate = useNavigate()
  const [exams, setExams] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)

  useEffect(() => { load() }, [])

  function load() {
    setLoading(true)
    getMockExams().then(setExams).catch(() => {}).finally(() => setLoading(false))
  }

  async function handleDelete(e, exam) {
    e.stopPropagation()
    if (!confirm(`"${exam.name}" aur uske saare results delete karne hain?`)) return
    await deleteMockExam(exam._id)
    setExams((prev) => prev.filter((x) => x._id !== exam._id))
  }

  return (
    <div className="p-3 sm:p-6 max-w-6xl mx-auto pb-24">
      <div className="relative mb-5 rounded-2xl overflow-hidden border border-slate-800 bg-gradient-to-br from-slate-900 via-slate-900 to-orange-950/30">
        <div className="absolute -top-10 -right-10 w-48 h-48 rounded-full bg-orange-500/10 blur-3xl pointer-events-none" />
        <div className="relative px-4 sm:px-6 py-4 sm:py-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-orange-500/15 border border-orange-500/20 flex items-center justify-center shrink-0">
              <i className="ti ti-clipboard-data text-orange-400 text-2xl" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-slate-100">Mock Tracker</h2>
              <p className="text-xs text-slate-500">Mock test results track karo, weak topics dhoondo</p>
            </div>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="px-4 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold flex items-center gap-2"
          >
            <i className="ti ti-plus" /> Exam banao
          </button>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => <div key={i} className="h-40 rounded-2xl bg-slate-800/60 animate-pulse" />)}
        </div>
      ) : exams.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-16 h-16 rounded-2xl bg-slate-800/60 border border-slate-700/60 flex items-center justify-center mx-auto mb-3">
            <i className="ti ti-file-analytics text-3xl text-slate-500" />
          </div>
          <p className="text-sm font-medium text-slate-400">Abhi koi exam profile nahi hai</p>
          <p className="text-xs text-slate-600 mt-1">"Exam banao" se shuru karo</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {exams.map((exam) => (
            <div
              key={exam._id}
              onClick={() => navigate(`/mock-tracker/${exam._id}`)}
              className="group relative rounded-2xl border border-slate-800 bg-slate-900/60 hover:border-orange-500/40 transition-colors p-4 cursor-pointer"
            >
              <button
                onClick={(e) => handleDelete(e, exam)}
                className="absolute top-3 right-3 w-7 h-7 rounded-md bg-slate-800 hover:bg-red-600/80 opacity-0 group-hover:opacity-100 flex items-center justify-center text-slate-400 hover:text-white transition-opacity"
              >
                <i className="ti ti-trash text-xs" />
              </button>

              <p className="text-sm font-semibold text-slate-200 pr-8">{exam.name}</p>
              <p className="text-xs text-slate-500 mt-0.5">{exam.attemptsCount} attempt{exam.attemptsCount !== 1 ? 's' : ''}</p>

              <div className="mt-3">
                <Sparkline values={exam.trend} />
              </div>

              <div className="flex items-center justify-between mt-2">
                <span className="text-xs text-slate-500">
                  {exam.lastAttemptedOn ? new Date(exam.lastAttemptedOn).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : 'Koi result nahi'}
                </span>
                {exam.lastScore != null && (
                  <span className="text-xs font-semibold text-orange-400">Last: {exam.lastScore}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {showCreate && (
        <CreateExamModal
          onClose={() => setShowCreate(false)}
          onCreated={(exam) => { setShowCreate(false); navigate(`/mock-tracker/${exam._id}`) }}
        />
      )}
    </div>
  )
}