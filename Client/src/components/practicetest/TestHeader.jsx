// src/components/practicetest/TestHeader.jsx
// Top bar of the live engine — mirrors the reference UI header (plan doc
// Section 7.1): title, ticking "Time Left" box (section-wise, resets fresh
// on every section switch), Pause, fullscreen toggle, and an on-screen
// calculator icon that only appears when the *current* section has
// hasCalculator: true.
//
// Light/white theme — matches the reference (Guidely) screenshot 1:1,
// unlike the rest of the (dark) app shell. The live engine is a dedicated
// full-screen route with no sidebar, so it's free to run its own theme.
//
// Pure/presentational — PracticeTestPlay.jsx owns the actual countdown
// (via the existing hooks/useCountdown.js) and just hands secondsLeft down.
//
// Round-2 Issue B: Exit moved here as a small icon (next to Pause /
// Fullscreen) — its old spot in the section-tabs row now holds the
// Submit button instead.

function formatTime(totalSeconds) {
  const s = Math.max(0, Math.ceil(totalSeconds || 0))
  const m = Math.floor(s / 60)
  const sec = s % 60
  return `${String(m).padStart(2, '0')} : ${String(sec).padStart(2, '0')}`
}

export default function TestHeader({
  title,
  secondsLeft,
  lowTimeThresholdSec = 120,
  hasCalculator,
  showCalculator,
  onToggleCalculator,
  onPauseClick,
  onToggleFullscreen,
  onExitClick,
}) {
  const isLow = secondsLeft <= lowTimeThresholdSec

  return (
    <div className="flex items-center justify-between gap-3 px-3 sm:px-5 py-2.5 bg-white border-b border-slate-200 shadow-sm">
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="w-8 h-8 rounded-full bg-tapasya-orange text-white font-black text-xs flex items-center justify-center shrink-0">TP</div>
        <h1 className="text-sm sm:text-base font-bold text-slate-800 truncate">{title}</h1>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        {hasCalculator && (
          <button
            type="button"
            onClick={onToggleCalculator}
            title="Calculator"
            aria-pressed={showCalculator}
            className={`w-9 h-9 rounded-lg flex items-center justify-center border transition-colors ${
              showCalculator
                ? 'bg-tapasya-orange/10 border-tapasya-orange text-tapasya-orange'
                : 'border-slate-300 text-slate-500 hover:bg-slate-50'
            }`}
          >
            <i className="ti ti-calculator text-lg" />
          </button>
        )}

        <div
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border font-mono text-sm font-bold tabular-nums ${
            isLow ? 'border-red-400 text-red-600 bg-red-50' : 'border-slate-300 text-slate-700 bg-slate-50'
          }`}
        >
          <i className="ti ti-clock text-base" />
          <span className="hidden xs:inline">Time Left:</span>
          {formatTime(secondsLeft)}
        </div>

        <button
          type="button"
          onClick={onPauseClick}
          className="px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 text-sm font-semibold hover:bg-slate-50"
        >
          Pause
        </button>

        <button
          type="button"
          onClick={onToggleFullscreen}
          title="Fullscreen"
          className="w-9 h-9 rounded-lg border border-slate-300 text-slate-500 hover:bg-slate-50 flex items-center justify-center"
        >
          <i className="ti ti-arrows-maximize text-lg" />
        </button>

        <button
          type="button"
          onClick={onExitClick}
          title="Exit Test"
          className="w-9 h-9 rounded-lg border border-slate-300 text-slate-500 hover:text-red-500 hover:border-red-300 hover:bg-red-50 flex items-center justify-center"
        >
          <i className="ti ti-door-exit text-lg" />
        </button>
      </div>
    </div>
  )
}