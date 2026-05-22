// src/pages/Games.jsx
// Practice Arena hub — accordion categories (one open at a time, all collapsed initially)
// Route: /games

import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { fetchGameProfile, fetchGameHistory } from '@/api/games'
import { LEVEL_LABELS, GAME_META, RANK_LABELS } from '@/hooks/gameScoreHelper'

const CATEGORIES = [
  { id: 'number-forge',  emoji: '⚡', name: 'Number Forge',  tagline: 'Calculate. Climb. Conquer.',                   accent: 'orange', games: ['calculation', 'series'] },
  { id: 'mind-matrix',   emoji: '🧩', name: 'Mind Matrix',   tagline: 'Decode logic. Crack patterns.',                accent: 'violet', games: ['syllogism'] },
  { id: 'word-vault',    emoji: '📖', name: 'Word Vault',    tagline: 'Master the language of toppers.',              accent: 'pink',   games: ['vocab'] },
  { id: 'current-pulse', emoji: '🌐', name: 'Current Pulse', tagline: 'GK · Static · Current Affairs',               accent: 'teal',   games: [], locked: true },
  { id: 'gauntlet',      emoji: '💀', name: 'The Gauntlet',  tagline: 'All subjects. No mercy. Last one standing.',   accent: 'red',    games: ['survival'] },
]

const LEVEL_XP = {
  aspirant:  { min: 0,     max: 499   },
  learner:   { min: 500,   max: 1499  },
  contender: { min: 1500,  max: 3999  },
  achiever:  { min: 4000,  max: 7999  },
  champion:  { min: 8000,  max: 14999 },
  legend:    { min: 15000, max: 20000 },
}

const LEVEL_ORDER = ['aspirant','learner','contender','achiever','champion','legend']

const ACCENT = {
  orange: { border: 'border-orange-500/20', headerBg: 'from-orange-500/8 via-transparent to-transparent', iconBg: 'bg-orange-500/12 text-orange-400', badge: 'bg-orange-500/12 text-orange-300 border-orange-500/25', playBtn: 'from-orange-500 to-amber-500', playShadow: 'rgba(249,115,22,0.30)' },
  violet: { border: 'border-violet-500/20', headerBg: 'from-violet-500/8 via-transparent to-transparent', iconBg: 'bg-violet-500/12 text-violet-400', badge: 'bg-violet-500/12 text-violet-300 border-violet-500/25', playBtn: 'from-violet-500 to-purple-600', playShadow: 'rgba(139,92,246,0.30)' },
  pink:   { border: 'border-pink-500/20',   headerBg: 'from-pink-500/8 via-transparent to-transparent',   iconBg: 'bg-pink-500/12 text-pink-400',     badge: 'bg-pink-500/12 text-pink-300 border-pink-500/25',     playBtn: 'from-pink-500 to-rose-500',   playShadow: 'rgba(236,72,153,0.30)'  },
  teal:   { border: 'border-teal-500/20',   headerBg: 'from-teal-500/8 via-transparent to-transparent',   iconBg: 'bg-teal-500/12 text-teal-400',     badge: 'bg-teal-500/12 text-teal-300 border-teal-500/25',     playBtn: 'from-teal-500 to-cyan-500',   playShadow: 'rgba(20,184,166,0.30)'  },
  red:    { border: 'border-red-500/20',    headerBg: 'from-red-500/8 via-transparent to-transparent',    iconBg: 'bg-red-500/12 text-red-400',       badge: 'bg-red-500/12 text-red-300 border-red-500/25',       playBtn: 'from-red-500 to-rose-600',    playShadow: 'rgba(239,68,68,0.30)'   },
}

const GAME_ROUTES = { calculation: '/games/calculation', series: '/games/series', vocab: '/games/vocab', syllogism: '/games/syllogism', survival: '/games/survival' }
const GAME_ICON   = { calculation:'⚡', series:'📈', vocab:'📖', syllogism:'🧠', survival:'💀' }
const GAME_LABEL  = { calculation:'Calculation Climb', series:'Number Series Rush', vocab:'Vocab Blitz', syllogism:'Syllogism Strike', survival:'Survival Arena' }

