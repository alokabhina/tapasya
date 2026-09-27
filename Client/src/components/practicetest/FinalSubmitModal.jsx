// src/components/practicetest/FinalSubmitModal.jsx
// Test Summary modal (plan doc Section 7.6 flow #2 / Image 10) — shown on
// the very last section's "Submit" click. Same breakdown as
// SectionSubmitModal but per-section rows + a grand total row, plus a top
// strip of 6 stat pills. Confirming finalizes the whole PracticeAttempt.
//
// `sectionRows`: [{ name, totalQuestions, answered, answeredMarked,
//   notAnswered, marked, notVisited, timeTakenSec }], one per section
// (completed sections carry their submitted counts, the current/last
// section carries its live in-progress counts from the store).
// `grandTotal`: same shape, summed across all sections.
//
// Round-3: bumped every font size up one step (was reading too small on
// this modal specifically) — title, pill numbers/labels, table, buttons.
//
// Light theme — matches the reference (Guidely) screenshot exactly.

function formatTime(totalSec) {
  const s = Math.max(0, Math.round(totalSec || 0))
  const m = Math.floor(s / 60)
  return `${String(m).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
}

export default function FinalSubmitModal({ sectionRows, grandTotal, onConfirm, onCancel, submitting }) {
  const pills = [
    { label: 'Answered', value: grandTotal.answered, color: 'bg-emerald-50 text-emerald-700' },
    { label: 'Answered & Marked', value: grandTotal.answeredMarked, color: 'bg-purple-50 text-purple-700' },
    { label: 'Not Answered', value: grandTotal.notAnswered, color: 'bg-red-50 text-red-700' },
    { label: 'Marked', value: grandTotal.marked, color: 'bg-purple-50 text-purple-700' },
    { label: 'Not Visited', value: grandTotal.notVisited, color: 'bg-slate-100 text-slate-600' },
    { label: 'Time', value: formatTime(grandTotal.timeTakenSec), color: 'bg-slate-100 text-slate-700' },
  ]

  return (
    <div className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="w-full sm:max-w-lg bg-white border border-slate-200 rounded-t-2xl sm:rounded-2xl overflow-hidden shadow-xl animate-fade-in-up max-h-[92vh] flex flex-col">
        <div className="px-5 pt-5 pb-3">
          <h3 className="text-lg font-bold text-slate-800">Final Submit?</h3>
          <p className="text-sm text-slate-500 mt-1">Poora test submit ho jayega — is baad koi bhi section edit nahi ho sakega.</p>
        </div>

        <div className="grid grid-cols-3 gap-2 px-5 mb-3">
          {pills.map((p) => (
            <div key={p.label} className={`rounded-xl px-2.5 py-2.5 text-center ${p.color}`}>
              <p className="font-black text-base">{p.value}</p>
              <p className="text-xs opacity-80 mt-0.5">{p.label}</p>
            </div>
          ))}
        </div>

        <div className="px-5 flex-1 overflow-y-auto">
          <div className="rounded-xl border border-slate-200 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-slate-500 border-b border-slate-200 bg-slate-50">
                  <th className="text-left font-semibold px-3 py-2.5">Section</th>
                  <th className="text-right font-semibold px-2 py-2.5">Ans</th>
                  <th className="text-right font-semibold px-2 py-2.5">Not Ans</th>
                  <th className="text-right font-semibold px-2 py-2.5">Marked</th>
                  <th className="text-right font-semibold px-2 py-2.5">Unseen</th>
                  <th className="text-right font-semibold px-3 py-2.5">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {sectionRows.map((r) => (
                  <tr key={r.name}>
                    <td className="px-3 py-2.5 text-slate-700 font-medium truncate max-w-[100px]">{r.name}</td>
                    <td className="px-2 py-2.5 text-right text-emerald-600">{r.answered + r.answeredMarked}</td>
                    <td className="px-2 py-2.5 text-right text-red-600">{r.notAnswered}</td>
                    <td className="px-2 py-2.5 text-right text-purple-600">{r.marked}</td>
                    <td className="px-2 py-2.5 text-right text-slate-500">{r.notVisited}</td>
                    <td className="px-3 py-2.5 text-right text-slate-500">{formatTime(r.timeTakenSec)}</td>
                  </tr>
                ))}
                <tr className="bg-slate-50 font-bold">
                  <td className="px-3 py-2.5 text-slate-800">Total</td>
                  <td className="px-2 py-2.5 text-right text-emerald-600">{grandTotal.answered + grandTotal.answeredMarked}</td>
                  <td className="px-2 py-2.5 text-right text-red-600">{grandTotal.notAnswered}</td>
                  <td className="px-2 py-2.5 text-right text-purple-600">{grandTotal.marked}</td>
                  <td className="px-2 py-2.5 text-right text-slate-500">{grandTotal.notVisited}</td>
                  <td className="px-3 py-2.5 text-right text-slate-600">{formatTime(grandTotal.timeTakenSec)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div className="flex gap-2 px-5 py-4">
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 rounded-xl border border-slate-300 text-slate-600 text-base font-semibold hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={submitting}
            className="flex-1 py-2.5 rounded-xl bg-blue-600 text-white text-base font-bold hover:bg-blue-700 disabled:opacity-60"
          >
            {submitting ? 'Submitting...' : 'Final Submit'}
          </button>
        </div>
      </div>
    </div>
  )
}