// src/components/games/GameResult.jsx
// Gamified result screen — animated score, grade badge, XP bar fill, level-up flash

import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { LEVEL_LABELS, RANK_LABELS, GAME_META } from '@/hooks/gameScoreHelper'
import useGameStore from '@/store/gameStore'

// Grade based on accuracy
function getGrade(correct, total) {
  if (!total) return { label: '-',  color: '#64748b', bg: 'rgba(100,116,139,0.15)' }
  const pct = correct / total
  if (pct >= 0.9)  return { label: 'S',  color: '#fbbf24', bg: 'rgba(251,191,36,0.15)',  glow: 'rgba(251,191,36,0.35)' }
  if (pct >= 0.75) return { label: 'A',  color: '#34d399', bg: 'rgba(52,211,153,0.15)',  glow: 'rgba(52,211,153,0.3)' }
  if (pct >= 0.6)  return { label: 'B',  color: '#60a5fa', bg: 'rgba(96,165,250,0.15)',  glow: 'rgba(96,165,250,0.3)' }
  if (pct >= 0.4)  return { label: 'C',  color: '#f97316', bg: 'rgba(249,115,22,0.15)',  glow: 'rgba(249,115,22,0.3)' }
  return               { label: 'D',  color: '#f87171', bg: 'rgba(248,113,113,0.15)', glow: 'rgba(248,113,113,0.3)' }
}

