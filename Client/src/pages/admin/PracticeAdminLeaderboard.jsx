// src/pages/admin/PracticeAdminLeaderboard.jsx
// Admin-only leaderboard for one test (plan doc Section 8.4) — ranked by
// each user's best score across their attempts. Route:
// /practice-tests/admin/:testId/leaderboard.

import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { isPracticeAdmin } from '@/api/practiceSubjects'
import { getPracticeLeaderboard } from '@/api/practiceAttempts'

const MEDAL = { 1: '🥇', 2: '🥈', 3: '🥉' }

function formatTime(totalSec) {
  const m = Math.round((totalSec || 0) / 60)
  return `${m}m`
}

export default function PracticeAdminLeaderboard() {
  const { testId } = useParams()
  const navigate = useNavigate()
  const [checking, setChecking] = useState(true)
  const [rows, setRows] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    isPracticeAdmin().then((ok) => {
      if (!ok) { navigate('/practice-tests', { replace: true }); return }
      setChecking(false)
      getPracticeLeaderboard(testId).then(setRows).catch(() => setError('Leaderboard load nahi ho paya'))
    }).catch(() => navigate('/practice-tests', { replace: true }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [testId])

  if (checking) return <div className="min-h-screen flex items-center justify-center text-slate-500 text-sm">Checking access...</div>

  return (
    <div className="min-h-screen px-4 py-6 md:px-8 max-w-2xl mx-auto">
      <button onClick={() => navigate('/practice-tests/admin')} className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-slate-200 mb-4">
        <i className="ti ti-arrow-left" /> Admin
      </button>

      <h1 className="text-xl font-black text-white mb-1 flex items-center gap-2">
        <i className="ti ti-trophy text-tapasya-orange" /> Leaderboard
      </h1>
      <p className="text-slate-500 text-xs mb-5">Har user ka best attempt hi dikhta hai, reattempts count nahi hote alag se.</p>

      {error && <div className="rounded-xl border border-red-500/30 bg-red-500/10 text-red-300 text-sm px-4 py-3">{error}</div>}

      {rows === null && !error && (
        <div className="space-y-2">
          {[1, 2, 3, 4].map((i) => <div key={i} className="h-14 rounded-xl bg-slate-800/40 animate-pulse" />)}
        </div>
      )}

      {rows?.length === 0 && (
        <div className="text-center py-16 text-slate-500">
          <i className="ti ti-trophy-off text-4xl mb-2 block" />
          <p className="text-sm">Abhi tak koi submit nahi hua.</p>
        </div>
      )}

      <div className="space-y-2">
        {rows?.map((r) => (
          <div key={r.userId} className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-900/50 px-4 py-3">
            <span className="w-7 text-center font-black text-sm text-slate-400 shrink-0">{MEDAL[r.rank] || r.rank}</span>
            {r.photoURL ? (
              <img src={r.photoURL} alt="" className="w-8 h-8 rounded-full shrink-0" />
            ) : (
              <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold text-slate-300 shrink-0">
                {r.displayName?.[0]?.toUpperCase() || '?'}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-slate-100 truncate">{r.displayName}</p>
              <p className="text-[11px] text-slate-500">{r.attemptsCount} attempt{r.attemptsCount === 1 ? '' : 's'} · {formatTime(r.timeTakenSec)}</p>
            </div>
            <div className="text-right shrink-0">
              <p className="text-sm font-black text-tapasya-orange">{r.score}</p>
              <p className="text-[11px] text-slate-500">{r.accuracy}%</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}