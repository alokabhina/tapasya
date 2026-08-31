// src/components/watch/StartTimerPrompt.jsx
// A small nudge that shows up after ~30s of an actual YT video (or PDF, via
// the twin component) being actively watched/read, so study time actually
// gets tracked instead of silently going unrecorded because nobody
// remembered to hit Start on the timer first. Picking a subject starts the
// timer right there; "Skip" just dismisses it for this session.

import { useState } from 'react'

export default function StartTimerPrompt({ subjects = [], onPick, onSkip, minimized = false }) {
  const [starting, setStarting] = useState(null) // subject id currently being started (brief spinner)

  async function handlePick(subject) {
    const id = subject.id || subject._id
    setStarting(id)
    await onPick?.(subject)
  }

  if (minimized) {
    // Not enough room in the mini/corner player for the full picker —
    // just a compact "start timer?" chip instead.
    return (
      <div className="absolute bottom-1.5 left-1.5 right-1.5 z-10 flex items-center gap-1.5 bg-black/85 backdrop-blur-sm rounded-lg px-2 py-1.5">
        <i className="ti ti-clock-play text-orange-400 text-xs shrink-0" />
        <span className="text-[10px] text-slate-200 flex-1 truncate">Timer start karo?</span>
        <button onClick={onSkip} className="text-slate-500 hover:text-slate-300 shrink-0">
          <i className="ti ti-x text-xs" />
        </button>
      </div>
    )
  }

  return (
    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 w-[calc(100%-2rem)] max-w-md">
      <div className="bg-[#141d2e]/95 backdrop-blur border border-slate-700 rounded-2xl shadow-2xl shadow-black/50 p-3.5">
        <div className="flex items-center justify-between mb-2.5">
          <div className="flex items-center gap-1.5">
            <i className="ti ti-clock-play text-orange-400 text-sm" />
            <p className="text-sm text-slate-200 font-medium">Study timer start karo?</p>
          </div>
          <button onClick={onSkip} className="text-slate-500 hover:text-slate-300 w-6 h-6 rounded-md hover:bg-slate-800 flex items-center justify-center">
            <i className="ti ti-x text-sm" />
          </button>
        </div>

        {subjects.length === 0 ? (
          <p className="text-xs text-slate-500">Pehle koi subject bana lo Home page pe, phir timer track ho payega.</p>
        ) : (
          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-0.5">
            {subjects.map((s) => {
              const id = s.id || s._id
              const isStarting = starting === id
              return (
                <button
                  key={id}
                  onClick={() => handlePick(s)}
                  disabled={starting !== null}
                  className="shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-medium transition-colors disabled:opacity-60"
                  style={{
                    backgroundColor: `${s.color || '#f97316'}1a`,
                    borderColor: `${s.color || '#f97316'}44`,
                    color: s.color || '#f97316',
                  }}
                >
                  {isStarting
                    ? <div className="w-3 h-3 rounded-full border-2 border-current border-t-transparent animate-spin" />
                    : <i className="ti ti-book text-xs" />}
                  {s.name}
                </button>
              )
            })}
          </div>
        )}

        <button onClick={onSkip} className="text-[11px] text-slate-500 hover:text-slate-300 mt-2.5 block mx-auto">
          Abhi nahi
        </button>
      </div>
    </div>
  )
}