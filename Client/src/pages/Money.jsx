// src/pages/Money.jsx
// Add + track income/expense for the current month. Category & period-wise
// breakdowns live on the separate /money/stats page (MoneyStats.jsx) — this
// page is just "what did I spend/earn, add a new entry". Fully independent
// from the study Stats page/useStats hook — no shared state, no shared data.

import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useMoney } from '@/hooks/useMoney'
import { groupByDate, getTotals, formatMoney } from '@/utils/money'
import { getMonthStart, getDateString, getStudyDayString } from '@/utils/time'
import MoneySummaryCards from '@/components/money/MoneySummaryCards'
import TransactionItem from '@/components/money/TransactionItem'
import TransactionForm from '@/components/money/TransactionForm'

function formatDayLabel(dateStr) {
  const today = getStudyDayString()
  const y = new Date()
  y.setDate(y.getDate() - 1)
  const yesterday = getDateString(y)
  if (dateStr === today) return 'Today'
  if (dateStr === yesterday) return 'Yesterday'
  const d = new Date(dateStr + 'T12:00:00')
  return d.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short' })
}

function dayNetLabel(txns) {
  const { income, expense } = getTotals(txns)
  const net = income - expense
  return `${net >= 0 ? '+' : '-'}${formatMoney(Math.abs(net))}`
}

export default function Money() {
  const period = useMemo(() => ({
    startDate: getDateString(getMonthStart()),
    endDate: getStudyDayString(),
  }), [])

  const {
    transactions, loading, totals,
    expenseCategories, incomeCategories,
    create, edit, remove,
  } = useMoney(period)

  const [filter, setFilter] = useState('all') // all | income | expense
  const [formOpen, setFormOpen] = useState(false)
  const [editingTxn, setEditingTxn] = useState(null)

  const filtered = filter === 'all' ? transactions : transactions.filter((t) => t.type === filter)
  const grouped = groupByDate(filtered)

  function openAdd() { setEditingTxn(null); setFormOpen(true) }
  function openEdit(txn) { setEditingTxn(txn); setFormOpen(true) }

  async function handleSave(payload) {
    if (editingTxn) await edit(editingTxn._id, payload)
    else await create(payload)
    setFormOpen(false)
  }

  async function handleDelete(id) {
    if (!window.confirm('Delete this transaction?')) return
    await remove(id)
  }

  return (
    <div className="min-h-screen bg-[#07090f] text-white pb-28" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      {/* Header */}
      <div className="px-5 pt-7 pb-5 flex items-start justify-between">
        <div>
          <p className="text-[11px] text-slate-600 uppercase tracking-[0.2em] font-semibold mb-1">This month</p>
          <h1
            className="text-2xl font-bold text-white tracking-tight"
            style={{ fontFamily: "'Sora', sans-serif", letterSpacing: '-0.03em' }}
          >
            Money
          </h1>
        </div>
        <Link
          to="/money/stats"
          className="mt-1 flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/25 rounded-full px-3 py-1.5 text-emerald-300 text-xs font-semibold"
        >
          <i className="ti ti-chart-donut-3 text-sm" /> Stats
        </Link>
      </div>

      {/* Summary cards — always reflect the full month, regardless of the list filter below */}
      <div className="px-5 mb-5">
        <MoneySummaryCards totals={totals} />
      </div>

      {/* Filter tabs + Add button */}
      <div className="px-5 mb-3 flex items-center justify-between gap-2">
        <div className="flex p-1 bg-slate-800/60 rounded-xl w-fit">
          {['all', 'expense', 'income'].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold capitalize transition-colors ${
                filter === f ? 'bg-emerald-500/20 text-emerald-300' : 'text-slate-500'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-1.5 bg-emerald-500 text-white text-xs font-semibold px-3.5 py-2 rounded-xl hover:bg-emerald-400 shrink-0"
        >
          <i className="ti ti-plus text-sm" /> Add
        </button>
      </div>

      {/* List */}
      <div className="px-5">
        {loading ? (
          <p className="text-slate-600 text-sm text-center py-10">Loading...</p>
        ) : grouped.length === 0 ? (
          <div className="text-center py-16">
            <i className="ti ti-wallet-off text-4xl text-slate-700 mb-3 block" />
            <p className="text-slate-500 text-sm">No transactions yet this month</p>
          </div>
        ) : (
          grouped.map(([date, txns]) => (
            <div key={date} className="mb-4">
              <div className="flex items-center justify-between mb-1.5">
                <p className="text-xs font-semibold text-slate-500">{formatDayLabel(date)}</p>
                <p className="text-xs text-slate-600 font-mono">{dayNetLabel(txns)}</p>
              </div>
              <div className="bg-[#0d1420] border border-slate-800/70 rounded-2xl px-3">
                {txns.map((t) => (
                  <TransactionItem key={t._id} txn={t} onEdit={openEdit} onDelete={handleDelete} />
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      {formOpen && (
        <TransactionForm
          initial={editingTxn}
          expenseCategories={expenseCategories}
          incomeCategories={incomeCategories}
          onClose={() => setFormOpen(false)}
          onSave={handleSave}
        />
      )}
    </div>
  )
}