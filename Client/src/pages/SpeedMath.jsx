// src/pages/SpeedMath.jsx
// Speed Math home — 4 modules (Tables/Squares/Cubes/%↔Fraction), each with
// Learn (reference) + Test entry points, plus a Mix Test and streak banner.
// Deliberately themed cyan/indigo — distinct from Practice Arena's orange.

import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { MODULE_META } from '@/utils/speedMathGenerator'
import { fetchSpeedMathProfile } from '@/api/speedmath'

export default function SpeedMath() {
  const navigate = useNavigate()
  const [profile, setProfile] = useState(null)

  useEffect(() => {
    fetchSpeedMathProfile().then(setProfile).catch(() => {})
  }, [])

  return (
    <div className="min-h-screen px-4 py-6 md:px-8" style={{ background: 'radial-gradient(ellipse 70% 50% at 50% 0%, rgba(34,211,238,0.06) 0%, #080d1a 60%)' }}>
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight">⚡ Speed Math</h1>
          <p className="text-slate-400 text-sm mt-0.5">Tables · Squares · Cubes · % ↔ Fraction</p>
        </div>
        <button
          onClick={() => navigate('/speedmath/stats')}
          className="flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-xl"
          style={{ background: 'rgba(99,102,241,0.12)', color: '#a5b4fc', border: '1px solid rgba(99,102,241,0.25)' }}
        >
          <i className="ti ti-chart-bar" /> Stats
        </button>
      </div>

      {/* ── Streak / quick stats banner ───────────────────────────────────── */}
      {profile && profile.totalTests > 0 && (
        <div
          className="flex items-center justify-between rounded-2xl px-4 py-3 mb-5"
          style={{ background: 'linear-gradient(135deg, rgba(34,211,238,0.08), rgba(99,102,241,0.08))', border: '1px solid rgba(99,102,241,0.15)' }}
        >
          <StatChip icon="🔥" label="Streak" value={`${profile.currentStreak}d`} />
          <StatChip icon="🎯" label="Accuracy" value={`${profile.overallAccuracy}%`} />
          <StatChip icon="📝" label="Tests" value={profile.totalTests} />
        </div>
      )}

      {/* ── Mix test CTA ───────────────────────────────────────────────────── */}
      <button
        onClick={() => navigate('/speedmath/config/mix')}
        className="w-full rounded-2xl px-5 py-4 mb-5 flex items-center justify-between active:scale-[0.98] transition-transform"
        style={{ background: 'linear-gradient(135deg, #0891b2, #4f46e5)', boxShadow: '0 8px 28px rgba(79,70,229,0.35)' }}
      >
        <div className="text-left">
          <p className="text-white font-black text-base">🎲 Mix Test</p>
          <p className="text-cyan-100/80 text-xs">All 4 topics combined, random</p>
        </div>
        <i className="ti ti-chevron-right text-white text-xl" />
      </button>

      {/* ── Module tiles ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {Object.entries(MODULE_META).map(([key, meta]) => (
          <ModuleTile key={key} moduleKey={key} meta={meta} onLearn={() => navigate(`/speedmath/learn/${key}`)} onTest={() => navigate(`/speedmath/config/${key}`)} />
        ))}
      </div>
    </div>
  )
}

function StatChip({ icon, label, value }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-lg">{icon}</span>
      <div>
        <p className="text-white font-black text-sm leading-none">{value}</p>
        <p className="text-slate-400 text-[10px] mt-0.5">{label}</p>
      </div>
    </div>
  )
}

function ModuleTile({ moduleKey, meta, onLearn, onTest }) {
  return (
    <div
      className="rounded-2xl p-4"
      style={{ background: 'linear-gradient(135deg, #101a30 0%, #0d1728 100%)', border: '1px solid rgba(255,255,255,0.07)' }}
    >
      <div className="flex items-center gap-3 mb-3">
        <div className="w-11 h-11 rounded-xl flex items-center justify-center text-xl" style={{ background: `${meta.color}18` }}>
          {meta.icon}
        </div>
        <div>
          <p className="text-white font-bold text-sm">{meta.label}</p>
          {meta.defaultRange && (
            <p className="text-slate-500 text-[11px]">{meta.defaultRange[0]} – {meta.defaultRange[1]}</p>
          )}
        </div>
      </div>
      <div className="flex gap-2">
        <button
          onClick={onLearn}
          className="flex-1 text-xs font-bold py-2 rounded-lg"
          style={{ background: 'rgba(255,255,255,0.05)', color: '#94a3b8' }}
        >
          📖 Learn
        </button>
        <button
          onClick={onTest}
          className="flex-1 text-xs font-bold py-2 rounded-lg text-white"
          style={{ background: `linear-gradient(135deg, ${meta.color}, ${meta.color}cc)` }}
        >
          ⚡ Test
        </button>
      </div>
    </div>
  )
}