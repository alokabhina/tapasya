// src/components/layout/MiniPlayer.jsx
// FEATURE: Document Picture-in-Picture (PiP) + transparent floating pill
// Desktop: draggable pill + PiP button (documentPictureInPicture)
// Mobile: minimized state persisted in timerStore — survives page navigation
// NOTE: Browser PiP window ka URL bar browser-controlled hai, JS se remove nahi ho sakta
// CHANGES: More transparent bg (0.40 opacity), minimal compact size, reduced padding/buttons

import { useRef, useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import useTimerStore from '@/store/timerStore';
import { useTimer } from '@/hooks/useTimer';
import { formatDuration } from '@/utils/time';

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

  // Goal: 30 minutes = full ring (1800 seconds)
  const GOAL_SECONDS = 30 * 60;

  function updatePipContent() {
    const pipWin = pipWindowRef.current;
    if (!pipWin || pipWin.closed) { setPipOpen(false); return; }

    const s = useTimerStore.getState();
    const ring = pipWin.document.getElementById('pip-ring');
    const treeEl = pipWin.document.getElementById('tree-emoji');

    const R = 38;
    const CIRC = 2 * Math.PI * R;
    const progress = Math.min(s.elapsed / GOAL_SECONDS, 1);
    const paused = s.isPaused;

    if (ring) {
      ring.style.strokeDashoffset = CIRC * (1 - progress);
      ring.style.stroke = paused ? '#94a3b8' : (s.subjectColor || '#f97316');
    }
    if (treeEl) {
      // Grow tree: seedling → sprout → sapling → tree
      if (progress >= 0.75) treeEl.textContent = '🌳';
      else if (progress >= 0.5) treeEl.textContent = '🌿';
      else if (progress >= 0.25) treeEl.textContent = '🌱';
      else treeEl.textContent = '🌱';
      treeEl.style.filter = paused ? 'grayscale(0.6)' : 'none';
    }
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
      // Wider pill: tree icon + progress ring left, stop button right
      const pipWin = await window.documentPictureInPicture.requestWindow({ width: 220, height: 64 });
      pipWindowRef.current = pipWin;
      setPipOpen(true);

      const R = 38;
      const CIRC = 2 * Math.PI * R; // ~238.76
      const initProgress = Math.min(elapsed / GOAL_SECONDS, 1);
      const initOffset = CIRC * (1 - initProgress);

      const style = pipWin.document.createElement('style');
      style.textContent = `
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
          background: linear-gradient(135deg, #0a1628 0%, #0f1f4a 40%, #1a1060 70%, #0d0a2e 100%);
          height: 100vh; overflow: hidden;
          display: flex; align-items: center; justify-content: space-between;
          padding: 0 10px;
          user-select: none;
          position: relative;
        }
        body::before {
          content: '';
          position: absolute; inset: 0;
          background:
            radial-gradient(ellipse at 20% 50%, rgba(59,130,246,0.18) 0%, transparent 60%),
            radial-gradient(ellipse at 80% 50%, rgba(99,102,241,0.15) 0%, transparent 60%);
          pointer-events: none;
        }
        #tree-wrap {
          position: relative;
          width: 52px; height: 52px;
          flex-shrink: 0;
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
        #ring-svg {
          position: absolute; top: 0; left: 0;
          width: 52px; height: 52px;
          transform: rotate(-90deg);
        }
        #bg-ring {
          fill: none; stroke: rgba(99,130,246,0.15);
          stroke-width: 3;
        }
        #pip-ring {
          fill: none;
          stroke: ${color};
          stroke-width: 3;
          stroke-linecap: round;
          stroke-dasharray: ${CIRC};
          stroke-dashoffset: ${initOffset};
          transition: stroke-dashoffset 1s linear, stroke 0.3s;
        }
        #tree-emoji {
          position: absolute;
          top: 50%; left: 50%;
          transform: translate(-50%, -50%);
          font-size: 22px;
          line-height: 1;
        }
        #pip-stop {
          width: 40px; height: 40px;
          border-radius: 10px;
          background: rgba(127,29,29,0.6);
          border: 1px solid rgba(239,68,68,0.3);
          cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
          transition: background 0.15s, transform 0.1s;
        }
        #pip-stop:hover { background: rgba(185,28,28,0.7); }
        #pip-stop:active { transform: scale(0.92); }
        #stop-icon {
          width: 14px; height: 14px;
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
        <div id="tree-wrap">
          <svg id="ring-svg" viewBox="0 0 84 84" xmlns="http://www.w3.org/2000/svg">
            <circle id="bg-ring" cx="42" cy="42" r="${R}" />
            <circle id="pip-ring" cx="42" cy="42" r="${R}" />
          </svg>
          <div id="tree-emoji">🌱</div>
        </div>
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