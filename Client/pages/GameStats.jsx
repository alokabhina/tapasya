// src/pages/GameStats.jsx
// Per-game analytics page — route: /games/stats?type=calculation
// Weak topics bar chart, speed analysis, score trend, wrong vocab chips

import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { fetchGameStats } from '@/api/games'
import WeakTopicsChart from '@/components/games/WeakTopicsChart'
import { GAME_META, RANK_LABELS } from '@/hooks/gameScoreHelper'

const GAME_TYPES = ['calculation', 'series', 'vocab', 'syllogism', 'survival']

export default function GameStats() {
  const navigate = useNavigate()
  const [params]  = useSearchParams()
  const [type, setType] = useState(params.get('type') || 'calculation')
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    fetchGameStats(type)
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [type])

  const meta = GAME_META[type] || {}

  return (
    <div className="min-h-screen bg-[#0f172a] pb-24 px-4">
      {/* Header */}
      <div className="pt-6 pb-4 flex items-center gap-3">
        <button onClick={() => navigate('/games')} className="text-slate-400 hover:text-white text-sm">
          ← Back
        </button>
        <div>
          <h1 className="text-xl font-black text-white">{meta.icon} {meta.title} — Stats</h1>
        </div>
      </div>

      {/* Game type tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-5 scrollbar-hide">
        {GAME_TYPES.map((t) => (
          <button
            key={t}
            onClick={() => setType(t)}
            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-bold transition-colors ${
              t === type
                ? 'bg-orange-500 text-white'
                : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
            }`}
          >
            {GAME_META[t]?.icon} {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-slate-400 text-sm animate-pulse text-center py-12">Loading stats…</div>
      ) : data ? (
        <div className="space-y-5">
          {/* Overview pills */}
          <div className="grid grid-cols-3 gap-3">
            <StatCard label="Games"      value={data.gamesPlayed} />
            <StatCard label="Best Score" value={data.bestScore?.toLocaleString()} />
            <StatCard label="Best Streak"value={data.bestStreak} />
          </div>

          {/* Rank */}
          <div className="bg-[#1a2744] rounded-2xl p-4 border border-slate-700/60">
            <div className="text-slate-400 text-xs font-bold uppercase tracking-wide mb-1">Current Rank</div>
            <div className={`text-xl font-black ${RANK_LABELS[data.rank]?.color}`}>
              {RANK_LABELS[data.rank]?.label}
            </div>
            <div className="text-slate-500 text-xs">{data.rankPoints?.toLocaleString()} rank points</div>
          </div>

          {/* Weak topics */}
          <Section title="⚠ Weak Topics" subtitle="Sorted by error rate — these come back more often">
            <WeakTopicsChart weakTopics={data.weakTopics} />
          </Section>

          {/* Speed analysis */}
          {data.speedStats && (
            <Section title="⚡ Answer Speed" subtitle="Across last 20 sessions">
              <SpeedBars speed={data.speedStats} />
            </Section>
          )}

          {/* Score trend */}
          {data.recentScores?.length > 0 && (
            <Section title="📊 Score Trend" subtitle="Last 7 games">
              <ScoreTrend scores={data.recentScores} />
            </Section>
          )}

          {/* Vocab wrong words */}
          {type === 'vocab' && data.wrongWords?.length > 0 && (
            <Section title="📖 Words You Missed">
              <div className="flex flex-wrap gap-2">
                {data.wrongWords.map((w, i) => (
                  <span key={i} className="bg-red-900/30 border border-red-700/40 text-red-300 text-xs px-2 py-1 rounded-full">
                    {w}
                  </span>
                ))}
              </div>
            </Section>
          )}
        </div>
      ) : (
        <div className="text-slate-500 text-sm text-center py-12">No data yet — play a game first!</div>
      )}
    </div>
  )
}

function StatCard({ label, value }) {
  return (
    <div className="bg-[#1a2744] rounded-xl p-3 border border-slate-700/60 text-center">
      <div className="text-white font-bold text-lg">{value ?? '—'}</div>
      <div className="text-slate-500 text-xs">{label}</div>
    </div>
  )
}

function Section({ title, subtitle, children }) {
  return (
    <div className="bg-[#1a2744] rounded-2xl p-4 border border-slate-700/60">
      <div className="text-slate-300 text-sm font-bold mb-0.5">{title}</div>
      {subtitle && <div className="text-slate-500 text-xs mb-3">{subtitle}</div>}
      {children}
    </div>
  )
}

function SpeedBars({ speed }) {
  const bars = [
    { label: 'Under 5s', value: speed.under5Pct, color: 'bg-green-500' },
    { label: '5–10s',    value: speed.mid5to10Pct, color: 'bg-yellow-400' },
    { label: 'Over 10s', value: speed.over10Pct, color: 'bg-red-500' },
  ]
  return (
    <div className="space-y-2">
      {bars.map((b, i) => (
        <div key={i}>
          <div className="flex justify-between text-xs text-slate-300 mb-1">
            <span>{b.label}</span>
            <span className="font-bold">{b.value}%</span>
          </div>
          <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
            <div className={`h-full ${b.color} rounded-full transition-all duration-700`} style={{ width: `${b.value}%` }} />
          </div>
        </div>
      ))}
    </div>
  )
}

function ScoreTrend({ scores }) {
  const maxScore = Math.max(...scores.map(s => s.score), 1)
  return (
    <div className="flex items-end gap-1.5 h-20">
      {scores.map((s, i) => {
        const heightPct = Math.max(4, Math.round((s.score / maxScore) * 100))
        return (
          <div key={i} className="flex-1 flex flex-col items-center gap-1">
            <div
              className="w-full rounded-t bg-gradient-to-t from-orange-600 to-amber-400 transition-all duration-700"
              style={{ height: `${heightPct}%` }}
              title={`${s.score} pts — ${s.date}`}
            />
            <span className="text-slate-600 text-[9px] truncate w-full text-center">{s.date?.slice(5)}</span>
          </div>
        )
      })}
    </div>
  )
}
