// src/pages/Games.jsx  (also aliased to pages/Games.jsx)
// Practice Arena hub — 5 game tiles, XP bar, daily streak, history
// Route: /games

import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { fetchGameProfile, fetchGameHistory } from '@/api/games'
import GameHubCard from '@/components/games/GameHubCard'
import { LEVEL_LABELS } from '@/hooks/gameScoreHelper'

const GAME_TYPES = ['calculation', 'series', 'vocab', 'syllogism', 'survival']

const LEVEL_XP = {
  aspirant:  { min: 0,     max: 499  },
  learner:   { min: 500,   max: 1499 },
  contender: { min: 1500,  max: 3999 },
  achiever:  { min: 4000,  max: 7999 },
  champion:  { min: 8000,  max: 14999},
  legend:    { min: 15000, max: 20000 },
}

export default function Games() {
  const navigate    = useNavigate()
  const [profile, setProfile]   = useState(null)
  const [history, setHistory]   = useState([])
  const [loading, setLoading]   = useState(true)

  useEffect(() => {
    Promise.all([fetchGameProfile(), fetchGameHistory()])
      .then(([p, h]) => { setProfile(p); setHistory(h) })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const totalXP   = profile?.totalXP   || 0
  const level     = profile?.level     || 'aspirant'
  const gameStats = profile?.gameStats || {}
  const streak    = profile?.dailyStreak || 0

  // XP progress bar within current level
  const lvlRange  = LEVEL_XP[level] || { min: 0, max: 499 }
  const xpInLevel = Math.max(0, totalXP - lvlRange.min)
  const xpNeeded  = lvlRange.max - lvlRange.min
  const xpPct     = Math.min(100, Math.round((xpInLevel / xpNeeded) * 100))

  const levelInfo = LEVEL_LABELS[level] || {}

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0f172a] flex items-center justify-center">
        <div className="text-slate-400 text-sm animate-pulse">Loading Practice Arena…</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0f172a] pb-24 px-4">
      {/* Header */}
      <div className="pt-6 pb-4">
        <h1 className="text-2xl font-black text-white">
          ⚔️ Practice Arena
        </h1>
        <p className="text-slate-400 text-sm mt-0.5">Bank exam prep — gamified</p>
      </div>

      {/* XP + level card */}
      <div className="bg-[#1a2744] rounded-2xl p-4 mb-5 border border-slate-700/60">
        <div className="flex justify-between items-start mb-3">
          <div>
            <div className={`font-bold text-base ${levelInfo.color}`}>{levelInfo.label}</div>
            <div className="text-slate-400 text-xs">{totalXP.toLocaleString()} total XP</div>
          </div>
          <div className="flex items-center gap-2">
            {streak > 0 && (
              <div className="bg-orange-500/20 border border-orange-500/40 text-orange-400 text-xs font-bold px-2 py-1 rounded-full">
                🔥 {streak} day streak
              </div>
            )}
          </div>
        </div>
        {/* XP progress bar */}
        <div className="h-2.5 bg-slate-700 rounded-full overflow-hidden mb-1">
          <div
            className="h-full bg-gradient-to-r from-orange-500 to-amber-400 rounded-full transition-all duration-700"
            style={{ width: `${xpPct}%` }}
          />
        </div>
        <div className="text-right text-xs text-slate-500">{xpInLevel} / {xpNeeded} XP</div>
      </div>

      {/* Game tiles */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
        {GAME_TYPES.map((type) => (
          <GameHubCard
            key={type}
            gameType={type}
            stats={gameStats[type]}
          />
        ))}
      </div>

      {/* Recent game history */}
      {history.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-slate-300 uppercase tracking-wide">Recent Games</h2>
            <button
              onClick={() => navigate('/games/stats?type=calculation')}
              className="text-xs text-orange-400 hover:text-orange-300"
            >
              Full Stats →
            </button>
          </div>
          <div className="space-y-2">
            {history.slice(0, 5).map((s, i) => (
              <HistoryRow key={i} session={s} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

const GAME_ICON = { calculation:'⚡', series:'📈', vocab:'📖', syllogism:'🧠', survival:'💀' }

function HistoryRow({ session }) {
  return (
    <div className="flex items-center justify-between bg-[#1a2744]/60 rounded-xl px-4 py-2.5 border border-slate-800">
      <div className="flex items-center gap-3">
        <span className="text-xl">{GAME_ICON[session.gameType] || '🎮'}</span>
        <div>
          <div className="text-slate-200 text-sm font-semibold capitalize">{session.gameType}</div>
          <div className="text-slate-500 text-xs">{session.date}</div>
        </div>
      </div>
      <div className="text-right">
        <div className="text-orange-400 font-bold text-sm">{session.score?.toLocaleString()}</div>
        <div className="text-slate-500 text-xs">+{session.xpEarned} XP</div>
      </div>
    </div>
  )
}
