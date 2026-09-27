// src/components/practicetest/SectionSubmitModal.jsx
// Sectional Summary modal (plan doc Section 7.6 flow #1 / Image 5) — shown
// when "Submit section" is clicked on any non-final section. Confirming
// locks this section (its tab becomes un-clickable, plan Section 7.2) and
// starts the next section with a fresh timer.
//
// Light theme — matches the rest of the live engine.

function formatTime(totalSec) {
  const s = Math.max(0, Math.round(totalSec || 0))
  const m = Math.floor(s / 60)
  return `${String(m).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
}

export default function SectionSubmitModal({ sectionName, counts, totalQuestions, timeTakenSec, onConfirm, onCancel, submitting }) {
  const rows = [
    { label: 'Total Questions', value: totalQuestions },
    { label: 'Answered', value: counts.answered, color: 'text-emerald-600' },
    { label: 'Answered & Marked for Review', value: counts.answeredMarked, color: 'text-purple-600' },
    { label: 'Not Answered', value: counts.notAnswered, color: 'text-red-600' },
    { label: 'Marked for Review (only)', value: counts.marked, color: 'text-purple-600' },
    { label: 'Not Visited', value: counts.notVisited, color: 'text-slate-500' },
    { label: 'Time Taken', value: formatTime(timeTakenSec) },
  ]

  return (
    <div className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="w-full sm:max-w-sm bg-white border border-slate-200 rounded-t-2xl sm:rounded-2xl overflow-hidden shadow-xl animate-fade-in-up max-h-[90vh] flex flex-col">
        <div className="px-5 pt-5 pb-3">
          <h3 className="text-base font-bold text-slate-800">Submit "{sectionName}"?</h3>
          <p className="text-xs text-slate-500 mt-0.5">Ek baar submit karne ke baad is section mein wapas nahi ja sakte.</p>
        </div>

        <div className="px-5 flex-1 overflow-y-auto">
          <div className="rounded-xl border border-slate-200 divide-y divide-slate-200">
            {rows.map((r) => (
              <div key={r.label} className="flex items-center justify-between px-3.5 py-2.5 text-sm">
                <span className="text-slate-500">{r.label}</span>
                <span className={`font-bold ${r.color || 'text-slate-800'}`}>{r.value}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex gap-2 px-5 py-4">
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 rounded-xl border border-slate-300 text-slate-600 text-sm font-semibold hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={submitting}
            className="flex-1 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 disabled:opacity-60"
          >
            {submitting ? 'Submitting...' : 'Confirm Submit'}
          </button>
        </div>
      </div>
    </div>
  )
}