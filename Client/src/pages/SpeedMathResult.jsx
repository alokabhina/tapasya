// src/pages/SpeedMathResult.jsx
// Result screen — score, accuracy, avg speed, and item-level weak-area
// suggestions ("Table of 23 — 6/10 wrong, revise it" / "speed up on 17²").

import { useNavigate } from 'react-router-dom'
import useSpeedMathStore from '@/store/speedMathStore'
import { MODULE_META, generateFocusedQuizSet } from '@/utils/speedMathGenerator'

function itemLabel(module, itemKey) {
  if (module === 'table')   return `Table of ${itemKey}`
  if (module === 'square')  return `${itemKey}²`
  if (module === 'cube')    return `${itemKey}³`
  if (module === 'percent') return `${itemKey}`
  return itemKey
}

export default function SpeedMathResult() {
  const navigate = useNavigate()
  const { breakdown, lastResult, modules, config, startTest, resetTest } = useSpeedMathStore()

  if (!breakdown.length) {
    navigate('/speedmath')
    return null
  }

  const total = breakdown.length
  const correct = breakdown.filter((b) => b.isCorrect).length
  const wrong = total - correct
  const accuracy = lastResult?.accuracy ?? Math.round((correct / total) * 100)
  const avgTimeMs = lastResult?.avgTimeMs ?? Math.round(breakdown.reduce((s, b) => s + b.timeTakenMs, 0) / total)
  const suggestions = lastResult?.suggestions || []

  const grade = accuracy >= 90 ? { l: 'S', c: '#fbbf24' } : accuracy >= 75 ? { l: 'A', c: '#34d399' } : accuracy >= 60 ? { l: 'B', c: '#60a5fa' } : accuracy >= 40 ? { l: 'C', c: '#f97316' } : { l: 'D', c: '#f87171' }

  const practiceNow = (module, itemKey) => {
    const focusedQuestions = generateFocusedQuizSet(module, itemKey, { count: 6, timeLimit: config?.timePerQuestion || 5, tier: config?.percentTier || 'basic' })
    startTest([module], config, focusedQuestions)
    navigate('/speedmath/play')
  }

  const playAgain = () => {
    resetTest()
    navigate(modules.length > 1 ? '/speedmath/config/mix' : `/speedmath/config/${modules[0]}`)
  }

  return (
    <div className="min-h-screen px-4 py-8 flex flex-col items-center" style={{ background: 'radial-gradient(ellipse 70% 50% at 50% 0%, rgba(34,211,238,0.07) 0%, #080d1a 60%)' }}>
      {/* Grade */}
      <div className="w-20 h-20 rounded-3xl flex items-center justify-center text-3xl font-black mb-4" style={{ background: `${grade.c}18`, color: grade.c, border: `2px solid ${grade.c}55` }}>
        {grade.l}
      </div>

      <h1 className="text-2xl font-black text-white mb-1">{accuracy}% Accuracy</h1>
      <p className="text-slate-400 text-sm mb-6">{correct}/{total} correct · avg {(avgTimeMs / 1000).toFixed(1)}s per question</p>

      {/* Stat row */}
      <div className="flex gap-3 mb-6 w-full max-w-md">
        <StatBox label="Correct" value={correct} color="#34d399" />
        <StatBox label="Wrong" value={wrong} color="#f87171" />
        {lastResult?.currentStreak != null && <StatBox label="Streak" value={`${lastResult.currentStreak}d`} color="#fbbf24" />}
      </div>

      {/* Weak-item suggestions */}
      {suggestions.length > 0 && (
        <div className="w-full max-w-md mb-6">
          <p className="text-slate-400 text-xs font-bold mb-2.5">💡 Suggestions to improve</p>
          <div className="flex flex-col gap-2">
            {suggestions.map((s, i) => {
              const meta = MODULE_META[s.module]
              const slow = s.avgTimeMs > 4000
              return (
                <div key={i} className="rounded-xl px-4 py-3 flex items-center justify-between" style={{ background: 'linear-gradient(135deg, #101a30, #0d1728)', border: '1px solid rgba(255,255,255,0.07)' }}>
                  <div>
                    <p className="text-white font-bold text-sm">{meta.icon} {itemLabel(s.module, s.itemKey)}</p>
                    <p className="text-slate-500 text-[11px] mt-0.5">
                      {s.wrong}/{s.total} wrong{slow ? ` · slow (${(s.avgTimeMs / 1000).toFixed(1)}s avg)` : ''}
                    </p>
                  </div>
                  <button
                    onClick={() => practiceNow(s.module, s.itemKey)}
                    className="text-xs font-bold px-3 py-1.5 rounded-lg text-white flex-shrink-0"
                    style={{ background: `linear-gradient(135deg, ${meta.color}, ${meta.color}cc)` }}
                  >
                    Practice
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="w-full max-w-md flex flex-col gap-2.5">
        <button onClick={playAgain} className="w-full py-3 rounded-2xl font-black text-white text-sm" style={{ background: 'linear-gradient(135deg, #0891b2, #4f46e5)' }}>
          Play Again
        </button>
        <button onClick={() => navigate('/speedmath/stats')} className="w-full py-3 rounded-2xl font-bold text-sm" style={{ background: 'rgba(255,255,255,0.05)', color: '#94a3b8' }}>
          View Full Stats
        </button>
        <button onClick={() => { resetTest(); navigate('/speedmath') }} className="w-full py-2 text-xs font-semibold text-slate-500">
          Back to Speed Math Home
        </button>
      </div>
    </div>
  )
}

function StatBox({ label, value, color }) {
  return (
    <div className="flex-1 rounded-xl py-3 text-center" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
      <p className="font-black text-lg" style={{ color }}>{value}</p>
      <p className="text-slate-500 text-[10px] mt-0.5">{label}</p>
    </div>
  )
}