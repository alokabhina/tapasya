// src/components/money/QuickAddRow.jsx
// One-tap presets for the small purchases a student makes every day —
// "Litti ₹20", "Namkeen ₹5". Tap the chip, it's logged immediately with
// today's date — no form. The "+ New" chip defines a new preset once;
// after that it's just a tap forever.

import { useState } from 'react'
import CategoryChips from './CategoryChips'

export default function QuickAddRow({ presets, expenseCategories, onQuickAdd, onSavePreset, onRemovePreset }) {
  const [creating, setCreating] = useState(false)
  const [managing, setManaging] = useState(false)
  const [justAdded, setJustAdded] = useState(null) // preset id — brief confirm pulse
  const [busyId, setBusyId] = useState(null)

  async function tapPreset(preset) {
    if (managing) return // in manage mode, tapping deletes instead (handled by the × button)
    if (busyId) return
    setBusyId(preset._id)
    try {
      await onQuickAdd(preset)
      setJustAdded(preset._id)
      setTimeout(() => setJustAdded(null), 900)
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div>
      {presets.length > 0 && (
        <div className="flex justify-end mb-1.5">
          <button
            onClick={() => setManaging((m) => !m)}
            className={`text-[11px] font-semibold ${managing ? 'text-emerald-400' : 'text-slate-600 hover:text-slate-400'}`}
          >
            {managing ? 'Done' : 'Edit'}
          </button>
        </div>
      )}

      <div className="flex items-center gap-2 overflow-x-auto pb-1 -mx-1 px-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {presets.map((p) => (
          <button
            key={p._id}
            onClick={() => (managing ? onRemovePreset(p._id) : tapPreset(p))}
            disabled={busyId === p._id}
            className={`relative shrink-0 flex flex-col items-start gap-0.5 px-3.5 py-2 rounded-xl border text-left transition-all ${
              justAdded === p._id
                ? 'bg-emerald-500/25 border-emerald-500/60'
                : managing
                ? 'bg-rose-500/10 border-rose-500/30'
                : 'bg-slate-800/60 border-slate-700/60 hover:border-slate-600 active:scale-95'
            }`}
          >
            {managing && (
              <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-rose-500 text-white text-[10px] flex items-center justify-center">
                ✕
              </span>
            )}
            <span className="text-xs font-medium text-slate-200 whitespace-nowrap">
              {justAdded === p._id ? <><i className="ti ti-check text-emerald-400" /> Added</> : p.label}
            </span>
            <span className="text-[11px] font-mono text-slate-500">₹{p.amount}</span>
          </button>
        ))}

        <button
          onClick={() => setCreating(true)}
          className="shrink-0 flex items-center gap-1 px-3.5 py-2 rounded-xl border border-dashed border-slate-700 text-slate-500 hover:border-slate-500 hover:text-slate-300 text-xs font-medium"
        >
          <i className="ti ti-plus text-sm" /> New
        </button>
      </div>

      {creating && (
        <NewPresetForm
          expenseCategories={expenseCategories}
          onCancel={() => setCreating(false)}
          onSave={async (payload) => {
            await onSavePreset(payload)
            setCreating(false)
          }}
        />
      )}
    </div>
  )
}

function NewPresetForm({ expenseCategories, onSave, onCancel }) {
  const [label, setLabel]       = useState('')
  const [amount, setAmount]     = useState('')
  const [category, setCategory] = useState('')
  const [saving, setSaving]     = useState(false)

  const canSave = label.trim() && Number(amount) > 0 && category && !saving

  async function submit() {
    if (!canSave) return
    setSaving(true)
    try {
      await onSave({ label: label.trim(), amount: Number(amount), category, type: 'expense' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mt-2 bg-[#0d1420] border border-slate-800/70 rounded-2xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-slate-300">New quick-add</p>
        <button onClick={onCancel} className="text-slate-500 hover:text-slate-300 text-sm">✕</button>
      </div>

      <div className="flex gap-2">
        <input
          autoFocus
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="e.g. Litti"
          className="flex-1 min-w-0 bg-slate-800/60 border border-slate-700/60 rounded-xl px-3 py-2 text-sm text-slate-200 outline-none"
        />
        <div className="flex items-center gap-1 bg-slate-800/60 border border-slate-700/60 rounded-xl px-3 py-2 w-24 shrink-0">
          <span className="text-slate-400 text-sm">₹</span>
          <input
            type="number"
            inputMode="decimal"
            min="0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0"
            className="w-full bg-transparent outline-none text-sm text-slate-200"
          />
        </div>
      </div>

      <CategoryChips categories={expenseCategories()} value={category} onChange={setCategory} />

      <button
        onClick={submit}
        disabled={!canSave}
        className={`w-full py-2 rounded-xl text-sm font-semibold transition-colors ${
          canSave ? 'bg-emerald-500 text-white hover:bg-emerald-400' : 'bg-slate-800 text-slate-600 cursor-not-allowed'
        }`}
      >
        {saving ? 'Saving...' : 'Save preset'}
      </button>
    </div>
  )
}