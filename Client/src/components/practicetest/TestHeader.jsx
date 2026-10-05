// src/components/practicetest/TestHeader.jsx
// Top bar of the live engine. Compact single row on phones:
//   [title ......] [timer] [pause] [SUBMIT TEST] [palette] [⋯ menu]
// Less-used tools (A-/A+, calculator, report, fullscreen, exit) fold into the
// ⋯ menu below md and show inline from md up (tablets / desktop).
//
// "Submit Test" lives here on purpose — finish the WHOLE test straight from
// the top bar, from any section, without hunting for the palette.
//
// Pure/presentational. The countdown itself is <LiveTimer/> (self-ticking).

import { useState } from 'react'
import LiveTimer from './LiveTimer'

const iconBtn =
  'w-8 h-8 shrink-0 rounded-lg border border-slate-300 text-slate-500 flex items-center justify-center active:bg-slate-100 hover:bg-slate-50'

export default function TestHeader({
  title,
  deadlineRef,
  timerPaused,
  timerResetKey,
  onTimerExpire,
  hasCalculator,
  showCalculator,
  onToggleCalculator,
  onPauseClick,
  onToggleFullscreen,
  onExitClick,
  onReportClick,
  fontScale,
  onFontScaleChange,
  onSubmitTestClick,
  onOpenPalette, // only passed when the palette is a drawer (< lg)
  submitting,
}) {
  const [menuOpen, setMenuOpen] = useState(false)
  const closeThen = (fn) => () => { setMenuOpen(false); fn?.() }

  const fontButtons = onFontScaleChange && (
    <div className="flex items-center rounded-lg border border-slate-300 overflow-hidden shrink-0">
      <button type="button" onClick={() => onFontScaleChange(-1)} disabled={fontScale <= 0} title="Decrease text size"
        className="w-8 h-8 flex items-center justify-center text-slate-600 text-xs font-bold active:bg-slate-100 disabled:opacity-30 border-r border-slate-300">A-</button>
      <button type="button" onClick={() => onFontScaleChange(1)} disabled={fontScale >= 3} title="Increase text size"
        className="w-8 h-8 flex items-center justify-center text-slate-600 text-sm font-bold active:bg-slate-100 disabled:opacity-30">A+</button>
    </div>
  )

  return (
    <header className="relative shrink-0 flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-4 py-2 bg-white border-b border-slate-200 shadow-sm pt-[max(0.5rem,env(safe-area-inset-top))]">
      <div className="flex items-center gap-2 min-w-0 flex-1">
        <div className="hidden sm:flex w-8 h-8 rounded-full bg-tapasya-orange text-white font-black text-xs items-center justify-center shrink-0">TP</div>
        <h1 className="text-[13px] sm:text-base font-bold text-slate-800 truncate">{title}</h1>
      </div>

      {/* tablet / desktop: tools inline */}
      <div className="hidden md:flex items-center gap-2">
        {fontButtons}
        {onReportClick && (
          <button type="button" onClick={onReportClick} title="Report an issue" className={`${iconBtn} hover:text-red-500 hover:border-red-300`}>
            <i className="ti ti-flag-3 text-base" />
          </button>
        )}
        {hasCalculator && (
          <button type="button" onClick={onToggleCalculator} title="Calculator" aria-pressed={showCalculator}
            className={`${iconBtn} ${showCalculator ? '!bg-tapasya-orange/10 !border-tapasya-orange text-tapasya-orange' : ''}`}>
            <i className="ti ti-calculator text-base" />
          </button>
        )}
      </div>

      <LiveTimer deadlineRef={deadlineRef} paused={timerPaused} resetKey={timerResetKey} onExpire={onTimerExpire} />

      <button type="button" onClick={onPauseClick} title="Pause"
        className="h-8 px-2.5 sm:px-3 shrink-0 rounded-lg border border-slate-300 text-slate-700 text-[13px] font-semibold active:bg-slate-100 hover:bg-slate-50 flex items-center gap-1">
        <i className="ti ti-player-pause text-base" />
        <span className="hidden sm:inline">Pause</span>
      </button>

      <button type="button" onClick={onSubmitTestClick} disabled={submitting} title="Submit the whole test"
        className="h-8 px-3 sm:px-3.5 shrink-0 rounded-lg bg-blue-600 text-white text-xs sm:text-[13px] font-bold active:bg-blue-800 hover:bg-blue-700 disabled:opacity-60 flex items-center gap-1.5">
        <i className="ti ti-circle-check text-base sm:hidden" />
        <span className="sm:hidden">Submit</span>
        <span className="hidden sm:inline">Submit Test</span>
      </button>

      <div className="hidden md:flex items-center gap-2">
        <button type="button" onClick={onToggleFullscreen} title="Fullscreen" className={iconBtn}><i className="ti ti-arrows-maximize text-base" /></button>
        <button type="button" onClick={onExitClick} title="Exit Test" className={`${iconBtn} hover:text-red-500 hover:border-red-300`}><i className="ti ti-door-exit text-base" /></button>
      </div>

      {onOpenPalette && (
        <button type="button" onClick={onOpenPalette} title="Question palette" className={iconBtn}>
          <i className="ti ti-layout-grid text-base" />
        </button>
      )}

      {/* phone: overflow menu */}
      <button type="button" onClick={() => setMenuOpen((v) => !v)} title="More" aria-expanded={menuOpen} className={`${iconBtn} md:hidden`}>
        <i className="ti ti-dots-vertical text-base" />
      </button>

      {menuOpen && (
        <>
          <button type="button" aria-label="Close menu" className="fixed inset-0 z-40 cursor-default" onClick={() => setMenuOpen(false)} />
          <div className="absolute right-2 top-full mt-1 z-50 w-60 rounded-2xl border border-slate-200 bg-white shadow-xl p-2 md:hidden">
            {onFontScaleChange && (
              <div className="flex items-center justify-between px-3 py-2">
                <span className="text-sm text-slate-600 font-medium">Text size</span>
                {fontButtons}
              </div>
            )}
            {hasCalculator && (
              <MenuRow icon="ti-calculator" label="Calculator" onClick={closeThen(onToggleCalculator)} />
            )}
            <MenuRow icon="ti-flag-3" label="Report an issue" onClick={closeThen(onReportClick)} />
            <MenuRow icon="ti-arrows-maximize" label="Fullscreen" onClick={closeThen(onToggleFullscreen)} />
            <MenuRow icon="ti-door-exit" label="Exit test" danger onClick={closeThen(onExitClick)} />
          </div>
        </>
      )}
    </header>
  )
}

function MenuRow({ icon, label, onClick, danger }) {
  return (
    <button type="button" onClick={onClick}
      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium active:bg-slate-100 ${danger ? 'text-red-600' : 'text-slate-700'}`}>
      <i className={`ti ${icon} text-lg`} /> {label}
    </button>
  )
}