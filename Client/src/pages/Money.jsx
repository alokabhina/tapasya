// src/pages/Money.jsx
// Add + track expenses against this month's pocket money. Category &
// period-wise breakdowns live on the separate /money/stats page
// (MoneyStats.jsx) — this page is "how much do I have left, let me log
// what I just spent". Fully independent from the study Stats page/
// useStats hook — no shared state, no shared data.
//
// [REDESIGN] This used to treat income and expense as two equally-common,
// generic entry types with a 3-card income/expense/balance grid up top.
// That's not how money actually works for a student — there's usually ONE
// income event a month (pocket money), and then a stream of small
// expenses against it. The page is now budget-first (MoneyBudgetCard:
// "₹X left of ₹Y this month") with expense-logging as the primary action
// — quick-add presets for repeat purchases, "+ Add" for everything else.
// Income is still just a Transaction under the hood (type: 'income'), so
// nothing about the data model or MoneyStats changed — only this page's
// framing of it.

import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useMoney } from '@/hooks/useMoney'
import { groupByDate, getTotals, formatMoney } from '@/utils/money'
import { getMonthStart, getDateString, getStudyDayString, getYesterdayString } from '@/utils/time'
import MoneyBudgetCard from '@/components/money/MoneyBudgetCard'
import QuickAddRow from '@/components/money/QuickAddRow'
import TransactionItem from '@/components/money/TransactionItem'
import TransactionForm from '@/components/money/TransactionForm'

function formatDayLabel(dateStr) {
  const today = getStudyDayString()
  const yesterday = getYesterdayString()
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
    quickExpenses, quickAdd, savePreset, removePreset,
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

  async function handleAddIncome(amount) {
    await create({ type: 'income', amount, category: 'Pocket Money', note: '', date: getStudyDayString() })
  }

  return (
    <div className="min-h-screen bg-[#07090f] text-white pb-28" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      <div className="max-w-3xl mx-auto px-4 sm:px-5">
        {/* Header */}
        <div className="pt-6 sm:pt-7 pb-5 flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] text-slate-600 uppercase tracking-[0.2em] font-semibold mb-1">This month</p>
            <h1
              className="text-xl sm:text-2xl font-bold text-white tracking-tight"
              style={{ fontFamily: "'Sora', sans-serif", letterSpacing: '-0.03em' }}
            >
              Money
            </h1>
          </div>
          <Link
            to="/money/stats"
            className="mt-1 flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/25 rounded-full px-3 py-1.5 text-emerald-300 text-xs font-semibold shrink-0"
          >
            <i className="ti ti-chart-donut-3 text-sm" /> Stats
          </Link>
        </div>

        {/* Budget card — the primary thing on this page */}
        <div className="mb-5">
          <MoneyBudgetCard income={totals.income} spent={totals.expense} onAddIncome={handleAddIncome} />
        </div>

        {/* Quick add — one-tap presets for repeat daily purchases */}
        <div className="mb-6">
          <QuickAddRow
            presets={quickExpenses}
            expenseCategories={expenseCategories}
            onQuickAdd={quickAdd}
            onSavePreset={savePreset}
            onRemovePreset={removePreset}
          />
        </div>

        {/* Filter tabs + Add button */}
        <div className="mb-3 flex items-center justify-between gap-2 flex-wrap">
          <div className="flex p-1 bg-slate-800/60 rounded-xl w-fit">
            {['all', 'expense', 'income'].map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 sm:px-3.5 py-1.5 rounded-lg text-xs font-semibold capitalize transition-colors ${
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
        <div>
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