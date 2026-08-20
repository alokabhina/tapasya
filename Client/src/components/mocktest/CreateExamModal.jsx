// src/components/mocktest/CreateExamModal.jsx
import { useState } from 'react'
import { createMockExam } from '@/api/mockExams'

export default function CreateExamModal({ onClose, onCreated }) {
  const [name, setName] = useState('')
  const [sections, setSections] = useState(['Quant', 'English', 'Reasoning'])
  const [saving, setSaving] = useState(false)

  function updateSection(i, val) {
    setSections((prev) => prev.map((s, idx) => (idx === i ? val : s)))
  }
  function addSection() { setSections((prev) => [...prev, '']) }
  function removeSection(i) { setSections((prev) => prev.filter((_, idx) => idx !== i)) }

  async function handleSave() {
    if (!name.trim() || saving) return
    setSaving(true)
    try {
      const exam = await createMockExam({ name: name.trim(), sections: sections.filter((s) => s.trim()) })
      onCreated?.(exam)
    } catch {
      alert('Save nahi ho paya, dobara try karo')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="w-full sm:max-w-sm bg-slate-900 border border-slate-700 rounded-t-2xl sm:rounded-2xl overflow-hidden animate-fade-in-up max-h-[90vh] flex flex-col">
        <div className="px-5 pt-5 pb-3">
          <h3 className="text-base font-bold text-slate-100">Naya Exam Profile</h3>
          <p className="text-xs text-slate-500 mt-0.5">e.g. "IBPS Clerk", "SSC CGL"</p>
        </div>

        <div className="px-5 flex-1 overflow-y-auto space-y-4">
          <div>
            <label className="text-xs text-slate-400 mb-1 block">Exam ka naam</label>
            <input
              autoFocus
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="IBPS Clerk"
              className="w-full px-3 py-2.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-100 text-sm focus:outline-none focus:border-orange-500/50"
            />
          </div>

          <div>
            <label className="text-xs text-slate-400 mb-1 block">Sections</label>
            <div className="space-y-2">
              {sections.map((s, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={s}
                    onChange={(e) => updateSection(i, e.target.value)}
                    placeholder="Section naam"
                    className="flex-1 px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-100 text-sm focus:outline-none focus:border-orange-500/50"
                  />
                  <button onClick={() => removeSection(i)} className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 text-slate-500 hover:text-red-400 flex items-center justify-center shrink-0">
                    <i className="ti ti-x text-sm" />
                  </button>
                </div>
              ))}
            </div>
            <button onClick={addSection} className="mt-2 text-xs text-orange-400 flex items-center gap-1">
              <i className="ti ti-plus" /> Section add karo
            </button>
          </div>
        </div>

        <div className="flex gap-2 p-5">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 text-sm font-medium">
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!name.trim() || saving}
            className="flex-1 py-2.5 rounded-lg bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white text-sm font-semibold"
          >
            {saving ? 'Saving...' : 'Create karo'}
          </button>
        </div>
      </div>
    </div>
  )
}