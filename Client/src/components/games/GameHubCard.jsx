// src/components/games/GameHubCard.jsx
// Individual game tile on the /games hub page
// Shows: icon, title, desc, rank, best score, play button

import { useNavigate } from 'react-router-dom'
import { GAME_META, RANK_LABELS } from '@/hooks/gameScoreHelper'

const GAME_ROUTES = {
  calculation: '/games/calculation',
  series:      '/games/series',
  vocab:       '/games/vocab',
  syllogism:   '/games/syllogism',
  survival:    '/games/survival',
}

export default function GameHubCard({ gameType, stats = {} }) {
  const navigate = useNavigate()
  const meta   = GAME_META[gameType] || {}
  const route  = GAME_ROUTES[gameType]

  const rank       = stats.rank       || 'bronze'
  const bestScore  = stats.bestScore  || 0
  const gamesPlayed= stats.gamesPlayed|| 0
  const rankInfo   = RANK_LABELS[rank] || {}

  return (
    <div
      onClick={() => navigate(route)}
      className="relative bg-[#1a2744] rounded-2xl p-4 border border-slate-700/60 active:scale-95 transition-transform cursor-pointer overflow-hidden"
    >
      {/* Gradient accent strip */}
      <div className={`absolute top-0 left-0 right-0 h-1 rounded-t-2xl bg-gradient-to-r ${meta.color}`} />

      <div className="flex items-start justify-between mb-3 mt-1">
        <span className="text-3xl">{meta.icon}</span>
        <span className={`text-xs font-bold px-2 py-1 rounded-full bg-slate-800 ${rankInfo.color}`}>
          {rankInfo.label}
        </span>
      </div>

      <h3 className="text-white font-bold text-sm leading-tight mb-0.5">{meta.title}</h3>
      <p className="text-slate-500 text-xs mb-3">{meta.desc}</p>

      <div className="flex items-center justify-between text-xs">
        <div className="text-slate-400">
          Best: <span className="text-white font-semibold">{bestScore.toLocaleString()}</span>
        </div>
        <div className="text-slate-500">
          {gamesPlayed} {gamesPlayed === 1 ? 'game' : 'games'}
        </div>
      </div>

      {/* Play button */}
      <button
        className={`mt-3 w-full py-2 rounded-xl bg-gradient-to-r ${meta.color} text-white font-bold text-sm transition-opacity`}
      >
        Play →
      </button>
    </div>
  )
}
