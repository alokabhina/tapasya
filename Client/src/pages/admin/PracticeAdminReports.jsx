// src/pages/admin/PracticeAdminReports.jsx
// Admin-only: red-flag reports raised via the in-test "Report" button
// (TestHeader.jsx -> ReportQuestionModal.jsx) and the global "Report"
// bottom-nav button (BottomNav.jsx). Route: /practice-tests/admin/reports.

import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { isPracticeAdmin } from '@/api/practiceSubjects'
import { getPracticeReports, resolvePracticeReport } from '@/api/practiceAttempts'

function timeAgo(dateStr) {
  const diff = (Date.now() - new Date(dateStr).getTime()) / 1000
  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

function ScopeBadge({ scope }) {
  const styles = {
    question: 'bg-red-500/10 text-red-400 border-red-500/25',
    test: 'bg-purple-500/10 text-purple-400 border-purple-500/25',
    app: 'bg-blue-500/10 text-blue-400 border-blue-500/25',
  }
  const labels = { question: 'Question', test: 'Whole Test', app: 'App Issue' }
  return <span className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded border ${styles[scope]}`}>{labels[scope]}</span>
}

export default function PracticeAdminReports() {
  const navigate = useNavigate()
  const [checking, setChecking] = useState(true)
  const [reports, setReports] = useState([])
  const [filter, setFilter] = useState('open')
  const [busyId, setBusyId] = useState(null)

  useEffect(() => {
    isPracticeAdmin().then((ok) => {
      if (!ok) { navigate('/practice-tests', { replace: true }); return }
      setChecking(false)
      load('open')
    }).catch(() => navigate('/practice-tests', { replace: true }))
  }, [])

  function load(status) {
    getPracticeReports(status).then(setReports).catch(() => {})
  }

  function handleFilter(status) {
    setFilter(status)
    load(status)
  }

  async function handleResolve(r, status) {
    setBusyId(r._id)
    try {
      await resolvePracticeReport(r._id, status)
      load(filter)
    } catch {
      alert('Update nahi ho paya')
    } finally {
      setBusyId(null)
    }
  }

  if (checking) return <div className="min-h-screen flex items-center justify-center text-slate-400 text-sm">Checking access...</div>

  return (
    <div className="min-h-screen px-4 py-6 md:px-8">
      <button onClick={() => navigate('/practice-tests/admin')} className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-slate-200 mb-4">
        <i className="ti ti-arrow-left" /> Practice Test Admin
      </button>

      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <h1 className="text-xl font-black text-white flex items-center gap-2">
          <i className="ti ti-flag-3 text-red-500" /> Red-Flag Reports
        </h1>
        <div className="flex rounded-lg border border-slate-700 overflow-hidden text-xs font-semibold">
          {['open', 'resolved'].map((s) => (
            <button
              key={s}
              onClick={() => handleFilter(s)}
              className={`px-3 py-1.5 capitalize ${filter === s ? 'bg-tapasya-orange text-white' : 'text-slate-400 hover:bg-slate-800'}`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {reports.length === 0 && (
        <p className="text-slate-500 text-sm py-8 text-center">Koi {filter} report nahi hai.</p>
      )}

      <div className="space-y-2.5">
        {reports.map((r) => (
          <div key={r._id} className="rounded-xl border border-slate-800 bg-[#0d1420] px-4 py-3">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <ScopeBadge scope={r.scope} />
                  {r.scope === 'question' && <span className="text-xs font-semibold text-slate-300">Q{r.qNo} (Section {(r.sectionIndex ?? 0) + 1})</span>}
                  {r.scope !== 'app' && r.testId?.title && <span className="text-xs text-slate-500">· {r.testId.title}</span>}
                  {r.scope === 'app' && r.page && <span className="text-xs text-slate-500">· {r.page}</span>}
                </div>
                {r.message && <p className="text-sm text-slate-300">{r.message}</p>}
                <p className="text-[11px] text-slate-500 mt-1">
                  {r.userId?.displayName || r.userId?.email || 'Unknown user'} · {timeAgo(r.createdAt)}
                </p>
              </div>
              <button
                type="button"
                disabled={busyId === r._id}
                onClick={() => handleResolve(r, r.status === 'open' ? 'resolved' : 'open')}
                className={`shrink-0 text-xs font-bold px-3 py-1.5 rounded-lg border disabled:opacity-50 ${
                  r.status === 'open'
                    ? 'border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/10'
                    : 'border-slate-700 text-slate-400 hover:bg-slate-800'
                }`}
              >
                {r.status === 'open' ? 'Mark resolved' : 'Reopen'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}