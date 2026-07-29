// src/pages/SpeedMathConfig.jsx
// Configuration screen before a test: pick module(s), range/tier, question
// count, and time-per-question (default 5s, user-editable).

import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { MODULE_META, generateQuizSet } from '@/utils/speedMathGenerator'
import RangeSlider from '@/components/speedmath/RangeSlider'
import useSpeedMathStore from '@/store/speedMathStore'

const ALL_MODULES = ['table', 'square', 'cube', 'percent']
const Q_COUNT_OPTIONS = [5, 10, 15, 20]

export default function SpeedMathConfig() {
  const navigate = useNavigate()
  const { module: routeModule } = useParams() // one of ALL_MODULES, or 'mix'
  const isMix = routeModule === 'mix'

  const [selected, setSelected] = useState(isMix ? [...ALL_MODULES] : [routeModule])
  const [tableRange, setTableRange]   = useState(MODULE_META.table.defaultRange)
  const [squareRange, setSquareRange] = useState(MODULE_META.square.defaultRange)
  const [cubeRange, setCubeRange]     = useState(MODULE_META.cube.defaultRange)
  const [percentTier, setPercentTier] = useState('basic')
  const [questionCount, setQuestionCount] = useState(10)
  const [timePerQuestion, setTimePerQuestion] = useState(5)

  const startTest    = useSpeedMathStore((s) => s.startTest)

  const toggleModule = (m) => {
    setSelected((prev) => prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m])
  }

  const handleStart = () => {
    if (selected.length === 0) return
    const config = { tableRange, squareRange, cubeRange, percentTier, questionCount, timePerQuestion }
    const questions = generateQuizSet(selected, config)
    startTest(selected, config, questions)
    navigate('/speedmath/play')
  }

  return (
    <div className="min-h-screen px-4 py-6 md:px-8 pb-24" style={{ background: '#080d1a' }}>
      <button onClick={() => navigate('/speedmath')} className="flex items-center gap-1.5 text-slate-500 hover:text-slate-300 text-xs font-semibold mb-4">
        ← Back
      </button>

      <h1 className="text-xl font-black text-white mb-1">
        {isMix ? '🎲 Mix Test Setup' : `${MODULE_META[routeModule].icon} ${MODULE_META[routeModule].label} Test Setup`}
      </h1>
      <p className="text-slate-500 text-xs mb-5">Configure range, question count & timer</p>

      {/* ── Module selection (mix mode only) ─────────────────────────────── */}
      {isMix && (
        <div className="mb-5">
          <p className="text-xs font-semibold text-slate-500 mb-2">Include topics</p>
          <div className="grid grid-cols-2 gap-2">
            {ALL_MODULES.map((m) => (
              <button
                key={m}
                onClick={() => toggleModule(m)}
                className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-bold"
                style={{
                  background: selected.includes(m) ? `${MODULE_META[m].color}22` : 'rgba(255,255,255,0.04)',
                  border: `1px solid ${selected.includes(m) ? MODULE_META[m].color + '55' : 'rgba(255,255,255,0.06)'}`,
                  color: selected.includes(m) ? MODULE_META[m].color : '#64748b',
                }}
              >
                {MODULE_META[m].icon} {MODULE_META[m].label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Per-module range / tier pickers ─────────────────────────────── */}
      <div className="flex flex-col gap-4 mb-5">
        {selected.includes('table') && (
          <Card title={`✖️ Tables (${MODULE_META.table.defaultRange[0]}–${MODULE_META.table.defaultRange[1]})`}>
            <RangeSlider min={12} max={30} value={tableRange} onChange={setTableRange} accent={MODULE_META.table.color} />
          </Card>
        )}
        {selected.includes('square') && (
          <Card title="🟦 Squares">
            <RangeSlider min={2} max={30} value={squareRange} onChange={setSquareRange} accent={MODULE_META.square.color} />
          </Card>
        )}
        {selected.includes('cube') && (
          <Card title="🟪 Cubes">
            <RangeSlider min={1} max={20} value={cubeRange} onChange={setCubeRange} accent={MODULE_META.cube.color} />
          </Card>
        )}
        {selected.includes('percent') && (
          <Card title="➗ % ↔ Fraction difficulty">
            <div className="flex gap-2">
              {['basic', 'advanced'].map((t) => (
                <button
                  key={t}
                  onClick={() => setPercentTier(t)}
                  className="flex-1 py-2 rounded-lg text-xs font-bold capitalize"
                  style={{
                    background: percentTier === t ? `${MODULE_META.percent.color}30` : 'rgba(255,255,255,0.05)',
                    color: percentTier === t ? MODULE_META.percent.color : '#94a3b8',
                  }}
                >
                  {t === 'basic' ? 'Basic (½, ⅓, ¼, ⅕, ⅛, 1/10)' : 'Advanced (up to 1/20)'}
                </button>
              ))}
            </div>
          </Card>
        )}
      </div>

      {/* ── Question count ───────────────────────────────────────────────── */}
      <Card title="No. of questions">
        <div className="flex gap-2">
          {Q_COUNT_OPTIONS.map((n) => (
            <button
              key={n}
              onClick={() => setQuestionCount(n)}
              className="flex-1 py-2 rounded-lg text-sm font-black"
              style={{ background: questionCount === n ? 'linear-gradient(135deg,#22d3ee,#6366f1)' : 'rgba(255,255,255,0.05)', color: questionCount === n ? '#fff' : '#94a3b8' }}
            >
              {n}
            </button>
          ))}
          <input
            type="number"
            min={3}
            max={50}
            value={questionCount}
            onChange={(e) => setQuestionCount(Math.max(3, Math.min(50, Number(e.target.value) || 10)))}
            className="w-16 text-center rounded-lg bg-white/5 text-white text-sm font-bold border border-white/10"
          />
        </div>
      </Card>

      {/* ── Time per question ─────────────────────────────────────────────── */}
      <Card title="Time per question (default 5s, editable)">
        <div className="flex items-center gap-3">
          <input
            type="range"
            min={3}
            max={30}
            value={timePerQuestion}
            onChange={(e) => setTimePerQuestion(Number(e.target.value))}
            className="flex-1"
          />
          <span className="w-14 text-center font-black text-white text-sm">{timePerQuestion}s</span>
        </div>
      </Card>

      {/* ── Start ─────────────────────────────────────────────────────────── */}
      <button
        onClick={handleStart}
        disabled={selected.length === 0}
        className="w-full mt-6 py-3.5 rounded-2xl font-black text-white text-base disabled:opacity-40"
        style={{ background: 'linear-gradient(135deg, #0891b2, #4f46e5)', boxShadow: '0 8px 28px rgba(79,70,229,0.35)' }}
      >
        Start Test →
      </button>
    </div>
  )
}

function Card({ title, children }) {
  return (
    <div className="rounded-2xl p-4 mb-3" style={{ background: 'linear-gradient(135deg, #101a30, #0d1728)', border: '1px solid rgba(255,255,255,0.07)' }}>
      <p className="text-xs font-semibold text-slate-400 mb-2.5">{title}</p>
      {children}
    </div>
  )
}