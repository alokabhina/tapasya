// src/components/mocktest/WeakTopicsList.jsx
import { useState } from 'react'
import { addTodo } from '@/api/todos'
import { getStudyDayString } from '@/utils/time'

export default function WeakTopicsList({ topics = [], variant = 'weak', examName }) {
  const [remindedFor, setRemindedFor] = useState(new Set())

  async function handleRemind(topic) {
    try {
      await addTodo({
        text: `Practice: ${topic.name} (${topic.sectionName}) — ${examName}`,
        date: getStudyDayString(),
        priority: 'High',
        done: false,
        linkedMockWeakTopic: {
          sectionName: topic.sectionName,
          topicName: topic.name,
          correctPct: topic.avgCorrectPct,
          examName,
        },
      })
      setRemindedFor((prev) => new Set(prev).add(topic.name + topic.sectionName))
    } catch {
      alert('Todo add nahi ho paya')
    }
  }

  if (!topics.length) {
    return <p className="text-xs text-slate-600 py-4 text-center">Abhi topic-wise data nahi hai</p>
  }

  const isWeak = variant === 'weak'

  return (
    <div className="space-y-2">
      {topics.map((t) => {
        const key = t.name + t.sectionName
        const reminded = remindedFor.has(key)
        return (
          <div key={key} className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg bg-slate-800/50 border border-slate-800">
            <div className="min-w-0">
              <p className="text-xs text-slate-200 truncate">{t.name}</p>
              <p className="text-[10px] text-slate-500 mt-0.5">{t.sectionName} · {t.seen} baar dekha</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className={`text-xs font-semibold tabular-nums ${isWeak ? 'text-red-400' : 'text-green-400'}`}>
                {t.avgCorrectPct}%
              </span>
              {isWeak && (
                <button
                  onClick={() => handleRemind(t)}
                  disabled={reminded}
                  title="Todo mein reminder add karo"
                  className={`w-7 h-7 rounded-md flex items-center justify-center transition-colors ${reminded ? 'bg-green-500/20 text-green-400' : 'bg-slate-800 hover:bg-orange-500/20 text-slate-400 hover:text-orange-400'}`}
                >
                  <i className={`ti ${reminded ? 'ti-check' : 'ti-bell-plus'} text-xs`} />
                </button>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}