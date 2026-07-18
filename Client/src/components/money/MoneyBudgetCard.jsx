// src/components/money/MoneyBudgetCard.jsx
//
// Real life for a student isn't "log income and expense every day" — it's
// "I got ₹X pocket money this month, how much is left". This card is that:
// one number (remaining), a progress bar against the month's total income,
// and a quick way to set/top-up that income. It replaces the generic
// 3-card income/expense/balance grid as the PRIMARY thing on the Money
// page (that grid still exists on MoneyStats for pure analysis).

import { useState } from 'react'
import { formatMoney } from '@/utils/money'

export default function MoneyBudgetCard({ income, spent, onAddIncome }) {
  const [adding, setAdding] = useState(false)
  const [amount, setAmount] = useState('')
  const [saving, setSaving] = useState(false)

  const remaining   = income - spent
  const overBudget  = remaining < 0
  const pct         = income > 0 ? Math.min(100, Math.round((spent / income) * 100)) : 0

  async function submitIncome() {
    const n = Number(amount)
    if (!n || n <= 0 || saving) return
    setSaving(true)
    try {
      await onAddIncome(n)
      setAmount('')
      setAdding(false)
    } finally {
      setSaving(false)
    }
  }

  // ── Inline "set/top-up income" input — same card, expands in place
  //    instead of opening a whole separate modal, since it's just one field.
  if (adding) {
    return (
      <div className="bg-[#0d1420] border border-emerald-500/30 rounded-2xl p-4">
        <p className="text-xs text-slate-500 mb-2 font-semibold">
          {income > 0 ? 'Add more to this month' : "This month's pocket money"}
        </p>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 bg-slate-800/60 border border-slate-700/60 rounded-xl px-3 py-2.5 flex-1 min-w-0">
            <span className="text-slate-400 font-semibold shrink-0">₹</span>
            <input
              autoFocus
              type="number"
              inputMode="decimal"
              min="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') submitIncome() }}
              placeholder="0"
              className="flex-1 min-w-0 bg-transparent outline-none text-white text-lg font-semibold"
            />
          </div>
          <button
            onClick={submitIncome}
            disabled={!amount || Number(amount) <= 0 || saving}
            className="bg-emerald-500 text-white text-sm font-semibold px-4 py-2.5 rounded-xl hover:bg-emerald-400 disabled:opacity-40 shrink-0"
          >
            {saving ? '...' : 'Save'}
          </button>
          <button
            onClick={() => { setAdding(false); setAmount('') }}
            className="text-slate-500 hover:text-slate-300 text-sm px-1.5 shrink-0"
          >
            ✕
          </button>
        </div>
      </div>
    )
  }

  // ── No income logged yet this month — onboarding prompt
  if (income <= 0) {
    return (
      <div className="bg-gradient-to-br from-emerald-500/10 to-[#0d1420] border border-emerald-500/25 rounded-2xl p-5 text-center">
        <i className="ti ti-pig text-3xl text-emerald-400 mb-2 block" />
        <p className="text-sm font-semibold text-slate-200 mb-1">Set this month's pocket money</p>
        <p className="text-xs text-slate-500 mb-4">Track expenses against your monthly budget</p>
        <button
          onClick={() => setAdding(true)}
          className="bg-emerald-500 text-white text-sm font-semibold px-5 py-2.5 rounded-xl hover:bg-emerald-400"
        >
          + Set Pocket Money
        </button>
      </div>
    )
  }

  // ── Normal state — budget progress
  return (
    <div
      className={`bg-gradient-to-br from-[#111827] to-[#0d1420] border rounded-2xl p-4 sm:p-5 ${
        overBudget ? 'border-rose-500/30' : 'border-emerald-500/20'
      }`}
    >
      <div className="flex items-start justify-between mb-1 gap-2">
        <p className="text-[11px] text-slate-500 uppercase tracking-wider font-semibold">
          {overBudget ? 'Over budget by' : 'Remaining this month'}
        </p>
        <button
          onClick={() => setAdding(true)}
          className="text-emerald-400 hover:text-emerald-300 text-[11px] font-semibold flex items-center gap-1 shrink-0"
        >
          <i className="ti ti-plus text-xs" /> Add income
        </button>
      </div>

      <p className={`text-2xl sm:text-3xl font-black font-mono mb-3 ${overBudget ? 'text-rose-400' : 'text-emerald-400'}`}>
        {formatMoney(Math.abs(remaining))}
      </p>

      <div className="h-2 rounded-full bg-slate-800 overflow-hidden mb-3">
        <div
          className={`h-full rounded-full transition-all duration-300 ${
            overBudget ? 'bg-rose-500' : pct > 70 ? 'bg-amber-500' : 'bg-emerald-500'
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>

      <div className="flex items-center justify-between text-xs">
        <span className="text-slate-500">
          Spent <span className="text-slate-300 font-semibold font-mono">{formatMoney(spent)}</span>
        </span>
        <span className="text-slate-500">
          of <span className="text-slate-300 font-semibold font-mono">{formatMoney(income)}</span>
        </span>
      </div>
    </div>
  )
}