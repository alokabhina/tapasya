// src/components/home/ExamCountdown.jsx
// Shows exam countdowns in right panel (desktop) and compact strip on mobile
// Multiple exams support with add/edit/delete

import { useState, useEffect, useCallback } from 'react'
import { getExams, createExam, updateExam, deleteExam } from '@/api/exams'

const EXAM_COLORS = [
  '#a855f7', '#f97316', '#3b82f6', '#22c55e',
  '#ec4899', '#eab308', '#14b8a6', '#ef4444',
]

function daysUntil(dateStr) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const exam = new Date(dateStr)
  exam.setHours(0, 0, 0, 0)
  return Math.ceil((exam - today) / (1000 * 60 * 60 * 24))
}

function ExamModal({ exam, onClose, onSave }) {
  const [name, setName]       = useState(exam?.name || '')
  const [date, setDate]       = useState(exam?.examDate || '')
  const [color, setColor]     = useState(exam?.color || '#a855f7')
  const [notes, setNotes]     = useState(exam?.notes || '')
  const [saving, setSaving]   = useState(false)

  const minDate = new Date().toISOString().split('T')[0]

  async function handleSave() {
    if (!name.trim() || !date) return
    setSaving(true)
    try {
      if (exam?._id || exam?.id) {
        await updateExam(exam._id || exam.id, { name: name.trim(), examDate: date, color, notes })
      } else {
        await createExam({ name: name.trim(), examDate: date, color, notes })
      }
      onSave()
    } catch (e) {
      console.error(e)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-end md:items-center justify-center p-4">
      <div className="bg-[#1e293b] rounded-2xl w-full max-w-sm border border-slate-700 shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b border-slate-700">
          <h3 className="font-semibold text-white">{exam?._id || exam?.id ? 'Edit Exam' : 'Add Exam'}</h3>
          <button onClick={onClose} className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center hover:bg-slate-700">
            <i className="ti ti-x text-slate-400 text-sm" />
          </button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="text-xs text-slate-400 mb-1.5 block">Exam Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. IBPS PO, SSC CGL..."
              autoFocus
              className="w-full bg-[#0f172a] border border-slate-700 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-purple-500"
            />
          </div>
          <div>
            <label className="text-xs text-slate-400 mb-1.5 block">Exam Date</label>
            <input
              type="date"
              value={date}
              min={minDate}
              onChange={(e) => setDate(e.target.value)}
              className="w-full bg-[#0f172a] border border-slate-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-purple-500 [color-scheme:dark]"
            />
          </div>
          <div>
            <label className="text-xs text-slate-400 mb-2 block">Color</label>
            <div className="flex flex-wrap gap-2">
              {EXAM_COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  className="w-7 h-7 rounded-full transition-all"
                  style={{
                    backgroundColor: c,
                    boxShadow: color === c ? `0 0 0 2px #0f172a, 0 0 0 4px ${c}` : 'none',
                    transform: color === c ? 'scale(1.15)' : 'scale(1)',
                  }}
                />
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs text-slate-400 mb-1.5 block">Notes <span className="text-slate-600">(optional)</span></label>
            <input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Prelims at City Center, Hall No. 4"
              className="w-full bg-[#0f172a] border border-slate-700 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-purple-500"
            />
          </div>
        </div>
        <div className="flex gap-3 p-5 pt-0">
          <button onClick={onClose} className="flex-1 py-3 rounded-xl border border-slate-700 text-sm text-slate-300 hover:bg-slate-700">
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !name.trim() || !date}
            className="flex-1 py-3 rounded-xl bg-purple-500 hover:bg-purple-400 disabled:opacity-50 text-sm font-medium text-white transition-colors"
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Single exam card ──────────────────────────────────────────────────────────
function ExamCard({ exam, onEdit, onDelete }) {
  const days = daysUntil(exam.examDate)
  const isPast = days < 0
  const isToday = days === 0
  const isSoon = days > 0 && days <= 7

  const urgencyColor = isPast
    ? '#64748b'
    : isToday
    ? '#ef4444'
    : isSoon
    ? '#f97316'
    : exam.color

  const urgencyBg = isPast
    ? 'rgba(100,116,139,0.1)'
    : isToday
    ? 'rgba(239,68,68,0.1)'
    : isSoon
    ? 'rgba(249,115,22,0.1)'
    : `${exam.color}18`

  const label = isPast
    ? `${Math.abs(days)}d ago`
    : isToday
    ? 'TODAY!'
    : `${days} day${days !== 1 ? 's' : ''}`

  return (
    <div
      className="relative rounded-xl p-3 border group overflow-hidden"
      style={{ borderColor: `${urgencyColor}30`, background: urgencyBg }}
    >
      {/* Subtle glow strip */}
      <div className="absolute left-0 top-0 bottom-0 w-0.5 rounded-l-xl" style={{ backgroundColor: urgencyColor }} />

      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0 flex-1 pl-2">
          <p className="text-white text-xs font-semibold truncate">{exam.name}</p>
          {exam.notes && (
            <p className="text-slate-500 text-[10px] truncate mt-0.5">{exam.notes}</p>
          )}
          <p className="text-slate-400 text-[10px] mt-0.5">
            {new Date(exam.examDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
          <div
            className="px-2.5 py-1 rounded-lg text-xs font-bold min-w-[52px] text-center"
            style={{ backgroundColor: `${urgencyColor}22`, color: urgencyColor }}
          >
            {label}
          </div>
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={() => onEdit(exam)}
              className="w-5 h-5 rounded flex items-center justify-center bg-slate-700 hover:bg-slate-600"
            >
              <i className="ti ti-pencil text-slate-300 text-[9px]" />
            </button>
            <button
              onClick={() => onDelete(exam)}
              className="w-5 h-5 rounded flex items-center justify-center bg-red-900/50 hover:bg-red-900"
            >
              <i className="ti ti-trash text-red-400 text-[9px]" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Mobile compact strip (shown below greeting on mobile) ─────────────────────
export function ExamCountdownMobile({ exams, onOpenPanel }) {
  if (!exams || exams.length === 0) return null

  const upcoming = exams
    .filter((e) => daysUntil(e.examDate) >= 0)
    .slice(0, 3)

  if (upcoming.length === 0) return null

  return (
    <div className="flex gap-1.5 overflow-x-auto scrollbar-none">
      {upcoming.map((exam) => {
        const days = daysUntil(exam.examDate)
        const isToday = days === 0
        const isSoon = days > 0 && days <= 7

        const chipText   = isToday ? '#f87171' : isSoon ? '#fb923c' : '#94a3b8'
        const chipBg     = isToday ? 'rgba(239,68,68,0.08)' : isSoon ? 'rgba(249,115,22,0.07)' : 'rgba(255,255,255,0.04)'
        const chipBorder = isToday ? 'rgba(239,68,68,0.18)' : isSoon ? 'rgba(249,115,22,0.15)' : 'rgba(255,255,255,0.08)'
        const dotColor   = isToday || isSoon ? chipText : exam.color + '99'

        return (
          <button
            key={exam._id || exam.id}
            onClick={onOpenPanel}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg flex-shrink-0 active:opacity-60"
            style={{ background: chipBg, border: `1px solid ${chipBorder}` }}
          >
            <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: dotColor }} />
            <span className="text-[11px] text-slate-400 font-medium max-w-[80px] truncate leading-none">
              {exam.name}
            </span>
            <span className="text-[10px] font-semibold leading-none" style={{ color: chipText }}>
              {isToday ? 'Today' : `${days}d`}
            </span>
          </button>
        )
      })}
      <button
        onClick={onOpenPanel}
        className="flex items-center justify-center w-7 h-7 rounded-lg flex-shrink-0 text-slate-600 hover:text-slate-400"
        style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}
      >
        <i className="ti ti-plus text-[10px]" />
      </button>
    </div>
  )
}

// ── Main panel widget (used in right panel) ───────────────────────────────────
export default function ExamCountdown() {
  const [exams, setExams]   = useState([])
  const [modal, setModal]   = useState(null) // null | 'new' | exam object
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    try {
      const data = await getExams()
      setExams(data)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  async function handleDelete(exam) {
    const id = exam._id || exam.id
    if (!confirm(`Delete "${exam.name}"?`)) return
    try {
      await deleteExam(id)
      setExams((prev) => prev.filter((e) => (e._id || e.id) !== id))
    } catch (e) { console.error(e) }
  }

  const upcomingExams = exams.filter((e) => daysUntil(e.examDate) >= 0)
  const pastExams     = exams.filter((e) => daysUntil(e.examDate) < 0)

  return (
    <>
      <div className="bg-[#141d2e] rounded-2xl p-4 border border-slate-800">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-md bg-blue-500 flex items-center justify-center">
              <i className="ti ti-calendar-event text-white text-[10px]" />
            </div>
            <h3 className="text-white font-semibold text-sm">Exam Countdown</h3>
          </div>
          <button
            onClick={() => setModal('new')}
            className="flex items-center gap-1 px-2 py-1 rounded-lg bg-blue-500/20 border border-blue-500/30 text-blue-400 hover:bg-blue-500/30 text-[10px] font-medium transition-colors"
          >
            <i className="ti ti-plus text-[10px]" /> Add
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-4">
            <i className="ti ti-loader animate-spin text-slate-600 text-lg" />
          </div>
        ) : exams.length === 0 ? (
          <div className="text-center py-4">
            <i className="ti ti-calendar-off text-2xl text-slate-700 block mb-2" />
            <p className="text-slate-500 text-xs">No exams added yet</p>
            <button
              onClick={() => setModal('new')}
              className="mt-2 text-xs text-blue-400 hover:text-blue-300 transition-colors"
            >
              Add your first exam →
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {upcomingExams.map((exam) => (
              <ExamCard
                key={exam._id || exam.id}
                exam={exam}
                onEdit={(e) => setModal(e)}
                onDelete={handleDelete}
              />
            ))}
            {pastExams.length > 0 && upcomingExams.length > 0 && (
              <div className="border-t border-slate-800 pt-2 mt-2">
                <p className="text-slate-600 text-[10px] mb-1.5 uppercase tracking-wider">Completed</p>
                {pastExams.map((exam) => (
                  <ExamCard
                    key={exam._id || exam.id}
                    exam={exam}
                    onEdit={(e) => setModal(e)}
                    onDelete={handleDelete}
                  />
                ))}
              </div>
            )}
            {pastExams.length > 0 && upcomingExams.length === 0 && (
              <>
                <p className="text-slate-600 text-[10px] mb-1.5 uppercase tracking-wider">Past Exams</p>
                {pastExams.map((exam) => (
                  <ExamCard
                    key={exam._id || exam.id}
                    exam={exam}
                    onEdit={(e) => setModal(e)}
                    onDelete={handleDelete}
                  />
                ))}
              </>
            )}
          </div>
        )}
      </div>

      {modal && (
        <ExamModal
          exam={modal === 'new' ? null : modal}
          onClose={() => setModal(null)}
          onSave={async () => { await load(); setModal(null) }}
        />
      )}
    </>
  )
}

// Export exams data hook for mobile strip
export function useExams() {
  const [exams, setExams] = useState([])
  useEffect(() => {
    getExams().then(setExams).catch(() => {})
  }, [])
  return exams
}