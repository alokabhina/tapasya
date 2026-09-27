// src/components/practicetest/OnScreenCalculator.jsx
// Simple 4-function calculator — a floating panel toggled by TestHeader's
// calculator icon, visible only in sections with hasCalculator: true (plan
// doc Section 7.1, Image 7). No external lib — this is deliberately basic,
// matching what real exam calculators offer.
//
// Light theme — matches the rest of the live engine.

import { useState } from 'react'

const BUTTONS = [
  ['C', '←', '%', '÷'],
  ['7', '8', '9', '×'],
  ['4', '5', '6', '-'],
  ['1', '2', '3', '+'],
  ['0', '.', '=', ''],
]

export default function OnScreenCalculator({ onClose }) {
  const [expr, setExpr] = useState('')
  const [result, setResult] = useState('')

  function press(btn) {
    if (btn === '') return
    if (btn === 'C') { setExpr(''); setResult(''); return }
    if (btn === '←') { setExpr((e) => e.slice(0, -1)); return }
    if (btn === '=') {
      try {
        // Only digits/operators ever reach here — safe to evaluate.
        const safe = expr.replace(/×/g, '*').replace(/÷/g, '/').replace(/%/g, '/100')
        if (!/^[0-9+\-*/.() ]+$/.test(safe)) throw new Error('invalid')
        // eslint-disable-next-line no-new-func
        const value = Function(`"use strict"; return (${safe})`)()
        setResult(Number.isFinite(value) ? String(+value.toFixed(6)) : 'Error')
      } catch {
        setResult('Error')
      }
      return
    }
    setExpr((e) => e + btn)
  }

  return (
    <div className="fixed bottom-20 right-3 sm:right-6 z-[90] w-64 rounded-2xl border border-slate-200 bg-white shadow-2xl overflow-hidden animate-fade-in-up">
      <div className="flex items-center justify-between px-3 py-2 bg-slate-50 border-b border-slate-200">
        <span className="text-xs font-bold text-slate-600 flex items-center gap-1.5">
          <i className="ti ti-calculator" /> Calculator
        </span>
        <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
          <i className="ti ti-x text-sm" />
        </button>
      </div>

      <div className="px-3 py-3 text-right">
        <p className="text-xs text-slate-400 h-4 truncate">{expr || '0'}</p>
        <p className="text-xl font-bold text-slate-800 truncate">{result || expr || '0'}</p>
      </div>

      <div className="grid grid-cols-4 gap-1.5 px-3 pb-3">
        {BUTTONS.flat().map((b, i) => b === '' ? <span key={i} /> : (
          <button
            key={i}
            onClick={() => press(b)}
            className={`h-9 rounded-lg text-sm font-semibold transition-colors ${
              b === '=' ? 'bg-tapasya-orange text-white hover:bg-tapasya-orange-dark' :
              ['÷', '×', '-', '+', '%'].includes(b) ? 'bg-slate-100 text-tapasya-orange hover:bg-slate-200' :
              b === 'C' || b === '←' ? 'bg-slate-100 text-red-500 hover:bg-slate-200' :
              'bg-slate-50 text-slate-700 hover:bg-slate-100'
            }`}
          >
            {b}
          </button>
        ))}
      </div>
    </div>
  )
}