// src/components/money/CategoryChips.jsx
// Chip picker for choosing a category — plus a "+ New" chip that lets the
// user type a category that doesn't exist yet. The server remembers it
// (see routes/money.js rememberCategory) so it shows up as a real chip
// the next time, without a separate "manage categories" screen.

import { useState } from 'react'

export default function CategoryChips({ categories, value, onChange }) {
  const [customMode, setCustomMode] = useState(false)
  const [customText, setCustomText] = useState('')

  function submitCustom() {
    const name = customText.trim()
    if (!name) return
    onChange(name)
    setCustomMode(false)
    setCustomText('')
  }

  return (
    <div className="flex flex-wrap gap-2">
      {categories.map((c) => (
        <button
          key={c}
          type="button"
          onClick={() => onChange(c)}
          className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
            value === c
              ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300'
              : 'bg-slate-800/60 border-slate-700/60 text-slate-400 hover:border-slate-600'
          }`}
        >
          {c}
        </button>
      ))}

      {!customMode ? (
        <button
          type="button"
          onClick={() => setCustomMode(true)}
          className="px-3 py-1.5 rounded-full text-xs font-medium border border-dashed border-slate-700 text-slate-500 hover:border-slate-500 hover:text-slate-300"
        >
          + New
        </button>
      ) : (
        <div className="flex items-center gap-1.5">
          <input
            autoFocus
            value={customText}
            onChange={(e) => setCustomText(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); submitCustom() } }}
            placeholder="Category name"
            className="w-28 px-2.5 py-1.5 rounded-full text-xs bg-slate-800 border border-emerald-500/40 text-slate-200 outline-none"
          />
          <button type="button" onClick={submitCustom} className="text-emerald-400 text-xs font-semibold px-1">
            Add
          </button>
          <button
            type="button"
            onClick={() => { setCustomMode(false); setCustomText('') }}
            className="text-slate-600 text-xs px-1"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  )
}