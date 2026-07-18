// src/components/money/MoneySummaryCards.jsx
// Income / Expense / Balance cards — same MetricCard visual language as
// the study Stats page, but its own component (green/rose accents
// instead of orange, since Money is a visually separate section).

import { formatMoney } from '@/utils/money'

const ACCENTS = {
  emerald: { ring: 'ring-emerald-500/20', bg: 'bg-emerald-500/10', tc: 'text-emerald-400' },
  rose:    { ring: 'ring-rose-500/20',    bg: 'bg-rose-500/10',    tc: 'text-rose-400' },
  blue:    { ring: 'ring-blue-500/20',    bg: 'bg-blue-500/10',    tc: 'text-blue-400' },
  orange:  { ring: 'ring-orange-500/20',  bg: 'bg-orange-500/10',  tc: 'text-orange-400' },
}

export default function MoneySummaryCards({ totals }) {
  const { income, expense, balance } = totals

  const cards = [
    { label: 'Income',  value: income,  accent: 'emerald', icon: 'ti-trending-up' },
    { label: 'Expense', value: expense, accent: 'rose',    icon: 'ti-trending-down' },
    { label: 'Balance',  value: balance, accent: balance >= 0 ? 'blue' : 'orange', icon: 'ti-scale-outline' },
  ]

  return (
    <div className="grid grid-cols-3 gap-3">
      {cards.map((c) => {
        const s = ACCENTS[c.accent]
        return (
          <div
            key={c.label}
            className={`bg-gradient-to-br from-[#111827] to-[#0d1420] ring-1 ${s.ring} rounded-2xl p-3 sm:p-3.5`}
          >
            <div className={`inline-flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 rounded-lg ${s.bg} mb-1.5 sm:mb-2`}>
              <i className={`ti ${c.icon} text-sm ${s.tc}`} />
            </div>
            <p className="text-[9px] text-slate-500 mb-0.5 font-semibold tracking-[0.1em] uppercase">{c.label}</p>
            <p className={`text-sm sm:text-base font-black font-mono ${s.tc}`}>{formatMoney(c.value, true)}</p>
          </div>
        )
      })}
    </div>
  )
}