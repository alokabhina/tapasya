// src/components/watch/StopTimerPrompt.jsx
// Shown right after closing a video that the "start timer?" nudge was used
// on — closing the video is exactly when it's easiest to forget the timer
// is still quietly running in the background. One tap either stops it or
// dismisses this and lets it keep going.

export default function StopTimerPrompt({ subjectName, elapsedLabel, onStop, onKeepGoing }) {
  return (
    <div className="fixed bottom-20 sm:bottom-6 left-1/2 -translate-x-1/2 z-[130] w-[calc(100%-2rem)] max-w-sm">
      <div className="bg-[#141d2e] border border-slate-700 rounded-2xl shadow-2xl shadow-black/50 p-3.5 flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-orange-500/15 border border-orange-500/20 flex items-center justify-center shrink-0">
          <i className="ti ti-player-stop text-orange-400 text-base" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm text-slate-200 font-medium">Timer stop karu?</p>
          <p className="text-xs text-slate-500 truncate">
            {subjectName || 'Timer'} abhi bhi chal raha hai{elapsedLabel ? ` · ${elapsedLabel}` : ''}
          </p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={onKeepGoing}
            className="px-2.5 py-1.5 rounded-lg text-xs text-slate-400 hover:text-slate-200 hover:bg-slate-800"
          >
            Chalne do
          </button>
          <button
            onClick={onStop}
            className="px-3 py-1.5 rounded-lg bg-orange-500 hover:bg-orange-600 text-white text-xs font-semibold"
          >
            Stop karo
          </button>
        </div>
      </div>
    </div>
  )
}