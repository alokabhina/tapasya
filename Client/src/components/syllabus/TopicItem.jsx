// components/syllabus/TopicItem.jsx
import { useState } from 'react'

export default function TopicItem({ topic, index, onToggle, onDelete }) {
  const [deleting, setDeleting] = useState(false)

  const handleDelete = async () => {
    setDeleting(true)
    await onDelete()
    setDeleting(false)
  }

  return (
    <li className="flex items-center gap-3 px-4 py-2.5 group hover:bg-slate-700/20 transition-colors">
      {/* Tick checkbox */}
      <button
        onClick={onToggle}
        className={`flex-shrink-0 w-5 h-5 rounded-md border transition-all ${
          topic.done
            ? 'bg-purple-600 border-purple-600 text-white'
            : 'bg-transparent border-slate-600 hover:border-purple-400'
        }`}
        aria-label={topic.done ? 'Mark undone' : 'Mark done'}
      >
        {topic.done && <i className="ti ti-check text-[11px] block text-center leading-5" />}
      </button>

      {/* Index */}
      <span className="text-xs text-slate-600 tabular-nums w-5 text-right flex-shrink-0">{index}.</span>

      {/* Name */}
      <span className={`flex-1 text-sm transition-colors ${
        topic.done ? 'line-through text-slate-500' : 'text-slate-200'
      }`}>
        {topic.name}
      </span>

      {/* Source badge */}
      {topic.source !== 'manual' && (
        <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-700 text-slate-400 hidden group-hover:inline">
          {topic.source === 'pdf' ? 'PDF' : 'paste'}
        </span>
      )}

      {/* Delete */}
      <button
        onClick={handleDelete}
        disabled={deleting}
        className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-500 hover:text-red-400 ml-1"
        aria-label="Delete topic"
      >
        <i className="ti ti-trash text-sm" />
      </button>
    </li>
  )
}