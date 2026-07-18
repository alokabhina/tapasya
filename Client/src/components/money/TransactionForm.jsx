// src/components/money/TransactionForm.jsx
// Bottom-sheet modal to add/edit a transaction — same shape as Todo's
// AddTaskModal (bottom-sheet on mobile, centered on desktop).

import { useState, useRef, useEffect } from 'react'
import CategoryChips from './CategoryChips'
import { getStudyDayString } from '@/utils/time'

export default function TransactionForm({ expenseCategories, incomeCategories, initial, onClose, onSave }) {
  const [type, setType]         = useState(initial?.type || 'expense')
  const [amount, setAmount]     = useState(initial?.amount ? String(initial.amount) : '')
  const [category, setCategory] = useState(initial?.category || '')
  const [note, setNote]         = useState(initial?.note || '')
  const [date, setDate]         = useState(initial?.date || getStudyDayString())
  const [saving, setSaving]     = useState(false)
  const amountRef = useRef(null)

  useEffect(() => { setTimeout(() => amountRef.current?.focus(), 80) }, [])

  const categories = type === 'expense' ? expenseCategories() : incomeCategories()
  const canSave = Number(amount) > 0 && !!category && !saving

  async function handleSave() {
    if (!canSave) return
    setSaving(true)
    try {
      await onSave({ type, amount: Number(amount), category, note: note.trim(), date })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg mx-0 sm:mx-4 mb-0 bg-[#151f2e] rounded-t-2xl sm:rounded-2xl border border-slate-700/60 shadow-2xl overflow-hidden">
        <div className="h-0.5 w-full bg-gradient-to-r from-emerald-500 via-emerald-400 to-emerald-600" />

        <div className="p-5 space-y-4 max-h-[85vh] overflow-y-auto">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-white">{initial ? 'Edit Transaction' : 'Add Transaction'}</h2>
            <button onClick={onClose} className="text-slate-500 hover:text-slate-300 text-lg leading-none">✕</button>
          </div>

          {/* Income / Expense toggle */}
          <div className="flex p-1 bg-slate-800/60 rounded-xl">
            {['expense', 'income'].map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => { setType(t); setCategory('') }}
                className={`flex-1 py-2 rounded-lg text-sm font-semibold capitalize transition-colors ${
                  type === t
                    ? t === 'expense' ? 'bg-rose-500/20 text-rose-300' : 'bg-emerald-500/20 text-emerald-300'
                    : 'text-slate-500'
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          {/* Amount */}
          <div>
            <label className="text-[11px] text-slate-500 uppercase tracking-wider font-semibold mb-1.5 block">
              Amount
            </label>
            <div className="flex items-center gap-2 bg-slate-800/60 border border-slate-700/60 rounded-xl px-3.5 py-2.5">
              <span className="text-slate-400 font-semibold">₹</span>
              <input
                ref={amountRef}
                type="number"
                inputMode="decimal"
                min="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0"
                className="flex-1 bg-transparent outline-none text-white text-lg font-semibold"
              />
            </div>
          </div>

          {/* Category */}
          <div>
            <label className="text-[11px] text-slate-500 uppercase tracking-wider font-semibold mb-1.5 block">
              Category
            </label>
            <CategoryChips categories={categories} value={category} onChange={setCategory} />
          </div>

          {/* Date */}
          <div>
            <label className="text-[11px] text-slate-500 uppercase tracking-wider font-semibold mb-1.5 block">
              Date
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full bg-slate-800/60 border border-slate-700/60 rounded-xl px-3.5 py-2.5 text-slate-200 outline-none"
            />
          </div>

          {/* Note */}
          <div>
            <label className="text-[11px] text-slate-500 uppercase tracking-wider font-semibold mb-1.5 block">
              Note (optional)
            </label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. Lunch with friends"
              className="w-full bg-slate-800/60 border border-slate-700/60 rounded-xl px-3.5 py-2.5 text-slate-200 outline-none"
            />
          </div>

          <button
            onClick={handleSave}
            disabled={!canSave}
            className={`w-full py-3 rounded-xl font-semibold text-sm transition-colors ${
              canSave ? 'bg-emerald-500 text-white hover:bg-emerald-400' : 'bg-slate-800 text-slate-600 cursor-not-allowed'
            }`}
          >
            {saving ? 'Saving...' : initial ? 'Save Changes' : 'Add Transaction'}
          </button>
        </div>
      </div>
    </div>
  )
}