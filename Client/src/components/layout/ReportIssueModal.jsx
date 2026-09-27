// src/components/layout/ReportIssueModal.jsx
// Opened from BottomNav.jsx's "Report" button (replaces the old "Math"
// shortcut there — Speed Math is still reachable from the sidebar / Other
// Tools). General app-feedback channel: not tied to a test/attempt, just
// "what page were you on" + a free-text message, posted to
// POST /practice-attempts/report-general (api/practiceAttempts.js) and
// reviewed by admin alongside in-test red-flag reports
// (pages/admin/PracticeAdminReports.jsx, scope: 'app').

import { useState } from 'react'
import { useLocation } from 'react-router-dom'
import { reportAppIssue } from '@/api/practiceAttempts'

export default function ReportIssueModal({ onClose }) {
  const location = useLocation()
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit() {
    if (!message.trim()) { setError('Kuch to likho'); return }
    setSubmitting(true)
    setError('')
    try {
      await reportAppIssue(location.pathname, message)
      setDone(true)
      setTimeout(onClose, 1100)
    } catch {
      setError('Report bhejne mein dikkat aayi, dobara try karo')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/50 px-4 pb-4 sm:pb-0" onClick={onClose}>
      <div
        className="w-full max-w-sm rounded-2xl bg-[#0d1420] border border-slate-800 shadow-xl p-5"
        onClick={(e) => e.stopPropagation()}
      >
        {done ? (
          <div className="py-6 flex flex-col items-center gap-2 text-center">
            <i className="ti ti-circle-check text-3xl text-emerald-500" />
            <p className="text-sm font-semibold text-slate-200">Report admin ko bhej diya gaya</p>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold text-white flex items-center gap-1.5">
                <i className="ti ti-flag-3 text-red-400" /> Report an issue
              </h2>
              <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-200">
                <i className="ti ti-x text-lg" />
              </button>
            </div>

            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Kya problem aa rahi hai?"
              rows={3}
              autoFocus
              className="w-full text-sm px-3 py-2 rounded-lg border border-slate-700 bg-[#0c1526] text-slate-200 focus:outline-none focus:border-tapasya-orange resize-none placeholder:text-slate-500"
            />

            {error && <p className="text-xs text-red-400 mt-1.5">{error}</p>}

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