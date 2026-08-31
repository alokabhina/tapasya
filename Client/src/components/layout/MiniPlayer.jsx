// src/components/layout/MiniPlayer.jsx
// FEATURE: Document Picture-in-Picture (PiP) + transparent floating pill
// Desktop: draggable pill + PiP button (documentPictureInPicture)
// Mobile: minimized state persisted in timerStore — survives page navigation
// NOTE: Browser PiP window ka URL bar browser-controlled hai, JS se remove nahi ho sakta
// CHANGES: More transparent bg (0.40 opacity), minimal compact size, reduced padding/buttons

import { useRef, useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import useTimerStore from '@/store/timerStore';
import useWatchPlayerStore from '@/store/watchPlayerStore';
import { useTimer } from '@/hooks/useTimer';
import { formatDuration } from '@/utils/time';
import StopTimerPrompt from '@/components/watch/StopTimerPrompt';

const PIP_SUPPORTED = 'documentPictureInPicture' in window;

export default function MiniPlayer() {
  const isRunning    = useTimerStore((s) => s.isRunning);
  const isPaused     = useTimerStore((s) => s.isPaused);
  const elapsed      = useTimerStore((s) => s.elapsed);
  const subjectName  = useTimerStore((s) => s.subjectName);
  const subjectColor = useTimerStore((s) => s.subjectColor);
  const minimized    = useTimerStore((s) => s.miniPlayerMinimized);
  const setMinimized = useTimerStore((s) => s.setMiniPlayerMinimized);

  const { pause, resume, stop } = useTimer();
  const navigate  = useNavigate();
  const location  = useLocation();
  const isTimerPage = location.pathname === '/timer';

  // ── "Timer bhi stop karu?" — shown right after closing a video that the
  // 30s "start timer?" nudge was used on, since that's exactly the moment
  // it's easiest to forget the timer is still quietly running.
  const watchItem = useWatchPlayerStore((s) => s.item);
  const timerStartedForVideo = useWatchPlayerStore((s) => s.timerStartedForVideo);
  const clearTimerStartedForVideo = useWatchPlayerStore((s) => s.setTimerStartedForVideo);
  const [showStopPrompt, setShowStopPrompt] = useState(false);
  const prevWatchItemRef = useRef(null);

  useEffect(() => {
    const wasPlaying = prevWatchItemRef.current;
    prevWatchItemRef.current = watchItem;
    // Video just closed (had an item, now doesn't) — and it was this exact
    // video that started the currently-running timer.
    if (wasPlaying && !watchItem && timerStartedForVideo && isRunning) {
      setShowStopPrompt(true);
    }
  }, [watchItem, timerStartedForVideo, isRunning]);

  function handleStopTimerFromPrompt() {
    setShowStopPrompt(false);
    clearTimerStartedForVideo(false);
    stop();
  }

  function handleKeepGoingFromPrompt() {
    setShowStopPrompt(false);
    clearTimerStartedForVideo(false);
  }

  const [pipOpen, setPipOpen]     = useState(false);
  const pipWindowRef  = useRef(null);
  const pipTimerRef   = useRef(null);

  const pillRef  = useRef(null);
  const drag     = useRef({ on: false, sx: 0, sy: 0, ox: 0, oy: 0 });
  const didDrag  = useRef(false);
  const [pos, setPos] = useState({ x: null, y: null });

  const color = subjectColor || '#f97316';

  useEffect(() => {
    if (!pipOpen || !pipWindowRef.current) return;
    pipTimerRef.current = setInterval(updatePipContent, 1000);
    return () => clearInterval(pipTimerRef.current);
  }, [pipOpen]);

  useEffect(() => {
    if (!isRunning && !isPaused && pipOpen) closePip();
  }, [isRunning, isPaused]);

  function updatePipContent() {
    const pipWin = pipWindowRef.current;
    if (!pipWin || pipWin.closed) { setPipOpen(false); return; }

    const s = useTimerStore.getState();
    const paused = s.isPaused;

    const timeEl = pipWin.document.getElementById('pip-time');
    if (timeEl) {
      const m = Math.floor(s.elapsed / 60);
      const sec = s.elapsed % 60;
      timeEl.textContent = String(m).padStart(2,'0') + ':' + String(sec).padStart(2,'0');
      timeEl.style.opacity = paused ? '0.5' : '1';
    }
  }

  async function openPip() {
    if (!PIP_SUPPORTED) { setMinimized(true); return; }
    try {
      // Compact pill: just the timer + stop button (no tree/ring)
      const pipWin = await window.documentPictureInPicture.requestWindow({ width: 128, height: 52 });
      pipWindowRef.current = pipWin;
      setPipOpen(true);

      const style = pipWin.document.createElement('style');
      style.textContent = `
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
          /* Lower alpha (0.45) than before — dimmer, more see-through pill */
          background: linear-gradient(135deg, rgba(10,22,40,0.45) 0%, rgba(15,31,74,0.45) 40%, rgba(26,16,96,0.45) 70%, rgba(13,10,46,0.45) 100%);
          height: 100vh; overflow: hidden;
          display: flex; align-items: center; justify-content: space-between;
          padding: 0 10px;
          user-select: none;
          position: relative;
        }
        #pip-time {
          flex: 1;
          text-align: center;
          font-family: ui-monospace, monospace;
          font-size: 15px;
          font-weight: 700;
          color: rgba(255,255,255,0.85);
          letter-spacing: 1px;
          text-shadow: 0 0 12px rgba(99,130,246,0.6);
        }
        #pip-stop {
          width: 36px; height: 36px;
          border-radius: 10px;
          background: rgba(127,29,29,0.5);
          border: 1px solid rgba(239,68,68,0.3);
          cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
          transition: background 0.15s, transform 0.1s;
        }
        #pip-stop:hover { background: rgba(185,28,28,0.6); }
        #pip-stop:active { transform: scale(0.92); }
        #stop-icon {
          width: 13px; height: 13px;
          background: #fca5a5;
          border-radius: 3px;
        }
      `;
      pipWin.document.head.appendChild(style);

      // Format MM:SS from elapsed seconds
      const fmt = (s) => {
        const m = Math.floor(s / 60);
        const sec = s % 60;
        return String(m).padStart(2,'0') + ':' + String(sec).padStart(2,'0');
      };

      pipWin.document.body.innerHTML = `
        <div id="pip-time">${fmt(elapsed)}</div>
        <button id="pip-stop"><div id="stop-icon"></div></button>
      `;

      pipWin.document.getElementById('pip-stop').onclick = () => { stop(); closePip(); };
      pipWin.addEventListener('pagehide', () => {
        setPipOpen(false);
        pipWindowRef.current = null;
        clearInterval(pipTimerRef.current);
      });

    } catch (err) {
      console.error('PiP failed:', err);
      setMinimized(true);
    }
  }

  function closePip() {
    if (pipWindowRef.current && !pipWindowRef.current.closed) pipWindowRef.current.close();
    pipWindowRef.current = null;
    clearInterval(pipTimerRef.current);
    setPipOpen(false);
  }

  function onMouseDown(e) {
    if (window.innerWidth < 768 || pipOpen) return;
    didDrag.current = false;
    const rect = pillRef.current?.getBoundingClientRect();
    drag.current = { on: true, sx: e.clientX, sy: e.clientY, ox: pos.x ?? rect?.left ?? 0, oy: pos.y ?? rect?.top ?? 0 };
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

  if (showStopPrompt) {
    return (
      <StopTimerPrompt
        subjectName={subjectName}
        elapsedLabel={formatDuration(elapsed)}
        onStop={handleStopTimerFromPrompt}
        onKeepGoing={handleKeepGoingFromPrompt}
      />
    );
  }
  if (!isRunning && !isPaused) return null;
  if (isTimerPage) return null;

  const floatStyle = pos.x !== null && !pipOpen
    ? { position: 'fixed', left: pos.x, top: pos.y, right: 'auto', bottom: 'auto' }
    : {};

  // Shared transparent glass style — low opacity background
  const glassStyle = {
    background: 'rgba(10,15,30,0.40)',
    backdropFilter: 'blur(18px)',
    WebkitBackdropFilter: 'blur(18px)',
  };

  // Common position class
  const posClass = "z-50 fixed bottom-[calc(56px+8px+env(safe-area-inset-bottom,0px))] left-1/2 -translate-x-1/2 md:bottom-auto md:top-4 md:right-4 md:left-auto md:translate-x-0";

  // ── PiP active badge ──────────────────────────────────────────────────────────
  if (pipOpen) {
    return (
      <div className={posClass}>
        <button
          onClick={closePip}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] text-orange-400 transition-all"
          style={{ ...glassStyle, border: '1px solid rgba(249,115,22,0.18)' }}
        >
          <div className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-pulse" />
          PiP · close
        </button>
      </div>
    );
  }

  // ── Minimized pill ────────────────────────────────────────────────────────────
  if (minimized) {
    return (
      <div
        ref={pillRef}
        style={{ ...floatStyle, ...glassStyle, border: `1px solid ${color}22` }}
        onMouseDown={onMouseDown}
        onClick={() => { if (!didDrag.current) setMinimized(false); }}
        className={`${posClass} flex items-center gap-1.5 px-2.5 py-1 rounded-full cursor-pointer select-none transition-all active:scale-95`}
      >
        <div className="w-1.5 h-1.5 rounded-full animate-pulse flex-shrink-0" style={{ backgroundColor: color }} />
        <span className="text-[11px] font-mono font-bold" style={{ color }}>{formatDuration(elapsed)}</span>
        <i className="ti ti-chevron-up text-[9px] text-slate-500" />
      </div>
    );
  }

  // ── Full floating pill ────────────────────────────────────────────────────────
  return (
    <div
      ref={pillRef}
      style={{
        ...floatStyle,
        ...glassStyle,
        border: `1px solid ${color}1e`,
        boxShadow: `0 2px 14px rgba(0,0,0,0.25), 0 0 0 1px ${color}0e`,
      }}
      onMouseDown={onMouseDown}
      className={`${posClass} flex items-center rounded-full select-none px-2.5 py-1.5 gap-1.5 cursor-grab active:cursor-grabbing`}
    >
      {/* Pulsing dot */}
      <div className="w-1.5 h-1.5 rounded-full flex-shrink-0 animate-pulse" style={{ backgroundColor: color }} />

      {/* Tap → timer page */}
      <button
        onClick={() => { if (!didDrag.current) navigate('/timer'); }}
        className="flex flex-col min-w-0 text-left"
      >
        {subjectName && (
          <span className="text-[9px] text-slate-400 leading-none mb-0.5 truncate max-w-[72px]">{subjectName}</span>
        )}
        <span className="text-[13px] font-mono font-bold leading-none" style={{ color }}>{formatDuration(elapsed)}</span>
      </button>

      {/* Pause / Resume */}
      <button
        onClick={isPaused ? resume : pause}
        className="w-5 h-5 rounded-full flex items-center justify-center transition-colors flex-shrink-0"
        style={{ background: 'rgba(255,255,255,0.07)' }}
      >
        <i className={`ti ${isPaused ? 'ti-player-play' : 'ti-player-pause'} text-[10px] text-slate-200`} />
      </button>

      {/* Stop */}
      <button
        onClick={stop}
        className="w-5 h-5 rounded-full flex items-center justify-center transition-colors flex-shrink-0"
        style={{ background: 'rgba(127,29,29,0.35)' }}
      >
        <i className="ti ti-player-stop text-[10px] text-red-400" />
      </button>

      {/* PiP / Minimize */}
      <button
        onClick={openPip}
        className="w-5 h-5 rounded-full flex items-center justify-center transition-colors flex-shrink-0"
        style={{ background: `${color}15`, border: `1px solid ${color}22` }}
        title={PIP_SUPPORTED ? 'Float on top' : 'Minimize'}
      >
        <i className={`ti ${PIP_SUPPORTED ? 'ti-picture-in-picture' : 'ti-minus'} text-[10px]`} style={{ color }} />
      </button>
    </div>
  );
}