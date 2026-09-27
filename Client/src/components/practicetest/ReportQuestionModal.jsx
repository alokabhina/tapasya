// src/components/practicetest/ReportQuestionModal.jsx
// The red-flag popup opened from TestHeader's flag icon — student picks
// "This question" (defaults to the qNo they're currently on) or "Entire
// test", adds an optional note, and it posts to
// POST /practice-attempts/:id/report (api/practiceAttempts.js). Doesn't
// touch the attempt/timer/score in any way — pure side-channel to admin.

import { useState } from 'react'

export default function ReportQuestionModal({ qNo, sectionIndex, onSubmit, onClose }) {
  const [scope, setScope] = useState('question')
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit() {
    setSubmitting(true)
    setError('')
    try {
      await onSubmit({ scope, sectionIndex, qNo: scope === 'question' ? qNo : null, message })
      setDone(true)
      setTimeout(onClose, 1100)
    } catch {
      setError('Report bhejne mein dikkat aayi, dobara try karo')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" onClick={onClose}>
      <div
        className="w-full max-w-sm rounded-2xl bg-white shadow-xl p-5"
        onClick={(e) => e.stopPropagation()}
      >
        {done ? (
          <div className="py-6 flex flex-col items-center gap-2 text-center">
            <i className="ti ti-circle-check text-3xl text-emerald-500" />
            <p className="text-sm font-semibold text-slate-700">Report admin ko bhej diya gaya</p>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                <i className="ti ti-flag-3 text-red-500" /> Report an issue
              </h2>
              <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600">
                <i className="ti ti-x text-lg" />
              </button>
            </div>

            <div className="flex rounded-lg border border-slate-200 overflow-hidden mb-3 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setScope('question')}
                className={`flex-1 py-2 ${scope === 'question' ? 'bg-tapasya-orange text-white' : 'text-slate-500 hover:bg-slate-50'}`}
              >
                This question (Q{qNo})
              </button>
              <button
                type="button"
                onClick={() => setScope('test')}
                className={`flex-1 py-2 ${scope === 'test' ? 'bg-tapasya-orange text-white' : 'text-slate-500 hover:bg-slate-50'}`}
              >
                Entire test
              </button>
            </div>

            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Kya galat lag raha hai? (optional)"
              rows={3}
              className="w-full text-sm px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:border-tapasya-orange resize-none"
            />

            {error && <p className="text-xs text-red-500 mt-1.5">{error}</p>}

            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting}
              className="mt-3 w-full py-2.5 rounded-lg bg-red-500 text-white text-sm font-bold hover:bg-red-600 disabled:opacity-60"
            >
              {submitting ? 'Sending...' : 'Send report'}
            </button>
          </>
        )}
      </div>
    </div>
  )
}