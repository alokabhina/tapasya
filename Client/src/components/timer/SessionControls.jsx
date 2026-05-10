// SessionControls.jsx
// Stop / Pause / Switch buttons
// Stop → saveSession + navigate home
// Pause → useTimer.pause()
// import useTimer, timerStore, sessions.js

import { useNavigate } from 'react-router-dom';
import { useTimerStore } from '../../store/timerStore';
import { useTimer } from '../../hooks/useTimer';

export default function SessionControls() {
  const isRunning   = useTimerStore((s) => s.isRunning);
  const isPaused    = useTimerStore((s) => s.isPaused);
  const { stop, pause, resume } = useTimer();
  const navigate = useNavigate();

  async function handleStop() {
    await stop(); // saves session inside useTimer → sessions.js
    navigate('/');
  }

  function handleSwitch() {
    // Timer chalta rehega MiniPlayer mein, home pe new subject se start kar sakte hain
    navigate('/');
  }

  if (!isRunning && !isPaused) return null;

  return (
    <div className="flex items-center justify-center gap-4">
      {/* Stop */}
      <button
        onClick={handleStop}
        className="flex flex-col items-center gap-1.5 group"
        aria-label="Stop session"
      >
        <div className="w-14 h-14 rounded-full bg-red-950/60 border border-red-800/40 flex items-center justify-center
                        group-hover:bg-red-900/70 transition-colors">
          <i className="ti ti-player-stop text-xl text-red-400" />
        </div>
        <span className="text-[11px] text-slate-500">Stop</span>
      </button>

      {/* Pause / Resume */}
      <button
        onClick={isPaused ? resume : pause}
        className="flex flex-col items-center gap-1.5 group"
        aria-label={isPaused ? 'Resume session' : 'Pause session'}
      >
        <div className="w-16 h-16 rounded-full bg-orange-500 flex items-center justify-center
                        group-hover:bg-orange-600 transition-colors shadow-lg shadow-orange-900/40">
          <i className={`ti ${isPaused ? 'ti-player-play' : 'ti-player-pause'} text-2xl text-white`} />
        </div>
        <span className="text-[11px] text-slate-400">{isPaused ? 'Resume' : 'Pause'}</span>
      </button>

      {/* Switch subject */}
      <button
        onClick={handleSwitch}
        className="flex flex-col items-center gap-1.5 group"
        aria-label="Switch subject"
      >
        <div className="w-14 h-14 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center
                        group-hover:bg-slate-700 transition-colors">
          <i className="ti ti-switch-horizontal text-xl text-slate-300" />
        </div>
        <span className="text-[11px] text-slate-500">Switch</span>
      </button>
    </div>
  );
}