export default function GameResult({ result, gameType, onPlayAgain }) {
  const navigate         = useNavigate()
  const { breakdown }    = useGameStore()
  const [phase, setPhase] = useState(0)   // 0=grade, 1=score, 2=stats, 3=xp, 4=actions
  const [displayScore, setDisplay] = useState(0)
  const [xpBar, setXpBar] = useState(0)

  const {
    finalScore  = 0,
    xpEarned    = 0,
    newLevel,  prevLevel,
    newRank,   prevRank,
    weakTopics  = [],
    dailyStreak = 0,
  } = result || {}

  const correct  = breakdown.filter(b =>  b.isCorrect).length
  const wrong    = breakdown.filter(b => !b.isCorrect).length
  const total    = breakdown.length
  const avgTime  = total ? Math.round(breakdown.reduce((s, b) => s + b.timeTaken, 0) / total) : 0
  const accuracy = total ? Math.round((correct / total) * 100) : 0

  const grade   = getGrade(correct, total)
  const meta    = GAME_META[gameType] || {}
  const levelUp = newLevel && prevLevel && newLevel !== prevLevel
  const rankUp  = newRank  && prevRank  && newRank  !== prevRank

  // Reveal phases
  useEffect(() => {
    const timings = [400, 900, 1400, 1900]
    const timers  = timings.map((t, i) => setTimeout(() => setPhase(i + 1), t))
    return () => timers.forEach(clearTimeout)
  }, [])

  // Score count-up
  useEffect(() => {
    if (phase < 2) return
    let frame
    const step = Math.max(1, Math.ceil(finalScore / 40))
    let cur = 0
    const tick = () => {
      cur = Math.min(cur + step, finalScore)
      setDisplay(cur)
      if (cur < finalScore) frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [phase, finalScore])

  // XP bar fill
  useEffect(() => {
    if (phase < 4) return
    const t = setTimeout(() => setXpBar(Math.min(100, Math.round((xpEarned / 200) * 100))), 100)
    return () => clearTimeout(t)
  }, [phase, xpEarned])

  return (
    <div
      className="min-h-screen flex flex-col items-center pt-10 px-4 pb-16 overflow-y-auto"
      style={{
        background: 'radial-gradient(ellipse 80% 50% at 50% 0%, rgba(249,115,22,0.08) 0%, #080d1a 60%)',
      }}
    >
      {/* Level-up flash overlay */}
      {levelUp && phase >= 4 && (
        <div
          className="fixed inset-0 pointer-events-none z-50 flex flex-col items-center justify-center"
          style={{ animation: 'levelFlash 1.2s ease forwards' }}
        >
          <div
            className="text-center px-8 py-6 rounded-3xl"
            style={{ background: 'rgba(8,13,26,0.92)', border: '1px solid rgba(249,115,22,0.4)' }}
          >
            <div className="text-4xl mb-2" style={{ animation: 'popIn 0.5s ease' }}>⚡</div>
            <div className="text-3xl font-black text-orange-400 mb-1">LEVEL UP!</div>
            <div className="text-slate-300 text-sm">
              {LEVEL_LABELS[prevLevel]?.label} → {LEVEL_LABELS[newLevel]?.label}
            </div>
          </div>
        </div>
      )}

      {/* Game badge */}
      <div className="flex items-center gap-2 mb-6" style={{ opacity: phase >= 1 ? 1 : 0, transition: 'opacity 0.4s ease' }}>
        <span className="text-2xl">{meta.icon}</span>
        <div>
          <p className="text-white font-bold text-base">{meta.title}</p>
          <p className="text-slate-500 text-xs">Game Over</p>
        </div>
      </div>

      {/* Grade badge */}
      {phase >= 1 && (
        <div
          className="w-24 h-24 rounded-full flex items-center justify-center mb-4 font-black text-5xl"
          style={{
            background: grade.bg,
            border:     `2px solid ${grade.color}40`,
            color:      grade.color,
            boxShadow:  `0 0 32px ${grade.glow || 'transparent'}`,
            animation:  'popIn 0.5s cubic-bezier(0.34,1.56,0.64,1) both',
          }}
        >
          {grade.label}
        </div>
      )}

      {/* Score */}
      {phase >= 2 && (
        <div className="text-center mb-2" style={{ animation: 'fadeUp 0.4s ease both' }}>
          <div className="text-6xl font-black text-white tabular-nums" style={{ letterSpacing: '-0.03em' }}>
            {displayScore}
          </div>
          <div className="text-slate-500 text-xs font-semibold uppercase tracking-widest mt-1">points</div>
        </div>
      )}

      {/* Accuracy bar */}
      {phase >= 2 && (
        <div className="w-full max-w-sm mb-5 mt-3" style={{ animation: 'fadeUp 0.4s ease 0.1s both' }}>
          <div className="flex justify-between text-xs mb-1.5">
            <span className="text-slate-500">Accuracy</span>
            <span className="font-bold" style={{ color: grade.color }}>{accuracy}%</span>
          </div>
          <div className="h-1.5 rounded-full" style={{ background: 'rgba(255,255,255,0.06)' }}>
            <div
              className="h-full rounded-full"
              style={{
                width:      `${accuracy}%`,
                background: `linear-gradient(90deg, ${grade.color}, ${grade.color}99)`,
                transition: 'width 0.8s ease',
              }}
            />
          </div>
        </div>
      )}

      {/* Stat pills */}
      {phase >= 3 && (
        <div className="flex gap-2.5 mb-5 w-full max-w-sm" style={{ animation: 'fadeUp 0.4s ease both' }}>
          <StatPill label="Correct"  value={correct}    color="#34d399" icon="✓" />
          <StatPill label="Wrong"    value={wrong}      color="#f87171" icon="✗" />
          <StatPill label="Avg time" value={`${avgTime}s`} color="#60a5fa" icon="⏱" />
        </div>
      )}

      {/* XP + rank card */}
      {phase >= 4 && (
        <div
          className="w-full max-w-sm rounded-2xl p-4 mb-4"
          style={{
            background: 'linear-gradient(135deg, #111827 0%, #0f1729 100%)',
            border:     '1px solid rgba(255,255,255,0.07)',
            animation:  'fadeUp 0.4s ease both',
          }}
        >
          {/* XP earned */}
          <div className="flex items-center justify-between mb-3">
            <span className="text-slate-400 text-sm">XP Earned</span>
            <span className="text-orange-400 font-black text-lg">+{xpEarned} XP</span>
          </div>
          <div className="h-1.5 rounded-full mb-3" style={{ background: 'rgba(255,255,255,0.06)' }}>
            <div
              className="h-full rounded-full bg-gradient-to-r from-orange-500 to-amber-400"
              style={{ width: `${xpBar}%`, transition: 'width 1s cubic-bezier(0.22,1,0.36,1)' }}
            />
          </div>

          {/* Rank row */}
          {newRank && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-400">Rank</span>
              {rankUp ? (
                <span className="text-purple-400 font-bold">
                  {RANK_LABELS[prevRank]?.label} → {RANK_LABELS[newRank]?.label} ⬆
                </span>
              ) : (
                <span className={`${RANK_LABELS[newRank]?.color} font-semibold`}>
                  {RANK_LABELS[newRank]?.label}
                </span>
              )}
            </div>
          )}

          {dailyStreak > 0 && (
            <div className="flex items-center justify-between text-sm mt-2">
              <span className="text-slate-400">Daily Streak</span>
              <span className="text-amber-400 font-bold">🔥 {dailyStreak} days</span>
            </div>
          )}
        </div>
      )}

      {/* Weak spots */}
      {phase >= 4 && weakTopics.length > 0 && (
        <div
          className="w-full max-w-sm rounded-2xl p-4 mb-4"
          style={{
            background: 'linear-gradient(135deg, rgba(127,29,29,0.25) 0%, rgba(69,10,10,0.15) 100%)',
            border:     '1px solid rgba(248,113,113,0.15)',
            animation:  'fadeUp 0.4s ease 0.1s both',
          }}
        >
          <div className="flex items-center gap-2 mb-2.5">
            <span className="text-red-400">⚠</span>
            <span className="text-red-400 text-xs font-black uppercase tracking-wider">Weak Areas</span>
          </div>
          {weakTopics.slice(0, 3).map((wt, i) => (
            <div key={i} className="flex justify-between text-xs py-1 border-b border-red-900/30 last:border-0">
              <span className="text-slate-300 capitalize">{wt.topic?.replace(/-/g, ' ')}</span>
              <span className="text-red-400 font-semibold">{wt.wrongCount} wrong</span>
            </div>
          ))}
          <p className="text-slate-600 text-[11px] mt-2">These will appear more next session 🔁</p>
        </div>
      )}

      {/* Action buttons */}
      {phase >= 4 && (
        <div
          className="w-full max-w-sm space-y-2.5 mt-1"
          style={{ animation: 'fadeUp 0.4s ease 0.2s both' }}
        >
          <button
            onClick={onPlayAgain}
            className="w-full py-3.5 rounded-xl text-white font-black text-sm tracking-wide active:scale-95 transition-transform"
            style={{
              background: 'linear-gradient(135deg, #f97316, #fb923c)',
              boxShadow:  '0 4px 20px rgba(249,115,22,0.35)',
            }}
          >
            Play Again ↺
          </button>
          <button
            onClick={() => navigate(`/games/stats?type=${gameType}`)}
            className="w-full py-3 rounded-xl font-semibold text-sm text-slate-200 active:scale-95 transition-transform"
            style={{
              background: 'rgba(255,255,255,0.05)',
              border:     '1px solid rgba(255,255,255,0.08)',
            }}
          >
            Full Stats →
          </button>
          <button
            onClick={() => navigate('/games')}
            className="w-full py-2 text-slate-600 text-sm hover:text-slate-400 transition-colors"
          >
            ← Back to Games Hub
          </button>
        </div>
      )}

      <style>{`
        @keyframes popIn {
          0%   { transform: scale(0.4); opacity: 0 }
          70%  { transform: scale(1.15) }
          100% { transform: scale(1);   opacity: 1 }
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(10px) }
          to   { opacity: 1; transform: translateY(0) }
        }
        @keyframes levelFlash {
          0%   { opacity: 0 }
          15%  { opacity: 1 }
          75%  { opacity: 1 }
          100% { opacity: 0 }
        }
      `}</style>
    </div>
  )
}

function StatPill({ label, value, color, icon }) {
  return (
    <div
      className="flex-1 flex flex-col items-center py-3 rounded-xl"
      style={{
        background: `${color}12`,
        border:     `1px solid ${color}25`,
      }}
    >
      <span className="text-base mb-0.5">{icon}</span>
      <span className="font-black text-lg" style={{ color }}>{value}</span>
      <span className="text-slate-500 text-[11px] mt-0.5">{label}</span>
    </div>
  )
}