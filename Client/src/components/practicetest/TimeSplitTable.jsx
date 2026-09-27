// src/components/practicetest/TimeSplitTable.jsx
// Correct/Wrong/Skipped time totals — section-wise (Image 14) up top, then
// a section-tabbed topic-wise breakdown below (Image 15). Single file per
// plan doc Section 12's file list. Data straight from
// utils/practiceAnalysis.js's buildTimeSplit: { sectionWise, overallTotals,
// topicWiseBySection }.
//
// Dark/brand theme — matches the Result page it follows on from.

import { useState } from 'react'

function formatSec(s) {
  const total = Math.round(s || 0)
  const m = Math.floor(total / 60)
  return `${m}m ${total % 60}s`
}

function StackedBar({ correctSec, wrongSec, skippedSec }) {
  const total = correctSec + wrongSec + skippedSec || 1
  return (
    <div className="flex h-2 rounded-full overflow-hidden bg-slate-800 w-full">
      <div style={{ width: `${(correctSec / total) * 100}%` }} className="bg-emerald-500" />
      <div style={{ width: `${(wrongSec / total) * 100}%` }} className="bg-red-500" />
      <div style={{ width: `${(skippedSec / total) * 100}%` }} className="bg-amber-500" />
    </div>
  )
}

export default function TimeSplitTable({ timeSplit }) {
  const { sectionWise, overallTotals, topicWiseBySection } = timeSplit
  const sectionNames = Object.keys(topicWiseBySection)
  const [activeSection, setActiveSection] = useState(sectionNames[0])
  const topics = topicWiseBySection[activeSection] || []

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/60 overflow-hidden">
      <div className="px-4 pt-4 pb-2">
        <p className="text-sm font-bold text-white">Time Split</p>
      </div>

      <div className="px-4 pb-3 flex items-center gap-4 text-xs">
        <span className="flex items-center gap-1.5 text-emerald-400"><span className="w-2 h-2 rounded-full bg-emerald-500" /> Correct {formatSec(overallTotals.correctSec)}</span>
        <span className="flex items-center gap-1.5 text-red-400"><span className="w-2 h-2 rounded-full bg-red-500" /> Wrong {formatSec(overallTotals.wrongSec)}</span>
        <span className="flex items-center gap-1.5 text-amber-400"><span className="w-2 h-2 rounded-full bg-amber-500" /> Skipped {formatSec(overallTotals.skippedSec)}</span>
      </div>

      <div className="px-4 pb-4 space-y-3">
        {sectionWise.map((s) => (
          <div key={s.sectionName}>
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-slate-300 font-semibold">{s.sectionName}</span>
              <span className="text-slate-500">{formatSec(s.correctSec + s.wrongSec + s.skippedSec)}</span>
            </div>
            <StackedBar {...s} />
          </div>
        ))}
      </div>

      {sectionNames.length > 0 && (
        <>
          <div className="border-t border-slate-800 px-4 pt-3 pb-2">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">By Topic</p>
            {sectionNames.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-2">
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
          </div>
          <div className="px-4 pb-4 space-y-2.5">
            {topics.map((t) => (
              <div key={t.name}>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-slate-300">{t.name}</span>
                  <span className="text-slate-500">{formatSec(t.correctSec + t.wrongSec + t.skippedSec)}</span>
                </div>
                <StackedBar {...t} />
              </div>
            ))}
            {topics.length === 0 && <p className="text-slate-500 text-xs">Data nahi hai.</p>}
          </div>
        </>
      )}
    </div>
  )
}