// ── Page ──────────────────────────────────────────────────────────────────────
export default function Games() {
  const navigate = useNavigate()
  const [profile, setProfile] = useState(null)
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [openCat, setOpenCat] = useState(null)   // null = all collapsed

  useEffect(() => {
    Promise.all([fetchGameProfile(), fetchGameHistory()])
      .then(([p, h]) => { setProfile(p); setHistory(h) })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const totalXP   = profile?.totalXP     || 0
  const level     = profile?.level       || 'aspirant'
  const gameStats = profile?.gameStats   || {}
  const streak    = profile?.dailyStreak || 0
  const levelInfo = LEVEL_LABELS[level]  || {}
  const lvlRange  = LEVEL_XP[level]      || { min: 0, max: 499 }
  const xpInLevel = Math.max(0, totalXP - lvlRange.min)
  const xpNeeded  = lvlRange.max - lvlRange.min
  const xpPct     = Math.min(100, Math.round((xpInLevel / xpNeeded) * 100))
  const nextLvl   = LEVEL_ORDER[LEVEL_ORDER.indexOf(level) + 1]
  const nextLabel = nextLvl ? LEVEL_LABELS[nextLvl]?.label : '👑 Max Level'

  const toggle = (id) => setOpenCat(prev => prev === id ? null : id)

  if (loading) return (
    <div className="h-full flex flex-col items-center justify-center gap-3 bg-[#080d1a]">
      <div className="w-9 h-9 rounded-full border-2 border-orange-500/25 border-t-orange-500 animate-spin" />
      <p className="text-slate-500 text-xs tracking-widest uppercase">Loading Arena…</p>
    </div>
  )

  return (
    <div className="min-h-full bg-[#080d1a] pb-24" style={{
      backgroundImage: 'radial-gradient(ellipse 80% 35% at 60% 0%, rgba(249,115,22,0.07) 0%, transparent 65%)',
    }}>
      {/* Grid texture */}
      <div className="fixed inset-0 pointer-events-none" style={{
        backgroundImage: `linear-gradient(rgba(255,255,255,0.018) 1px, transparent 1px),
                          linear-gradient(90deg, rgba(255,255,255,0.018) 1px, transparent 1px)`,
        backgroundSize: '48px 48px',
      }} />

      <div className="relative w-full px-5 xl:px-8">

        {/* ── Header ─────────────────────────────────────────────── */}
        <div className="flex items-center justify-between pt-6 pb-5">
          <div>
            <h1 className="text-xl font-black text-white tracking-tight">⚔️ Practice Arena</h1>
            <p className="text-slate-600 text-[11px] mt-0.5 tracking-widest uppercase font-medium">
              Bank Exam Prep — Gamified
            </p>
          </div>
          {streak > 0 && (
            <div className="flex items-center gap-1.5 bg-orange-500/10 border border-orange-500/20 rounded-full px-3 py-1.5">
              <span>🔥</span>
              <span className="text-orange-400 text-xs font-black tabular-nums">{streak}d streak</span>
            </div>
          )}
        </div>

        {/* ── XP Card ────────────────────────────────────────────── */}
        <div className="w-full rounded-2xl mb-6 overflow-hidden border border-white/[0.06]" style={{
          background: 'linear-gradient(135deg, #111827 0%, #0f1729 100%)',
          boxShadow: '0 4px 32px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.04)',
        }}>
          <div className="h-px bg-gradient-to-r from-transparent via-orange-500/50 to-transparent" />
          <div className="px-5 py-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2.5">
                <span className={`text-sm font-black ${levelInfo.color}`}>{levelInfo.label}</span>
                <span className="w-1 h-1 rounded-full bg-slate-700" />
                <span className="text-slate-400 text-xs font-semibold tabular-nums">{totalXP.toLocaleString()} XP</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[11px] text-slate-500 hidden sm:inline">→ {nextLabel}</span>
                <span className="text-xs font-bold text-orange-400 tabular-nums">{xpPct}%</span>
              </div>
            </div>
            <div className="h-2 bg-slate-800/70 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-orange-500 via-amber-400 to-orange-400 transition-all duration-700"
                style={{ width: `${xpPct}%`, backgroundSize: '200%', animation: 'xpShimmer 2.5s ease infinite' }}
              />
            </div>
            <div className="flex items-center justify-between mt-1.5">
              <span className="text-[11px] text-slate-600 sm:hidden">→ {nextLabel}</span>
              <span className="text-[11px] text-slate-600 tabular-nums ml-auto">
                {xpInLevel.toLocaleString()} / {xpNeeded.toLocaleString()} XP
              </span>
            </div>
          </div>
        </div>

        {/* ── Accordion Categories ────────────────────────────────── */}
        <div className="space-y-3">
          {CATEGORIES.map((cat) => {
            const ac     = ACCENT[cat.accent]
            const isOpen = openCat === cat.id

            return (
              <div
                key={cat.id}
                className={`w-full rounded-2xl border overflow-hidden transition-all duration-200 ${ac.border} ${cat.locked ? 'opacity-55' : ''}`}
                style={{ background: 'linear-gradient(160deg, #0d1527 0%, #0a1020 100%)', boxShadow: '0 2px 20px rgba(0,0,0,0.35)' }}
              >
                {/* Header — accordion trigger */}
                <button
                  onClick={() => toggle(cat.id)}
                  className={`w-full flex items-center gap-4 px-5 py-4 text-left transition-all duration-200 bg-gradient-to-r ${isOpen ? ac.headerBg : 'from-transparent to-transparent'}`}
                >
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-2xl flex-shrink-0 ${ac.iconBg} ring-1 ring-white/[0.06]`}>
                    {cat.emoji}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-white font-black text-base">{cat.name}</span>
                      {cat.locked
                        ? <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${ac.badge}`}>COMING SOON</span>
                        : <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${ac.badge}`}>
                            {cat.games.length} {cat.games.length === 1 ? 'Game' : 'Games'}
                          </span>
                      }
                    </div>
                    <p className="text-slate-500 text-xs mt-0.5">{cat.tagline}</p>
                  </div>
                  {/* Chevron */}
                  <span
                    className="text-slate-500 flex-shrink-0 transition-transform duration-300 text-xs"
                    style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}
                  >
                    ▾
                  </span>
                </button>

                {/* Body — slides in/out */}
                {isOpen && (
                  <>
                    <div className="mx-5 h-px bg-white/[0.05]" />
                    <div className="p-4" style={{ animation: 'slideDown 0.2s ease both' }}>
                      {cat.games.length === 0 ? (
                        <div className="flex items-center justify-center gap-3 py-8 text-slate-600">
                          <span className="text-2xl">🔒</span>
                          <div>
                            <p className="text-xs font-bold text-slate-500">Coming soon</p>
                            <p className="text-[11px] text-slate-600 mt-0.5">Stay tuned for updates!</p>
                          </div>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                          {cat.games.map((type) => (
                            <GameCard key={type} gameType={type} stats={gameStats[type]} accent={ac} />
                          ))}
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            )
          })}
        </div>

        {/* ── Recent History ──────────────────────────────────────── */}
        {history.length > 0 && (
          <div className="mt-8">
            <div className="flex items-center justify-between mb-3 px-1">
              <div className="flex items-center gap-2">
                <div className="w-1 h-5 rounded-full bg-gradient-to-b from-orange-500 to-amber-600" />
                <h2 className="text-xs font-black text-slate-400 uppercase tracking-[0.15em]">Recent Battles</h2>
              </div>
              <button
                onClick={() => navigate('/games/stats?type=calculation')}
                className="text-xs text-orange-400 hover:text-orange-300 font-semibold transition-colors"
              >
                Full Stats →
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2">
              {history.slice(0, 6).map((s, i) => (
                <HistoryRow key={i} session={s} i={i} />
              ))}
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes xpShimmer {
          0%,100% { background-position: 0% 50% }
          50%      { background-position: 100% 50% }
        }
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-6px) }
          to   { opacity: 1; transform: translateY(0) }
        }
        @keyframes fadeUp {
          from { opacity:0; transform:translateY(6px) }
          to   { opacity:1; transform:translateY(0) }
        }
      `}</style>
    </div>
  )
}

// ── Game Card ──────────────────────────────────────────────────────────────────
function GameCard({ gameType, stats = {}, accent }) {
  const navigate    = useNavigate()
  const meta        = GAME_META[gameType] || {}
  const rank        = stats.rank          || 'bronze'
  const bestScore   = stats.bestScore     || 0
  const gamesPlayed = stats.gamesPlayed   || 0
  const rankInfo    = RANK_LABELS[rank]   || {}

  return (
    <div
      onClick={() => navigate(GAME_ROUTES[gameType])}
      className="relative rounded-xl overflow-hidden cursor-pointer group transition-transform duration-150 active:scale-95"
      style={{
        background: 'linear-gradient(150deg, #131d33 0%, #0e1628 100%)',
        border: '1px solid rgba(255,255,255,0.06)',
        boxShadow: '0 2px 12px rgba(0,0,0,0.3)',
      }}
    >
      <div className={`h-[2px] w-full bg-gradient-to-r ${meta.color}`} />
      <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-gradient-to-br ${accent.headerBg} pointer-events-none`} />

      <div className="relative p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-2xl" style={{ background: 'rgba(255,255,255,0.05)' }}>
            {meta.icon}
          </div>
          <span className={`text-[10px] font-bold px-2 py-1 rounded-full bg-slate-800/80 border border-white/[0.06] ${rankInfo.color}`}>
            {rankInfo.label}
          </span>
        </div>
        <h3 className="text-white font-black text-sm leading-snug">{meta.title}</h3>
        <p className="text-slate-500 text-[11px] mt-0.5 mb-3 leading-relaxed">{meta.desc}</p>
        <div className="flex items-center justify-between text-xs mb-3">
          <span className="text-slate-400">Best: <span className="text-white font-black tabular-nums">{bestScore.toLocaleString()}</span></span>
          <span className="text-slate-600 tabular-nums">{gamesPlayed} {gamesPlayed === 1 ? 'game' : 'games'}</span>
        </div>
        <button
          className={`w-full py-2.5 rounded-lg bg-gradient-to-r ${accent.playBtn} text-white font-black text-xs tracking-widest uppercase transition-all duration-150`}
          style={{ boxShadow: `0 4px 14px ${accent.playShadow}` }}
        >
          Play →
        </button>
      </div>
    </div>
  )
}

// ── History Row ────────────────────────────────────────────────────────────────
function HistoryRow({ session, i }) {
  return (
    <div
      className="flex items-center justify-between rounded-xl px-4 py-3 border border-white/[0.05]"
      style={{
        background: 'linear-gradient(135deg, #0e1628 0%, #0a1020 100%)',
        animation: `fadeUp 0.3s ease ${i * 40}ms both`,
      }}
    >
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg flex-shrink-0" style={{ background: 'rgba(255,255,255,0.04)' }}>
          {GAME_ICON[session.gameType] || '🎮'}
        </div>
        <div>
          <p className="text-slate-200 text-xs font-bold">{GAME_LABEL[session.gameType] || session.gameType}</p>
          <p className="text-slate-600 text-[11px] mt-0.5">{session.date}</p>
        </div>
      </div>
      <div className="text-right">
        <p className="text-orange-400 font-black text-sm tabular-nums">{session.score?.toLocaleString()}</p>
        <p className="text-slate-600 text-[11px] tabular-nums">+{session.xpEarned} XP</p>
      </div>
    </div>
  )
}