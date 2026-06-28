// components/syllabus/ExamSyllabusView.jsx
import { useState } from 'react'
import TopicItem from './TopicItem'

export default function ExamSyllabusView({ exam, subjects, topics, onToggle, onDelete, onAddClick }) {
  const [collapsed, setCollapsed] = useState({})

  // Group topics by subject
  const bySubject = {}
  topics.forEach(t => {
    const k = t.subjectId
    if (!bySubject[k]) bySubject[k] = []
    bySubject[k].push(t)
  })

  const subjectsWithTopics = subjects.filter(s => bySubject[s._id]?.length > 0)
  const total = topics.length
  const done  = topics.filter(t => t.done).length
  const pct   = total ? Math.round((done / total) * 100) : 0

  return (
    <div className="p-6 max-w-3xl space-y-4">
      {/* Exam header bar */}
      <div className="flex items-center gap-3 pb-1">
        <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: exam.color || '#a855f7' }} />
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-white">{exam.name}</span>
            <span className="text-xs text-slate-400">{done}/{total} done</span>
          </div>
          <div className="mt-1 h-1.5 bg-slate-800 rounded-full w-64 overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${pct}%`, background: exam.color || '#a855f7' }}
            />
          </div>
        </div>
        <button
          onClick={onAddClick}
          className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
        >
          <i className="ti ti-plus" /> Add
        </button>
      </div>

      {subjectsWithTopics.length === 0 && (
        <div className="text-center py-14 text-slate-500">
          <i className="ti ti-books text-3xl block mb-2" />
          <p className="text-sm">No topics for this exam yet.</p>
          <button onClick={onAddClick} className="mt-3 text-purple-400 text-sm hover:underline">+ Add topics</button>
        </div>
      )}

      {subjectsWithTopics.map(sub => {
        const sTopics = bySubject[sub._id] || []
        const sDone   = sTopics.filter(t => t.done).length
        const sPct    = sTopics.length ? Math.round((sDone / sTopics.length) * 100) : 0
        const isOpen  = !collapsed[sub._id]

        return (
          <div key={sub._id} className="bg-slate-800/40 border border-slate-700/40 rounded-xl overflow-hidden">
            {/* Subject header */}
            <button
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-700/30 transition-colors text-left"
              onClick={() => setCollapsed(p => ({ ...p, [sub._id]: !p[sub._id] }))}
            >
              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: sub.color || '#f97316' }} />
              <span className="flex-1 text-sm font-medium text-white">{sub.name}</span>
              <span className="text-xs text-slate-400 tabular-nums">{sDone}/{sTopics.length}</span>
              <div className="w-20 h-1 bg-slate-700 rounded-full overflow-hidden mx-2">
                <div className="h-full rounded-full" style={{ width: `${sPct}%`, background: sub.color || '#f97316' }} />
              </div>
              <span className="text-xs text-slate-300 w-8 text-right tabular-nums">{sPct}%</span>
              <i className={`ti ${isOpen ? 'ti-chevron-up' : 'ti-chevron-down'} text-slate-500 text-sm ml-1`} />
            </button>

            {/* Topics list */}
            {isOpen && (
              <ul className="border-t border-slate-700/40 divide-y divide-slate-700/30">
                {sTopics.map((topic, idx) => (
                  <TopicItem
                    key={topic._id}
                    topic={topic}
                    index={idx + 1}
                    onToggle={() => onToggle(topic._id, topic.done)}
                    onDelete={() => onDelete(topic._id)}
                  />
                ))}
              </ul>
            )}
          </div>
        )
      })}
    </div>
  )
}