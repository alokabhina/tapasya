// src/components/currentaffairs/CAAdminForm.jsx
// Manual single-entry add/edit form for admin. Includes the structured
// "tag" fields (entity/action/value/blankableFact) so an entry is ready
// to hand-build an MCQ from later, without needing an in-app LLM call.
import { useState, useEffect } from 'react'

const CATEGORIES = ['Banking', 'RBI', 'Appointment', 'Scheme', 'Award', 'Static-Trigger', 'Sports', 'International', 'National', 'Economy', 'Other']

const BLANK = {
  headline: '', oneLiner: '', date: new Date().toISOString().slice(0, 10),
  category: 'Other', source: 'Admin', sourceUrl: '',
  entity: '', action: '', value: '', blankableFact: '',
}

export default function CAAdminForm({ editing, onSave, onClose }) {
  const [form, setForm] = useState(BLANK)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (editing) {
      setForm({ ...BLANK, ...editing, date: new Date(editing.date).toISOString().slice(0, 10) })
    } else {
      setForm(BLANK)
    }
  }, [editing])

  function set(k, v) { setForm((f) => ({ ...f, [k]: v })) }

  async function handleSubmit() {
    if (!form.headline.trim() || !form.oneLiner.trim()) return
    setBusy(true)
    try {
      await onSave(form)
      setForm(BLANK)
    } finally {
      setBusy(false)
    }
  }

  const inputCls = "w-full h-9 px-2.5 rounded-lg bg-black/30 border border-slate-700 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-cyan-500/50"
  const labelCls = "text-[10px] text-slate-500 mb-1 block"

  return (
    <div className="bg-[#141d2e] rounded-2xl border border-slate-800 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-slate-200 flex items-center gap-1.5">
          <i className={`ti ${editing ? 'ti-pencil' : 'ti-plus'} text-cyan-400`} /> {editing ? 'Edit entry' : 'Manual add'}
        </p>
        <button onClick={onClose} className="w-6 h-6 rounded-full flex items-center justify-center bg-slate-800 hover:bg-slate-700">
          <i className="ti ti-x text-[12px] text-slate-400" />
        </button>
      </div>

      <div>
        <label className={labelCls}>Headline *</label>
        <input className={inputCls} value={form.headline} onChange={(e) => set('headline', e.target.value)} placeholder="IREDA granted Navratna status" />
      </div>
      <div>
        <label className={labelCls}>One-liner fact *</label>
        <textarea className={inputCls + ' py-2 h-16 resize-none'} value={form.oneLiner} onChange={(e) => set('oneLiner', e.target.value)} placeholder="Revision-ready 1-2 line fact" />
      </div>

      <div className="grid grid-cols-2 gap-2.5">
        <div>
          <label className={labelCls}>Date</label>
          <input type="date" className={inputCls} value={form.date} onChange={(e) => set('date', e.target.value)} />
        </div>
        <div>
          <label className={labelCls}>Category</label>
          <select className={inputCls} value={form.category} onChange={(e) => set('category', e.target.value)}>
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2.5">
        <div>
          <label className={labelCls}>Source</label>
          <input className={inputCls} value={form.source} onChange={(e) => set('source', e.target.value)} placeholder="RBI / PIB / Admin" />
        </div>
        <div>
          <label className={labelCls}>Source URL</label>
          <input className={inputCls} value={form.sourceUrl} onChange={(e) => set('sourceUrl', e.target.value)} placeholder="https://..." />
        </div>
      </div>

      <div className="pt-1 border-t border-slate-800">
        <p className="text-[10px] text-slate-500 mb-2 mt-2">Tag fields (for building questions later — optional)</p>
        <div className="grid grid-cols-2 gap-2.5 mb-2.5">
          <div>
            <label className={labelCls}>Entity (who/what)</label>
            <input className={inputCls} value={form.entity} onChange={(e) => set('entity', e.target.value)} placeholder="IREDA" />
          </div>
          <div>
            <label className={labelCls}>Action</label>
            <input className={inputCls} value={form.action} onChange={(e) => set('action', e.target.value)} placeholder="granted Navratna status" />
          </div>
        </div>
        <div>
          <label className={labelCls}>Blankable fact (cloze)</label>
          <input className={inputCls} value={form.blankableFact} onChange={(e) => set('blankableFact', e.target.value)} placeholder="IREDA was granted ___ status" />
        </div>
      </div>

      <div className="flex items-center gap-2 pt-1">
        <button onClick={handleSubmit} disabled={busy} className="flex-1 h-9 rounded-lg bg-cyan-500/20 border border-cyan-500/40 text-cyan-400 text-sm font-semibold disabled:opacity-40">
          {busy ? 'Saving...' : editing ? 'Update' : 'Add'}
        </button>
        <button onClick={onClose} className="h-9 px-4 rounded-lg bg-slate-800 text-slate-400 text-sm">
          Cancel
        </button>
      </div>
    </div>
  )
}