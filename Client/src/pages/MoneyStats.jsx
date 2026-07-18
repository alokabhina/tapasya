// src/pages/MoneyStats.jsx
// Dedicated stats page for the Money module — category breakdown + income
// vs expense trend, Week/Month/All Time period tabs. Completely separate
// from src/pages/Stats.jsx (study stats): different hook (useMoney, not
// useStats), different data (Transaction, not Session), different route.
// Money never appears on the study Stats page, and vice versa.
//
// Keeps the plain income/expense/balance 3-card breakdown (MoneySummaryCards)
// that Money.jsx moved away from — that framing (raw totals, not "budget
// remaining") is exactly what's useful here for pure analysis.

import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useMoney } from '@/hooks/useMoney'
import { aggregateByCategory, aggregateTrend } from '@/utils/money'
import { getDateString, getSundayWeekRange, getMonthStart, getStudyDayString } from '@/utils/time'
import MoneySummaryCards from '@/components/money/MoneySummaryCards'
import MoneyCategoryChart from '@/components/money/MoneyCategoryChart'
import MoneyTrendChart from '@/components/money/MoneyTrendChart'

const TABS = ['Week', 'Month', 'All Time']

function computeRange(tab) {
  const today = getStudyDayString()
  if (tab === 'Week') {
    const { start, end } = getSundayWeekRange(new Date())
    return { startDate: getDateString(start), endDate: getDateString(end) }
  }
  if (tab === 'Month') {
    return { startDate: getDateString(getMonthStart()), endDate: today }
  }
  return { startDate: '2020-01-01', endDate: today } // All Time
}

export default function MoneyStats() {
  const [tab, setTab] = useState('Month')
  const range = useMemo(() => computeRange(tab), [tab])

  const { transactions, loading, totals } = useMoney(range)

  const [chartTab, setChartTab] = useState('expense')
  const expenseByCategory = useMemo(() => aggregateByCategory(transactions, 'expense'), [transactions])
  const incomeByCategory  = useMemo(() => aggregateByCategory(transactions, 'income'), [transactions])
  const trend = useMemo(
    () => aggregateTrend(transactions, range.startDate, range.endDate),
    [transactions, range]
  )

  return (
    <div className="min-h-screen bg-[#07090f] text-white pb-28" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      <div className="max-w-3xl mx-auto px-4 sm:px-5">
        {/* Header */}
        <div className="pt-6 sm:pt-7 pb-5 flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] text-slate-600 uppercase tracking-[0.2em] font-semibold mb-1">Breakdown</p>
            <h1
              className="text-xl sm:text-2xl font-bold text-white tracking-tight"
              style={{ fontFamily: "'Sora', sans-serif", letterSpacing: '-0.03em' }}
            >
              Money Stats
            </h1>
          </div>
          <Link
            to="/money"
            className="mt-1 flex items-center gap-1.5 bg-slate-800/60 border border-slate-700/60 rounded-full px-3 py-1.5 text-slate-300 text-xs font-semibold shrink-0"
          >
            <i className="ti ti-arrow-left text-sm" /> Back
          </Link>
        </div>

        {/* Period tabs */}
        <div className="mb-5">
          <div className="flex p-1 bg-slate-800/60 rounded-xl w-fit">
            {TABS.map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-3 sm:px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  tab === t ? 'bg-emerald-500/20 text-emerald-300' : 'text-slate-500'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* Summary cards */}
        <div className="mb-5">
          <MoneySummaryCards totals={totals} />
        </div>

        {/* Trend chart */}
        <div className="mb-5">
          <div className="bg-[#0d1420] border border-slate-800/70 rounded-2xl p-3.5 sm:p-4">
            <div className="flex items-center gap-2 mb-3">
              <i className="ti ti-chart-bar text-emerald-400 text-base" />
              <span className="text-[13px] font-semibold text-slate-300">Income vs Expense</span>
            </div>
            {loading ? (
              <p className="text-slate-600 text-sm text-center py-10">Loading...</p>
            ) : (
              <MoneyTrendChart data={trend} />
            )}
          </div>
        </div>

        {/* Category breakdown */}
        <div className="mb-5">
          <div className="bg-[#0d1420] border border-slate-800/70 rounded-2xl p-3.5 sm:p-4">
            <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                <i className="ti ti-chart-donut-3 text-emerald-400 text-base" />
                <span className="text-[13px] font-semibold text-slate-300">By Category</span>
              </div>
              <div className="flex p-1 bg-slate-800/60 rounded-xl">
                {['expense', 'income'].map((t) => (
                  <button
                    key={t}
                    onClick={() => setChartTab(t)}
                    className={`px-3 py-1 rounded-lg text-[11px] font-semibold capitalize transition-colors ${
                      chartTab === t ? 'bg-emerald-500/20 text-emerald-300' : 'text-slate-500'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
            {loading ? (
              <p className="text-slate-600 text-sm text-center py-10">Loading...</p>
            ) : (
              <MoneyCategoryChart data={chartTab === 'expense' ? expenseByCategory : incomeByCategory} />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}