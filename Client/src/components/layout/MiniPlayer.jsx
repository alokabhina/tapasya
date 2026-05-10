// src/components/layout/MiniPlayer.jsx
// FEATURE: Document Picture-in-Picture (PiP) — browser ke upar floating window
// Chahe koi bhi tab ho, YouTube ho, ya koi bhi app — timer hamesha visible rahega
// Minimize button → PiP window open karo (always-on-top)
// PiP window mein: pause/resume/stop buttons + live timer

import { useRef, useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import useTimerStore from '@/store/timerStore';
import { useTimer } from '@/hooks/useTimer';
import { formatDuration } from '@/utils/time';

// PiP support check
const PIP_SUPPORTED = 'documentPictureInPicture' in window;

export default function MiniPlayer() {
  const isRunning    = useTimerStore((s) => s.isRunning);
  const isPaused     = useTimerStore((s) => s.isPaused);
  const elapsed      = useTimerStore((s) => s.elapsed);
  const subjectName  = useTimerStore((s) => s.subjectName);
  const subjectColor = useTimerStore((s) => s.subjectColor);

  const { pause, resume, stop } = useTimer();
  const navigate = useNavigate();
  const location = useLocation();

  // Timer page pe MiniPlayer nahi dikhana — wahan full UI hai
  const isTimerPage = location.pathname === '/timer';

  const [pipOpen, setPipOpen]     = useState(false);
  const [minimized, setMinimized] = useState(false);
  const pipWindowRef  = useRef(null);
  const pipTimerRef   = useRef(null); // interval to update PiP display

  // Drag support (desktop, non-PiP mode)
  const pillRef  = useRef(null);
  const drag     = useRef({ on: false, sx: 0, sy: 0, ox: 0, oy: 0 });
  const didDrag  = useRef(false);
  const [pos, setPos] = useState({ x: null, y: null });

  // ── Update PiP window content every second ──────────────────────────────────
  useEffect(() => {
    if (!pipOpen || !pipWindowRef.current) return;
    updatePipContent();
    pipTimerRef.current = setInterval(updatePipContent, 1000);
    return () => clearInterval(pipTimerRef.current);
  }, [pipOpen, elapsed, isRunning, isPaused, subjectName, subjectColor]);

  // ── Close PiP if timer stops ─────────────────────────────────────────────────
  useEffect(() => {
    if (!isRunning && !isPaused && pipOpen) {
      closePip();
    }
  }, [isRunning, isPaused]);

  function updatePipContent() {
    const pipWin = pipWindowRef.current;
    if (!pipWin || pipWin.closed) { setPipOpen(false); return; }

    const timerEl = pipWin.document.getElementById('pip-timer');
    const subEl   = pipWin.document.getElementById('pip-subject');
    const dotEl   = pipWin.document.getElementById('pip-dot');
    const stateEl = pipWin.document.getElementById('pip-state');
    const pauseEl = pipWin.document.getElementById('pip-pause');

    const currentElapsed = useTimerStore.getState().elapsed;
    const currentPaused  = useTimerStore.getState().isPaused;
    const currentName    = useTimerStore.getState().subjectName;
    const currentColor   = useTimerStore.getState().subjectColor;

    if (timerEl) timerEl.textContent = formatDuration(currentElapsed);
    const timerBigEl = pipWin.document.getElementById('pip-timer-big');
    if (timerBigEl) timerBigEl.textContent = formatDuration(currentElapsed);
    if (subEl)   subEl.textContent   = currentName || 'Tapasya';
    if (dotEl)   dotEl.style.backgroundColor = currentColor || '#f97316';
    if (stateEl) stateEl.textContent = currentPaused ? '⏸ Paused' : '▶ Running';
    if (pauseEl) pauseEl.textContent = currentPaused ? '▶ Resume' : '⏸ Pause';
  }

  async function openPip() {
    if (!PIP_SUPPORTED) {
      // Fallback: sirf minimize karo
      setMinimized(true);
      return;
    }
    try {
      // Open Picture-in-Picture window (160x200 px — always on top)
      const pipWin = await window.documentPictureInPicture.requestWindow({
        width: 160,
        height: 52,
      });
      pipWindowRef.current = pipWin;
      setPipOpen(true);

      // Copy Tapasya styles into PiP window
      const style = pipWin.document.createElement('style');
      style.textContent = `
        * { box-sizing: border-box; margin: 0; padding: 0; font-family: system-ui, sans-serif; }
        body {
          background: #0c1220; color: white; height: 100vh;
          overflow: hidden; user-select: none;
          display: flex; flex-direction: column;
          align-items: center; justify-content: center; cursor: default;
        }
        #compact {
          display: flex; align-items: center; gap: 7px;
          padding: 0 10px; width: 100%; justify-content: center;
        }
        #pip-dot { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; animation: pulse 1.5s infinite; }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.35} }
        #pip-timer { font-size: 22px; font-weight: 700; color: #fb923c; font-variant-numeric: tabular-nums; letter-spacing: -0.5px; line-height: 1; }
        #controls { display: none; flex-direction: column; align-items: center; gap: 4px; padding: 8px 10px 6px; width: 100%; }
        #pip-subject { font-size: 10px; color: #64748b; max-width: 140px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        #pip-timer-big { font-size: 28px; font-weight: 700; color: #fb923c; font-variant-numeric: tabular-nums; letter-spacing: -1px; line-height: 1; }
        #pip-state { font-size: 9px; color: #475569; margin-top: 1px; }
        .btn-row { display: flex; gap: 6px; margin-top: 5px; }
        button { border: none; cursor: pointer; font-size: 11px; font-weight: 600; padding: 5px 11px; border-radius: 7px; transition: opacity .12s; }
        button:active { opacity: .65; }
        #pip-pause { background: #1e293b; color: #cbd5e1; }
        #pip-stop  { background: #7f1d1d; color: #fca5a5; }
        body:hover #compact  { display: none; }
        body:hover #controls { display: flex; }
      `;
      pipWin.document.head.appendChild(style);

      // Build PiP UI — compact (timer only), hover = controls
      pipWin.document.body.innerHTML = `
        <div id="compact">
          <div id="pip-dot" style="background:${subjectColor||'#f97316'}"></div>
          <div id="pip-timer">${formatDuration(elapsed)}</div>
        </div>
        <div id="controls">
          <div id="pip-subject">${subjectName || 'Tapasya'}</div>
          <div id="pip-timer-big">${formatDuration(elapsed)}</div>
          <div id="pip-state">${isPaused ? '⏸ Paused' : '▶ Running'}</div>
          <div class="btn-row">
            <button id="pip-pause">${isPaused ? '▶' : '⏸'}</button>
            <button id="pip-stop">⏹</button>
          </div>
        </div>
      `;

      // Wire up buttons
            // Wire up buttons — they call back into main window's store
      pipWin.document.getElementById('pip-pause').onclick = () => {
        const s = useTimerStore.getState();
        if (s.isPaused) resume(); else pause();
        setTimeout(updatePipContent, 50);
      };
      pipWin.document.getElementById('pip-stop').onclick = () => {
        stop();
        closePip();
      };
      // Handle PiP window being closed by user
      pipWin.addEventListener('pagehide', () => {
        setPipOpen(false);
        pipWindowRef.current = null;
        clearInterval(pipTimerRef.current);
      });

    } catch (err) {
      console.error('PiP failed:', err);
      // Fallback
      setMinimized(true);
    }
  }

  function closePip() {
    if (pipWindowRef.current && !pipWindowRef.current.closed) {
      pipWindowRef.current.close();
    }
    pipWindowRef.current = null;
    clearInterval(pipTimerRef.current);
    setPipOpen(false);
  }

  // Drag handlers
  function onMouseDown(e) {
    if (window.innerWidth < 768 || pipOpen) return;
    didDrag.current = false;
    const rect = pillRef.current?.getBoundingClientRect();
    drag.current = { on: true, sx: e.clientX, sy: e.clientY,
                     ox: pos.x ?? rect?.left ?? 0, oy: pos.y ?? rect?.top ?? 0 };
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  }
  function onMouseMove(e) {
    if (!drag.current.on) return;
    const dx = e.clientX - drag.current.sx, dy = e.clientY - drag.current.sy;
    if (Math.abs(dx) > 4 || Math.abs(dy) > 4) didDrag.current = true;
    setPos({ x: drag.current.ox + dx, y: drag.current.oy + dy });
  }
  function onMouseUp() {
    drag.current.on = false;
    window.removeEventListener('mousemove', onMouseMove);
    window.removeEventListener('mouseup', onMouseUp);
  }

  if (!isRunning && !isPaused) return null;
  if (isTimerPage) return null;

  const floatStyle = pos.x !== null && !pipOpen
    ? { position: 'fixed', left: pos.x, top: pos.y, right: 'auto', bottom: 'auto' }
    : {};

  const baseClass = `z-50 fixed
    bottom-[calc(56px+env(safe-area-inset-bottom,0px))] left-1/2 -translate-x-1/2
    md:bottom-auto md:top-5 md:right-5 md:left-auto md:translate-x-0
    bg-slate-800/95 backdrop-blur border border-slate-700/60 shadow-xl
    flex items-center rounded-full select-none`;

  // ── Minimized pill (when PiP not supported) ──────────────────────────────────
  if (minimized && !pipOpen) {
    return (
      <div
        ref={pillRef}
        style={floatStyle}
        onMouseDown={onMouseDown}
        onClick={() => { if (!didDrag.current) setMinimized(false); }}
        className={`${baseClass} px-3 py-2 gap-2 cursor-pointer`}
        title="Expand"
      >
        <div className="w-2.5 h-2.5 rounded-full animate-pulse flex-shrink-0"
          style={{ backgroundColor: subjectColor || '#f97316' }} />
        <span className="text-xs font-mono font-semibold text-orange-400">
          {formatDuration(elapsed)}
        </span>
      </div>
    );
  }

  // ── PiP active indicator (small badge in corner) ──────────────────────────────
  if (pipOpen) {
    return (
      <div className="z-50 fixed bottom-[calc(56px+env(safe-area-inset-bottom,0px))] left-1/2 -translate-x-1/2 md:bottom-auto md:top-5 md:right-5 md:left-auto md:translate-x-0">
        <button
          onClick={closePip}
          className="flex items-center gap-2 px-3 py-2 rounded-full bg-slate-800/95 border border-orange-500/40 text-xs text-orange-400 hover:bg-slate-700 transition-colors shadow-xl"
          title="Close floating timer"
        >
          <div className="w-2 h-2 rounded-full bg-orange-400 animate-pulse" />
          PiP active · click to close
        </button>
      </div>
    );
  }

  // ── Full pill ─────────────────────────────────────────────────────────────────
  return (
    <div
      ref={pillRef}
      style={floatStyle}
      onMouseDown={onMouseDown}
      className={`${baseClass} px-3 py-2 gap-2 cursor-grab active:cursor-grabbing`}
    >
      <div className="w-2.5 h-2.5 rounded-full flex-shrink-0 animate-pulse"
        style={{ backgroundColor: subjectColor || '#f97316' }} />

      {/* Tap → timer page */}
      <button
        onClick={() => { if (!didDrag.current) navigate('/timer'); }}
        className="flex flex-col min-w-0 text-left"
      >
        {subjectName && (
          <span className="text-[10px] text-slate-400 leading-none mb-0.5 truncate max-w-[90px]">
            {subjectName}
          </span>
        )}
        <span className="text-sm font-mono font-semibold text-orange-400 leading-none">
          {formatDuration(elapsed)}
        </span>
      </button>

      {/* Pause / Resume */}
      <button
        onClick={isPaused ? resume : pause}
        className="w-7 h-7 rounded-full bg-slate-700 hover:bg-slate-600 flex items-center justify-center transition-colors flex-shrink-0"
      >
        <i className={`ti ${isPaused ? 'ti-player-play' : 'ti-player-pause'} text-xs text-slate-200`} />
      </button>

      {/* Stop */}
      <button
        onClick={stop}
        className="w-7 h-7 rounded-full bg-red-900/60 hover:bg-red-800 flex items-center justify-center transition-colors flex-shrink-0"
      >
        <i className="ti ti-player-stop text-xs text-red-400" />
      </button>

      {/* Minimize → PiP (always on top, any tab) */}
      <button
        onClick={openPip}
        className="w-7 h-7 rounded-full bg-orange-500/20 hover:bg-orange-500/40 border border-orange-500/40 flex items-center justify-center transition-colors flex-shrink-0"
        title={PIP_SUPPORTED ? 'Float on top (works on any tab!)' : 'Minimize'}
        aria-label="Picture in Picture"
      >
        <i className="ti ti-picture-in-picture text-xs text-orange-400" />
      </button>
    </div>
  );
}