// src/pages/SpeedMathStats.jsx
// Speed Math's OWN stats page — intentionally separate from Practice Arena's
// GameStats.jsx. Heatmap grids per module + weak items + test history.

import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { MODULE_META, generateFocusedQuizSet } from '@/utils/speedMathGenerator'
import { fetchSpeedMathProfile, fetchSpeedMathSessions } from '@/api/speedmath'
import useSpeedMathStore from '@/store/speedMathStore'
import HeatmapGrid from '@/components/speedmath/HeatmapGrid'

const RANGE_BY_MODULE = { table: [12, 30], square: [1, 30], cube: [1, 20] }

function itemLabel(module, itemKey) {
  if (module === 'table') return `Table of ${itemKey}`
  if (module === 'square') return `${itemKey}²`
  if (module === 'cube') return `${itemKey}³`
  return itemKey
}

export default function SpeedMathStats() {
  const navigate = useNavigate()
  const startTest = useSpeedMathStore((s) => s.startTest)
  const [profile, setProfile] = useState(null)
  const [sessions, setSessions] = useState([])
  const [tab, setTab] = useState('table')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([fetchSpeedMathProfile(), fetchSpeedMathSessions()])
      .then(([p, s]) => { setProfile(p); setSessions(s) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const practiceNow = (module, itemKey) => {
    const questions = generateFocusedQuizSet(module, itemKey, { count: 6 })
    startTest([module], null, questions)
    navigate('/speedmath/play')
  }

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-slate-500" style={{ background: '#080d1a' }}>Loading stats…</div>
  }

  const itemsMapFor = (module) => {
    const map = {}
    for (const it of (profile?.items || [])) {
      if (it.module === module) map[it.itemKey] = it
    }
    return map
  }

  return (
    <div className="min-h-screen px-4 py-6 md:px-8" style={{ background: '#080d1a' }}>
      <button onClick={() => navigate('/speedmath')} className="flex items-center gap-1.5 text-slate-500 hover:text-slate-300 text-xs font-semibold mb-4">
        ← Back
      </button>

      <h1 className="text-xl font-black text-white mb-4">📊 Speed Math Stats</h1>

      {/* Overview */}
      <div className="grid grid-cols-4 gap-2 mb-5">
        <MiniStat label="Tests" value={profile?.totalTests ?? 0} />
        <MiniStat label="Accuracy" value={`${profile?.overallAccuracy ?? 0}%`} />
        <MiniStat label="Streak" value={`${profile?.currentStreak ?? 0}d`} />
        <MiniStat label="Best" value={`${profile?.bestStreak ?? 0}d`} />
      </div>

      {/* Weak items */}
      {profile?.weakItems?.length > 0 && (
        <div className="mb-6">
          <p className="text-slate-400 text-xs font-bold mb-2.5">⚠️ Needs practice</p>
          <div className="flex flex-col gap-2">
            {profile.weakItems.map((it, i) => (
              <div key={i} className="rounded-xl px-4 py-3 flex items-center justify-between" style={{ background: 'linear-gradient(135deg, #101a30, #0d1728)', border: '1px solid rgba(255,255,255,0.07)' }}>
                <div>
                  <p className="text-white font-bold text-sm">{MODULE_META[it.module].icon} {itemLabel(it.module, it.itemKey)}</p>
                  <p className="text-slate-500 text-[11px] mt-0.5">{it.accuracy}% accuracy · {it.attempts} attempts</p>
                </div>
                <button onClick={() => practiceNow(it.module, it.itemKey)} className="text-xs font-bold px-3 py-1.5 rounded-lg text-white flex-shrink-0" style={{ background: `linear-gradient(135deg, ${MODULE_META[it.module].color}, ${MODULE_META[it.module].color}cc)` }}>
                  Practice
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Module tabs + heatmap */}
      <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
        {Object.entries(MODULE_META).map(([key, meta]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className="px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap"
            style={{ background: tab === key ? `${meta.color}30` : 'rgba(255,255,255,0.05)', color: tab === key ? meta.color : '#94a3b8' }}
          >
            {meta.icon} {meta.label}
          </button>
        ))}
      </div>

      {tab !== 'percent' ? (
        <HeatmapGrid
          range={RANGE_BY_MODULE[tab]}
          itemsMap={itemsMapFor(tab)}
          onCellClick={(n) => practiceNow(tab, String(n))}
        />
      ) : (
        <PercentAccuracyList itemsMap={itemsMapFor('percent')} onPractice={(key) => practiceNow('percent', key)} />
      )}

      {/* History */}
      {sessions.length > 0 && (
        <div className="mt-8">
          <p className="text-slate-400 text-xs font-bold mb-2.5">History</p>
          <div className="flex flex-col gap-2">
            {sessions.map((s) => (
              <div key={s._id} className="rounded-xl px-4 py-2.5 flex items-center justify-between" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
                <span className="text-slate-400 text-xs">{s.modules.map((m) => MODULE_META[m].icon).join(' ')} · {new Date(s.createdAt).toLocaleDateString()}</span>
                <span className="text-white font-bold text-xs">{s.accuracy}% · {s.correctCount}/{s.totalQuestions}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function MiniStat({ label, value }) {
  return (
    <div className="rounded-xl py-2.5 text-center" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
      <p className="text-white font-black text-sm">{value}</p>
      <p className="text-slate-500 text-[10px] mt-0.5">{label}</p>
    </div>
  )
}

function PercentAccuracyList({ itemsMap, onPractice }) {
  const entries = Object.values(itemsMap).sort((a, b) => (a.accuracy ?? 100) - (b.accuracy ?? 100))
  if (!entries.length) return <p className="text-slate-600 text-sm text-center py-6">No attempts yet — take a % ↔ Fraction test to see stats here.</p>
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
      {entries.map((it) => (
        <button key={it.itemKey} onClick={() => onPractice(it.itemKey)} className="rounded-lg px-3 py-2 text-left" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <p className="text-slate-300 text-sm font-semibold">{it.itemKey}</p>
          <p className="text-[11px]" style={{ color: it.accuracy >= 80 ? '#34d399' : it.accuracy >= 50 ? '#fbbf24' : '#f87171' }}>{it.accuracy}% · {it.attempts} tries</p>
        </button>
      ))}
    </div>
  )
}