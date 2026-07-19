// src/pages/Money.jsx
// Add + track expenses against this month's pocket money. Category &
// period-wise breakdowns live on the separate /money/stats page
// (MoneyStats.jsx) — this page is "how much do I have left, let me log
// what I just spent". Fully independent from the study Stats page/
// useStats hook — no shared state, no shared data.
//
// [LAYOUT] Header/budget-card/quick-add/filter-tabs are a fixed top
// section (shrink-0); only the transaction list below scrolls, in its own
// flex-1/overflow-y-auto region. Used to be one long scrolling page where
// the budget card scrolled away with everything else — now it stays
// visible while browsing the list, like a real finance app.
//
// [REDESIGN] Budget-first framing (MoneyBudgetCard: "₹X left of ₹Y this
// month") instead of a generic income/expense/balance grid — that's how
// money actually works for a student (one pocket-money income event, a
// stream of small expenses against it). Quick Add is a toggle in the
// header next to Stats (not a permanently-visible row) so it doesn't eat
// vertical space when not in use.

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
  const [showQuickAdd, setShowQuickAdd] = useState(false)

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
    <div className="h-full flex flex-col bg-[#07090f] text-white overflow-hidden" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      <div className="max-w-3xl w-full mx-auto px-4 sm:px-5 flex flex-col h-full min-h-0">

        {/* ── Fixed top section — never scrolls away ──────────────────── */}
        <div className="shrink-0">
          {/* Header */}
          <div className="pt-6 sm:pt-7 pb-4 flex items-start justify-between gap-2">
            <div>
              <p className="text-[11px] text-slate-600 uppercase tracking-[0.2em] font-semibold mb-1">This month</p>
              <h1
                className="text-xl sm:text-2xl font-bold text-white tracking-tight"
                style={{ fontFamily: "'Sora', sans-serif", letterSpacing: '-0.03em' }}
              >
                Money
              </h1>
            </div>
            <div className="flex items-center gap-2 mt-1 shrink-0">
              <button
                onClick={() => setShowQuickAdd((v) => !v)}
                className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold border transition-colors ${
                  showQuickAdd
                    ? 'bg-amber-500/15 border-amber-500/30 text-amber-300'
                    : 'bg-slate-800/60 border-slate-700/60 text-slate-300'
                }`}
              >
                <i className="ti ti-bolt text-sm" /> Quick Add
              </button>
              <Link
                to="/money/stats"
                className="flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/25 rounded-full px-3 py-1.5 text-emerald-300 text-xs font-semibold"
              >
                <i className="ti ti-chart-donut-3 text-sm" /> Stats
              </Link>
            </div>
          </div>

          {/* Quick add — collapsed by default, toggled from the header button above */}
          {showQuickAdd && (
            <div className="mb-4">
              <QuickAddRow
                presets={quickExpenses}
                expenseCategories={expenseCategories}
                onQuickAdd={quickAdd}
                onSavePreset={savePreset}
                onRemovePreset={removePreset}
              />
            </div>
          )}

          {/* Budget card */}
          <div className="mb-4">
            <MoneyBudgetCard income={totals.income} spent={totals.expense} onAddIncome={handleAddIncome} />
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
        </div>

        {/* ── Scrollable list — the ONLY thing that scrolls on this page ── */}
        <div className="flex-1 min-h-0 overflow-y-auto pb-6">
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