// src/pages/GameStats.jsx
// Per-game analytics page — route: /games/stats?type=calculation

import { useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { fetchGameStats } from '@/api/games'
import WeakTopicsChart from '@/components/games/WeakTopicsChart'
import { GAME_META, RANK_LABELS } from '@/hooks/gameScoreHelper'

const GAME_TYPES = ['calculation', 'series', 'vocab', 'syllogism', 'survival']

// XP needed to reach next rank (keyed by current rank id)
const RANK_XP = { bronze: 500, silver: 1000, gold: 2000, platinum: 5000, diamond: 10000 }

export default function GameStats() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const [type, setType]       = useState(params.get('type') || 'calculation')
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(true)
  const [animate, setAnimate] = useState(false)

  useEffect(() => {
    setLoading(true)
    setAnimate(false)
    fetchGameStats(type)
      .then(setData)
      .catch(console.error)
      .finally(() => {
        setLoading(false)
        // Trigger bar / fill animations after first paint
        requestAnimationFrame(() => setTimeout(() => setAnimate(true), 60))
      })
  }, [type])

  const meta = GAME_META[type] || {}

  return (
    <div className="min-h-screen bg-slate-950 pb-24 px-4">
      {/* Header */}
      <div className="pt-6 pb-4 flex items-center gap-3">
        <button
          onClick={() => navigate('/games')}
          className="text-slate-400 hover:text-white text-sm px-2 py-1 rounded-lg hover:bg-slate-800 transition-colors"
        >
          ← Back
        </button>
        <h1 className="text-lg font-bold text-white">
          {meta.icon} {meta.title}
          <span className="text-slate-500 font-normal"> — Stats</span>
        </h1>
      </div>

      {/* Game type tabs */}
      <div className="flex gap-2 overflow-x-auto pb-3 mb-5 scrollbar-hide">
        {GAME_TYPES.map((t) => (
          <button
            key={t}
            onClick={() => setType(t)}
            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-bold transition-colors ${
              t === type
                ? 'bg-orange-500 text-white shadow-[0_0_12px_rgba(249,115,22,0.4)]'
                : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
            }`}
          >
            {GAME_META[t]?.icon} {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-slate-500 text-sm animate-pulse text-center py-16">Loading stats…</div>
      ) : data ? (
        <div className="space-y-4">

          {/* ── Rank card with XP bar ── */}
          <RankCard data={data} animate={animate} />

          {/* ── Overview tiles ── */}
          <div className="grid grid-cols-2 gap-3">
            <StatTile
              label="Games played"
              value={data.gamesPlayed}
              delta={data.gamesThisWeek ? `+${data.gamesThisWeek} this week` : null}
            />
            <StatTile
              label="Best score"
              value={data.bestScore?.toLocaleString()}
              highlight
              delta="Personal best"
            />
            <StatTile
              label="Best streak"
              value={data.bestStreak}
              icon="🔥"
            />
            <StatTile
              label="Accuracy"
              value={data.accuracy != null ? `${data.accuracy}%` : null}
              green
              delta={data.accuracyDelta ? `${data.accuracyDelta > 0 ? '+' : ''}${data.accuracyDelta}% vs last week` : null}
            />
          </div>

          {/* ── Badges ── */}
          {(data.badges?.length > 0 || data.lockedBadges?.length > 0) && (
            <Section title="🏆 Badges">
              <div className="flex flex-wrap gap-2">
                {data.badges?.map((b, i) => (
                  <span key={i} className="text-xs font-bold px-3 py-1.5 rounded-full bg-amber-900/40 border border-amber-600/40 text-amber-300">
                    {b.icon} {b.label}
                  </span>
                ))}
                {data.lockedBadges?.map((b, i) => (
                  <span key={i} className="text-xs font-bold px-3 py-1.5 rounded-full bg-slate-800/60 border border-slate-700/40 text-slate-500">
                    🔒 {b.label}
                  </span>
                ))}
              </div>
            </Section>
          )}

          {/* ── Weak topics ── */}
          {data.weakTopics?.length > 0 && (
            <Section title="⚠️ Weak topics" subtitle="Sorted by error rate — these appear more often">
              <WeakTopicsChart weakTopics={data.weakTopics} />
            </Section>
          )}

          {/* ── Answer speed ── */}
          {data.speedStats && (
            <Section title="⚡ Answer speed" subtitle="Across last 20 sessions">
              <SpeedBars speed={data.speedStats} animate={animate} />
            </Section>
          )}

          {/* ── Score trend ── */}
          {data.recentScores?.length > 0 && (
            <Section title="📊 Score trend" subtitle="Last 7 games">
              <ScoreTrend scores={data.recentScores} animate={animate} />
            </Section>
          )}

          {/* ── Missed vocab ── */}
          {type === 'vocab' && data.wrongWords?.length > 0 && (
            <Section title="📖 Words you missed">
              <div className="flex flex-wrap gap-2">
                {data.wrongWords.map((w, i) => (
                  <span key={i} className="bg-red-900/30 border border-red-700/40 text-red-300 text-xs px-3 py-1.5 rounded-full font-medium">
                    {w}
                  </span>
                ))}
              </div>
            </Section>
          )}

        </div>
      ) : (
        <div className="text-slate-500 text-sm text-center py-16">
          No data yet — play a game first!
        </div>
      )}
    </div>
  )
}

// ─── Rank card ────────────────────────────────────────────────────────────────

function RankCard({ data, animate }) {
  const rankInfo   = RANK_LABELS[data.rank] || {}
  const xpToNext   = RANK_XP[data.rank] ?? 1000
  const xpProgress = data.rankPoints ? Math.min(100, Math.round((data.rankPoints % xpToNext) / xpToNext * 100)) : 0

  return (
    <div className="bg-[#1a1f35] rounded-2xl p-4 border border-slate-700/50">
      <div className="flex items-center gap-4">
        {/* Rank badge */}
        <div className="w-14 h-14 rounded-full flex items-center justify-center text-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex-shrink-0 shadow-[0_0_20px_rgba(251,191,36,0.25)]">
          {rankInfo.badge ?? '⭐'}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-xs text-slate-500 font-semibold uppercase tracking-wider mb-0.5">Current rank</div>
          <div className={`text-xl font-black ${rankInfo.color ?? 'text-orange-400'}`}>
            {rankInfo.label ?? data.rank}
          </div>
          <div className="text-slate-500 text-xs">{data.rankPoints?.toLocaleString()} rank points</div>

          {/* XP bar */}
          <div className="mt-2 h-2 bg-slate-700 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-orange-500 to-amber-400 transition-all duration-1000 ease-out"
              style={{ width: animate ? `${xpProgress}%` : '0%' }}
            />
          </div>
          <div className="flex justify-between text-[10px] text-slate-600 mt-1">
            <span>{rankInfo.label}</span>
            <span>{xpToNext - (data.rankPoints % xpToNext)} pts to next rank</span>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Stat tile ────────────────────────────────────────────────────────────────

function StatTile({ label, value, delta, highlight, green, icon }) {
  const valueColor = highlight
    ? 'text-orange-400'
    : green
    ? 'text-emerald-400'
    : 'text-white'

  return (
    <div className="bg-[#1a1f35] rounded-xl p-4 border border-slate-700/50 text-center">
      <div className={`text-xl font-black ${valueColor}`}>
        {icon && <span className="mr-1">{icon}</span>}
        {value ?? '—'}
      </div>
      <div className="text-slate-500 text-xs mt-0.5">{label}</div>
      {delta && <div className="text-emerald-500 text-[10px] mt-1 font-semibold">{delta}</div>}
    </div>
  )
}

// ─── Section wrapper ──────────────────────────────────────────────────────────

function Section({ title, subtitle, children }) {
  return (
    <div className="bg-[#1a1f35] rounded-2xl p-4 border border-slate-700/50">
      <div className="text-slate-200 text-sm font-bold mb-0.5">{title}</div>
      {subtitle && <div className="text-slate-500 text-xs mb-3">{subtitle}</div>}
      {children}
    </div>
  )
}

// ─── Speed bars ───────────────────────────────────────────────────────────────

function SpeedBars({ speed, animate }) {
  const bars = [
    { label: 'Under 5s', value: speed.under5Pct,    color: 'bg-emerald-500' },
    { label: '5–10s',    value: speed.mid5to10Pct,  color: 'bg-amber-400' },
    { label: 'Over 10s', value: speed.over10Pct,    color: 'bg-rose-500' },
  ]
  return (
    <div className="space-y-3">
      {bars.map((b, i) => (
        <div key={i}>
          <div className="flex justify-between text-xs text-slate-300 mb-1.5">
            <span>{b.label}</span>
            <span className="font-bold">{b.value}%</span>
          </div>
          <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
            <div
              className={`h-full ${b.color} rounded-full transition-all duration-700`}
              style={{ width: animate ? `${b.value}%` : '0%', transitionDelay: `${i * 120}ms` }}
            />
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Score trend ──────────────────────────────────────────────────────────────

function ScoreTrend({ scores, animate }) {
  const maxScore = Math.max(...scores.map(s => s.score), 1)
  const avg      = Math.round(scores.reduce((a, s) => a + s.score, 0) / scores.length)

  return (
    <>
      <div className="text-xs text-slate-500 mb-3">
        Avg: <span className="text-slate-300 font-semibold">{avg.toLocaleString()}</span>
      </div>
      <div className="flex items-end gap-1.5 h-20">
        {scores.map((s, i) => {
          const isMax    = s.score === maxScore
          const heightPct = Math.max(5, Math.round((s.score / maxScore) * 100))
          return (
            <div key={i} className="flex-1 flex flex-col items-center gap-1">
              <div
                className={`w-full rounded-t transition-all duration-700 ease-out ${
                  isMax
                    ? 'bg-gradient-to-t from-amber-500 to-amber-300'
                    : 'bg-gradient-to-t from-orange-700 to-orange-500'
                }`}
                style={{
                  height: animate ? `${heightPct}%` : '0%',
                  transitionDelay: `${i * 60}ms`,
                }}
                title={`${s.score.toLocaleString()} pts — ${s.date}`}
              />
              <span className="text-slate-600 text-[9px] truncate w-full text-center">
                {s.date?.slice(5)}
              </span>
            </div>
          )
        })}
      </div>
    </>
  )
}