// src/components/practicetest/WeaknessStrengthPanel.jsx
// "Know Your Weakness" (plan doc Section 10.2, Image 13) — Weakness/
// Strength tabs, section tabs (if the paper has more than one section),
// per-topic chip rows: topic name + "Correct: x/y" + question-number chips
// colored by status. Clicking a chip deep-links into Solutions.
//
// `topicBreakdown` shape: { [sectionName]: { weakness: [...], strength: [...] } }
// straight from utils/practiceAnalysis.js's buildTopicBreakdown.
//
// Dark/brand theme — matches the Result page it follows on from.

import { useState } from 'react'

const CHIP_STYLES = {
  correct: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25',
  wrong: 'bg-red-500/10 text-red-400 border-red-500/25',
  skipped: 'bg-amber-500/10 text-amber-400 border-amber-500/25',
  unseen: 'bg-slate-800 text-slate-400 border-slate-700',
}

function formatSec(s) {
  const total = Math.round(s || 0)
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
}

export default function WeaknessStrengthPanel({ topicBreakdown, onJumpToQuestion }) {
  const sectionNames = Object.keys(topicBreakdown)
  const [activeSection, setActiveSection] = useState(sectionNames[0])
  const [mode, setMode] = useState('weakness')

  const topics = topicBreakdown[activeSection]?.[mode] || []

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/60 overflow-hidden">
      <div className="px-4 pt-4 pb-2 flex items-center justify-between flex-wrap gap-2">
        <p className="text-sm font-bold text-white">Know Your Weakness</p>
        <div className="flex rounded-lg border border-slate-700 overflow-hidden">
          {['weakness', 'strength'].map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`px-3 py-1.5 text-xs font-bold capitalize ${mode === m ? 'bg-tapasya-orange text-white' : 'text-slate-400 hover:bg-slate-800'}`}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      {sectionNames.length > 1 && (
        <div className="flex gap-2 px-4 pb-2 overflow-x-auto">
          {sectionNames.map((name) => (
            <button
              key={name}
              onClick={() => setActiveSection(name)}
              className={`px-3 py-1 rounded-lg text-xs font-semibold whitespace-nowrap ${
                activeSection === name ? 'bg-slate-800 text-tapasya-orange' : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              {name}
            </button>
          ))}
        </div>
      )}

      <div className="px-4 pb-4 space-y-3">
        {topics.length === 0 && <p className="text-slate-500 text-xs py-4">Kuch nahi mila is tab mein.</p>}
        {topics.map((t) => (
          <div key={t.name} className="rounded-xl border border-slate-800 px-3 py-2.5">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-semibold text-slate-200">{t.name}</p>
              <p className="text-xs text-slate-400">Correct: {t.correct}/{t.total}</p>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {t.questions.map((q) => (
                <button
                  key={q.qNo}
                  onClick={() => onJumpToQuestion?.(q.qNo)}
                  title={`Q${q.qNo} · ${formatSec(q.timeSpentSec)}`}
                  className={`text-[11px] font-bold px-2 py-1 rounded-lg border ${CHIP_STYLES[q.status]}`}
                >
                  {q.qNo} · {formatSec(q.timeSpentSec)}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}