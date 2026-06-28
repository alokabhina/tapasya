// components/syllabus/AddTopicModal.jsx
import { useState } from 'react'
import api from '@/api/client'

export default function AddTopicModal({ exams: initialExams, subjects: initialSubjects, defaultExamId, onClose, onAdd }) {
  const [exams,     setExams]     = useState(initialExams)
  const [subjects,  setSubjects]  = useState(initialSubjects)
  const [examId,    setExamId]    = useState(defaultExamId || initialExams[0]?._id || '')
  const [subjectId, setSubjectId] = useState(initialSubjects[0]?._id || '')
  const [text,      setText]      = useState('')
  const [saving,    setSaving]    = useState(false)
  const [error,     setError]     = useState('')

  // Quick create states
  const [showNewExam,    setShowNewExam]    = useState(false)
  const [showNewSubject, setShowNewSubject] = useState(false)
  const [newExamName,    setNewExamName]    = useState('')
  const [newExamDate,    setNewExamDate]    = useState('')
  const [newSubjectName, setNewSubjectName] = useState('')
  const [creating,       setCreating]       = useState(false)

  const createExam = async () => {
    if (!newExamName.trim() || !newExamDate) return
    setCreating(true)
    try {
      const exam = await api.post('/exams', {
        name: newExamName.trim(),
        examDate: newExamDate,
        color: '#a855f7'
      }).then(r => r.data)
      setExams(prev => [...prev, exam])
      setExamId(exam._id)
      setNewExamName('')
      setNewExamDate('')
      setShowNewExam(false)
    } catch { setError('Failed to create exam') }
    setCreating(false)
  }

  const createSubject = async () => {
    if (!newSubjectName.trim()) return
    setCreating(true)
    try {
      const sub = await api.post('/subjects', {
        name: newSubjectName.trim(),
        color: '#f97316'
      }).then(r => r.data)
      setSubjects(prev => [...prev, sub])
      setSubjectId(sub._id)
      setNewSubjectName('')
      setShowNewSubject(false)
    } catch { setError('Failed to create subject') }
    setCreating(false)
  }

  const handleSave = async () => {
    if (!examId)      return setError('Select an exam')
    if (!subjectId)   return setError('Select a subject')
    if (!text.trim()) return setError('Enter at least one topic')
    setSaving(true)
    setError('')
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean)
    const payload = lines.length === 1
      ? { examId, subjectId, name: lines[0], source: 'manual' }
      : { examId, subjectId, topics: lines, source: 'manual' }
    const ok = await onAdd(payload)
    setSaving(false)
    if (ok) onClose()
    else setError('Failed to add. Try again.')
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 p-4">
      <div className="bg-[#0f1c30] border border-slate-700 rounded-2xl w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-slate-800">
          <h2 className="text-base font-semibold text-white">Add Topics</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <i className="ti ti-x text-lg" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Exam select + quick create */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs text-slate-400">Exam</label>
              <button
                onClick={() => { setShowNewExam(v => !v); setShowNewSubject(false) }}
                className="text-xs text-purple-400 hover:text-purple-300 flex items-center gap-0.5"
              >
                <i className="ti ti-plus text-sm" /> New exam
              </button>
            </div>

            {showNewExam ? (
              <div className="bg-slate-800/80 border border-slate-700 rounded-xl p-3 space-y-2">
                <input
                  autoFocus
                  value={newExamName}
                  onChange={e => setNewExamName(e.target.value)}
                  placeholder="Exam name (e.g. SSC CGL 2025)"
                  className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
                />
                <input
                  type="date"
                  value={newExamDate}
                  onChange={e => setNewExamDate(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500"
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowNewExam(false)}
                    className="flex-1 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 text-xs transition-colors"
                  >Cancel</button>
                  <button
                    onClick={createExam}
                    disabled={creating || !newExamName.trim() || !newExamDate}
                    className="flex-1 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white text-xs transition-colors"
                  >{creating ? 'Creating...' : 'Create exam'}</button>
                </div>
              </div>
            ) : (
              <select
                value={examId}
                onChange={e => setExamId(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500"
              >
                <option value="">Select exam...</option>
                {exams.map(e => <option key={e._id} value={e._id}>{e.name}</option>)}
              </select>
            )}
          </div>

          {/* Subject select + quick create */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs text-slate-400">Subject</label>
              <button
                onClick={() => { setShowNewSubject(v => !v); setShowNewExam(false) }}
                className="text-xs text-purple-400 hover:text-purple-300 flex items-center gap-0.5"
              >
                <i className="ti ti-plus text-sm" /> New subject
              </button>
            </div>

            {showNewSubject ? (
              <div className="bg-slate-800/80 border border-slate-700 rounded-xl p-3 space-y-2">
                <input
                  autoFocus
                  value={newSubjectName}
                  onChange={e => setNewSubjectName(e.target.value)}
                  placeholder="Subject name (e.g. Mathematics)"
                  className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
                  onKeyDown={e => e.key === 'Enter' && createSubject()}
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowNewSubject(false)}
                    className="flex-1 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 text-xs transition-colors"
                  >Cancel</button>
                  <button
                    onClick={createSubject}
                    disabled={creating || !newSubjectName.trim()}
                    className="flex-1 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white text-xs transition-colors"
                  >{creating ? 'Creating...' : 'Create subject'}</button>
                </div>
              </div>
            ) : (
              <select
                value={subjectId}
                onChange={e => setSubjectId(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500"
              >
                <option value="">Select subject...</option>
                {subjects.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
              </select>
            )}
          </div>

          {/* Topics textarea */}
          <div>
            <label className="text-xs text-slate-400 block mb-1">
              Topics <span className="text-slate-600">(one per line)</span>
            </label>
            <textarea
              rows={5}
              value={text}
              onChange={e => setText(e.target.value)}
              placeholder={"Syllogisms\nBlood Relations\nCoding-Decoding\nSeating Arrangement"}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-purple-500 resize-none"
            />
            {text.trim() && (
              <p className="text-xs text-slate-500 mt-1">
                {text.split('\n').filter(l => l.trim()).length} topic(s) to add
              </p>
            )}
          </div>

          {error && <p className="text-xs text-red-400">{error}</p>}

          <div className="flex gap-2 pt-1">
            <button
              onClick={onClose}
              className="flex-1 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm transition-colors"
            >Cancel</button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white text-sm transition-colors"
            >{saving ? 'Saving...' : 'Add'}</button>
          </div>
        </div>
      </div>
    </div>
  )
}