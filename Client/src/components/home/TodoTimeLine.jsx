// src/components/home/TodoTimeLine.jsx
// Study-time card ke andar ek chhoti line: abhi kaunsa timed todo chal raha hai
// ya agla kaunsa aane wala hai.
//   - live     -> "Abhi: <todo> · 12:00 PM – 1:00 PM"   (orange, pulse dot)
//   - upcoming -> "Next: <todo> · 1:00 PM · 25 min mein" (slate)
// Kuch nahi dikhta agar aaj koi pending timed todo nahi hai.
// Tap karne pe /todo khulta hai.

import { useEffect, useState } from 'react'
import { formatClock12, formatTimeWindow, getTimeWindowState, getTodoStartMs } from '@/utils/todoTime'

function formatIn(mins) {
  if (mins < 1) return 'ab'
  if (mins < 60) return `${mins} min mein`
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return m ? `${h}h ${m}m mein` : `${h}h mein`
}

export default function TodoTimeLine({ todos = [], onClick }) {
  const [nowMs, setNowMs] = useState(() => Date.now())

  useEffect(() => {
    const id = setInterval(() => setNowMs(Date.now()), 30000)
    return () => clearInterval(id)
  }, [])

  const timed = todos
    .filter((t) => t.startTime && !t.done && !t.completed)
    .map((t) => ({ todo: t, state: getTimeWindowState(t, nowMs), start: getTodoStartMs(t) }))
    .filter((x) => x.start != null)

  const live = timed.filter((x) => x.state === 'live').sort((a, b) => a.start - b.start)[0]
  const next = timed.filter((x) => x.state === 'upcoming').sort((a, b) => a.start - b.start)[0]
  const pick = live || next
  if (!pick) return null

  const { todo } = pick
  const isLive = !!live

  return (
    <button
      type="button"
      onClick={onClick}
      title="Todo page kholo"
      className={`mt-2.5 max-w-full inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] border transition-colors ${
        isLive
          ? 'bg-orange-500/15 border-orange-500/30 text-orange-300 hover:bg-orange-500/20'
          : 'bg-slate-800/50 border-slate-700/60 text-slate-400 hover:text-slate-300'
      }`}
    >
      {isLive ? (
        <span className="relative flex h-1.5 w-1.5 shrink-0">
          <span className="absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75 animate-ping" />
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-orange-400" />
        </span>
      ) : (
        <i className="ti ti-alarm text-[11px] shrink-0" />
      )}
      <span className="font-semibold shrink-0">{isLive ? 'Abhi:' : 'Next:'}</span>
      <span className="truncate">{todo.text}</span>
      <span className="shrink-0 opacity-80">
        · {isLive ? formatTimeWindow(todo) : `${formatClock12(todo.startTime)} · ${formatIn(Math.max(0, Math.ceil((pick.start - nowMs) / 60000)))}`}
      </span>
    </button>
  )
}