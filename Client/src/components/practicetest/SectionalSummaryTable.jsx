// src/components/practicetest/SectionalSummaryTable.jsx
// Per-section table + grand total row (plan doc Section 10.1). Data comes
// straight from utils/practiceAnalysis.js's buildSectionalSummary — { rows:
// [...], total: {...} }, no reshaping needed here.
//
// Round-3: added the reference design's Table View / Visual View toggle —
// Visual View trades the table for a per-section accuracy bar, quicker to
// scan than the numbers when there are many sections.
//
// Dark/brand theme — matches the Result page it follows on from.

import { useState } from 'react'

export default function SectionalSummaryTable({ sectionalSummary }) {
  const { rows, total } = sectionalSummary
  const [view, setView] = useState('table')

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/60 overflow-hidden">
      <div className="px-4 pt-4 pb-3 flex items-start justify-between flex-wrap gap-2">
        <div className="flex items-start gap-2">
          <i className="ti ti-chart-bar text-tapasya-orange text-lg mt-0.5" />
          <div>
            <p className="text-sm font-bold text-white">Sectional Summary</p>
            <p className="text-slate-500 text-[11px]">Detailed performance of each section</p>
          </div>
        </div>
        <div className="flex rounded-lg border border-slate-700 overflow-hidden shrink-0">
          {[{ id: 'table', label: 'Table View', icon: 'ti-table' }, { id: 'visual', label: 'Visual View', icon: 'ti-chart-line' }].map((v) => (
            <button
              key={v.id}
              onClick={() => setView(v.id)}
              className={`px-2.5 py-1.5 text-[11px] font-bold flex items-center gap-1 ${
                view === v.id ? 'bg-tapasya-orange text-white' : 'text-slate-400 hover:bg-slate-800'
              }`}
            >
              <i className={`ti ${v.icon}`} /> {v.label}
            </button>
          ))}
        </div>
      </div>

      {view === 'table' ? (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-slate-400 border-b border-slate-800 bg-slate-800/40">
                <th className="text-left font-semibold px-4 py-2">Section</th>
                <th className="text-right font-semibold px-2 py-2">Attempted</th>
                <th className="text-right font-semibold px-2 py-2">Correct</th>
                <th className="text-right font-semibold px-2 py-2">Incorrect</th>
                <th className="text-right font-semibold px-2 py-2">Skipped</th>
                <th className="text-right font-semibold px-2 py-2">Unseen</th>
                <th className="text-right font-semibold px-2 py-2">Accuracy</th>
                <th className="text-right font-semibold px-2 py-2">Score</th>
                <th className="text-right font-semibold px-4 py-2">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {rows.map((r) => (
                <tr key={r.sectionName}>
                  <td className="px-4 py-2.5 text-slate-200 font-medium">
                    {r.sectionName}
                    {r.cutoff != null && <span className="text-slate-500 font-normal"> (cutoff {r.cutoff})</span>}
                  </td>
                  <td className="px-2 py-2.5 text-right text-slate-300">{r.attempted}/{r.totalQuestions}</td>
                  <td className="px-2 py-2.5 text-right text-emerald-400">{r.correct}</td>
                  <td className="px-2 py-2.5 text-right text-red-400">{r.incorrect}</td>
                  <td className="px-2 py-2.5 text-right text-amber-400">{r.skipped}</td>
                  <td className="px-2 py-2.5 text-right text-slate-500">{r.unseen}</td>
                  <td className="px-2 py-2.5 text-right text-slate-300">{r.accuracy}%</td>
                  <td className="px-2 py-2.5 text-right text-tapasya-orange font-bold">{r.score}</td>
                  <td className="px-4 py-2.5 text-right text-slate-400">{Math.round(r.timeTakenSec / 60)}m</td>
                </tr>
              ))}
              <tr className="bg-slate-800/40 font-bold">
                <td className="px-4 py-2.5 text-white">Total</td>
                <td className="px-2 py-2.5 text-right text-slate-200">{total.attempted}/{total.totalQuestions}</td>
                <td className="px-2 py-2.5 text-right text-emerald-400">{total.correct}</td>
                <td className="px-2 py-2.5 text-right text-red-400">{total.incorrect}</td>
                <td className="px-2 py-2.5 text-right text-amber-400">{total.skipped}</td>
                <td className="px-2 py-2.5 text-right text-slate-400">{total.unseen}</td>
                <td className="px-2 py-2.5 text-right text-slate-200">{total.accuracy}%</td>
                <td className="px-2 py-2.5 text-right text-tapasya-orange">{total.score}</td>
                <td className="px-4 py-2.5 text-right text-slate-300">{Math.round(total.timeTakenSec / 60)}m</td>
              </tr>
            </tbody>
          </table>
        </div>
      ) : (
        <div className="px-4 pb-4 space-y-3">
          {rows.map((r) => (
            <div key={r.sectionName}>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-slate-200 font-semibold">{r.sectionName}</span>
                <span className="text-slate-400">{r.accuracy}% · Score {r.score}</span>
              </div>
              <div className="h-2.5 rounded-full bg-slate-800 overflow-hidden">
                <div className="h-full bg-tapasya-orange rounded-full" style={{ width: `${Math.min(100, Math.max(0, r.accuracy))}%` }} />
              </div>
            </div>
          ))}
          <div className="pt-1 border-t border-slate-800">
            <div className="flex items-center justify-between text-xs mb-1 mt-2">
              <span className="text-white font-bold">Total</span>
              <span className="text-slate-300">{total.accuracy}% · Score {total.score}</span>
            </div>
            <div className="h-2.5 rounded-full bg-slate-800 overflow-hidden">
              <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${Math.min(100, Math.max(0, total.accuracy))}%` }} />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}