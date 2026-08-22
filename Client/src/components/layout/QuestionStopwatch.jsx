// src/components/layout/QuestionStopwatch.jsx
// Question-solving ke liye stopwatch miniplayer.
// Study timer (MiniPlayer.jsx) se poori tarah independent — apna alag store
// (stopwatchStore.js) use krta hai, isliye study timer par koi asar nahi padta.
// Flow: Home se "openWidget" -> chota panel dikhta hai -> Start dabao -> chalu ->
// Lap dabao -> current time split ho kr list me save ho jata hai, stopwatch chalta rehta hai ->
// Stop dabao -> ruk jata hai (laps review ke liye rehte hain) -> Reset se 00:00.
// "Float on top" (Document Picture-in-Picture) — browser tab ke bahar, poore laptop
// screen par (kisi bhi app ke upar) alag chota window ban jata hai, bilkul study
// timer ke miniplayer jaisa. Isi PiP window se hi Lap/Pause/Stop control ho sakta hai.

import { useRef, useState, useEffect } from 'react';
import useStopwatchStore from '@/store/stopwatchStore';

const PIP_SUPPORTED = 'documentPictureInPicture' in window;

function fmt(totalSeconds) {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export default function QuestionStopwatch() {
  const open        = useStopwatchStore((s) => s.open);
  const minimized    = useStopwatchStore((s) => s.minimized);
  const isRunning    = useStopwatchStore((s) => s.isRunning);
  const isPaused     = useStopwatchStore((s) => s.isPaused);
  const elapsed      = useStopwatchStore((s) => s.elapsed);
  const laps         = useStopwatchStore((s) => s.laps);

  const start        = useStopwatchStore((s) => s.start);
  const pause        = useStopwatchStore((s) => s.pause);
  const resume       = useStopwatchStore((s) => s.resume);
  const lap          = useStopwatchStore((s) => s.lap);
  const stop         = useStopwatchStore((s) => s.stop);
  const reset        = useStopwatchStore((s) => s.reset);
  const closeWidget  = useStopwatchStore((s) => s.closeWidget);
  const toggleMinimized = useStopwatchStore((s) => s.toggleMinimized);

  const tick = useStopwatchStore((s) => s.tick);

  const color = '#22d3ee'; // cyan — study timer (orange) se visually alag

  // ── Wall-clock accurate ticking, sirf running+not-paused hone par ─────────
  useEffect(() => {
    if (!isRunning || isPaused) return;
    tick();
    const id = setInterval(tick, 250);
    return () => clearInterval(id);
  }, [isRunning, isPaused, tick]);

  // ═══════════════════════════════════════════════════════════════════════
  // Document Picture-in-Picture — real OS-level floating window
  // ═══════════════════════════════════════════════════════════════════════
  const [pipOpen, setPipOpen] = useState(false);
  const pipWindowRef = useRef(null);
  const pipTimerRef  = useRef(null);

  useEffect(() => {
    if (!pipOpen || !pipWindowRef.current) return;
    updatePipContent();
    pipTimerRef.current = setInterval(updatePipContent, 250);
    return () => clearInterval(pipTimerRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pipOpen]);

  // Live-sync PiP content jab bhi elapsed/laps/running state badle
  useEffect(() => { if (pipOpen) updatePipContent(); }, [elapsed, isRunning, isPaused, laps.length, pipOpen]);

  useEffect(() => {
    if (!open && pipOpen) closePip();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function updatePipContent() {
    const pipWin = pipWindowRef.current;
    if (!pipWin || pipWin.closed) { setPipOpen(false); return; }
    const s = useStopwatchStore.getState();

    const timeEl = pipWin.document.getElementById('sw-time');
    if (timeEl) {
      timeEl.textContent = fmt(s.elapsed);
      timeEl.style.opacity = s.isPaused ? '0.5' : '1';
    }
    const startBtn = pipWin.document.getElementById('sw-start');
    const pauseBtn = pipWin.document.getElementById('sw-pause');
    const lapBtn   = pipWin.document.getElementById('sw-lap');
    const stopBtn  = pipWin.document.getElementById('sw-stop');
    if (startBtn) startBtn.style.display = s.isRunning ? 'none' : 'flex';
    if (pauseBtn) {
      pauseBtn.style.display = s.isRunning ? 'flex' : 'none';
      pauseBtn.innerHTML = s.isPaused
        ? '<div class="sw-icon-play"></div>'
        : '<div class="sw-icon-pause"><span></span><span></span></div>';
    }
    if (lapBtn) { lapBtn.style.display = s.isRunning ? 'flex' : 'none'; lapBtn.disabled = s.isPaused; }
    if (stopBtn) stopBtn.style.display = s.isRunning ? 'flex' : 'none';

    const lapsEl = pipWin.document.getElementById('sw-laps');
    if (lapsEl) {
      lapsEl.innerHTML = [...s.laps].reverse().slice(0, 4).map(
        (l) => `<div class="sw-lap-row"><span>Q${l.no}</span><span>${fmt(l.lapTime)}</span></div>`
      ).join('');
    }
  }

  async function openPip() {
    if (!PIP_SUPPORTED) return;
    try {
      const pipWin = await window.documentPictureInPicture.requestWindow({ width: 190, height: 210 });
      pipWindowRef.current = pipWin;
      setPipOpen(true);

      const style = pipWin.document.createElement('style');
      style.textContent = `
        * { box-sizing: border-box; margin: 0; padding: 0; font-family: ui-sans-serif, system-ui; }
        body {
          background: linear-gradient(135deg, rgba(10,22,40,0.92) 0%, rgba(10,15,30,0.96) 100%);
          height: 100vh; overflow: hidden; padding: 10px 12px;
          display: flex; flex-direction: column; gap: 6px; user-select: none;
        }
        .sw-header { display:flex; align-items:center; justify-content:space-between; }
        .sw-label { font-size: 10px; letter-spacing: .05em; text-transform: uppercase; color: ${color}; font-weight: 700; }
        #sw-time { text-align:center; font-family: ui-monospace, monospace; font-size: 30px; font-weight: 700; color: ${color}; letter-spacing: 1px; padding: 4px 0; }
        .sw-controls { display:flex; gap:6px; }
        .sw-btn { flex:1; height:32px; border-radius:8px; border:1px solid ${color}40; background:${color}20; color:${color};
          font-size:12px; font-weight:600; display:flex; align-items:center; justify-content:center; gap:4px; cursor:pointer; }
        .sw-btn:disabled { opacity:.4; cursor:default; }
        .sw-btn-icon { width:32px; flex:none; background:rgba(255,255,255,0.08); border:none; color:#e2e8f0; }
        .sw-btn-stop { width:32px; flex:none; background:rgba(127,29,29,0.5); border:1px solid rgba(239,68,68,0.4); color:#fca5a5; }
        .sw-icon-play { width:0; height:0; border-style:solid; border-width:6px 0 6px 9px; border-color:transparent transparent transparent currentColor; }
        .sw-icon-pause { display:flex; gap:3px; }
        .sw-icon-pause span { width:3px; height:11px; background:currentColor; border-radius:1px; }
        .sw-icon-stop { width:11px; height:11px; background:currentColor; border-radius:2px; }
        #sw-laps { flex:1; overflow-y:auto; border-top:1px solid rgba(255,255,255,0.08); padding-top:4px; }
        .sw-lap-row { display:flex; justify-content:space-between; font-size:10.5px; color:#94a3b8; padding:2px 0; font-family: ui-monospace, monospace; }
      `;
      pipWin.document.head.appendChild(style);

      pipWin.document.body.innerHTML = `
        <div class="sw-header"><span class="sw-label">⏱ Stopwatch</span></div>
        <div id="sw-time">00:00</div>
        <div class="sw-controls">
          <button id="sw-start" class="sw-btn"><div class="sw-icon-play"></div>&nbsp;Start</button>
          <button id="sw-pause" class="sw-btn sw-btn-icon" style="display:none"><div class="sw-icon-play"></div></button>
          <button id="sw-lap" class="sw-btn" style="display:none">Lap</button>
          <button id="sw-stop" class="sw-btn sw-btn-stop" style="display:none"><div class="sw-icon-stop"></div></button>
        </div>
        <div id="sw-laps"></div>
      `;

      pipWin.document.getElementById('sw-start').onclick = () => start();
      pipWin.document.getElementById('sw-pause').onclick = () => {
        const s = useStopwatchStore.getState();
        s.isPaused ? resume() : pause();
      };
      pipWin.document.getElementById('sw-lap').onclick = () => lap();
      pipWin.document.getElementById('sw-stop').onclick = () => stop();

      pipWin.addEventListener('pagehide', () => {
        setPipOpen(false);
        pipWindowRef.current = null;
        clearInterval(pipTimerRef.current);
      });

      updatePipContent();
    } catch (err) {
      console.error('Stopwatch PiP failed:', err);
    }
  }

  function closePip() {
    if (pipWindowRef.current && !pipWindowRef.current.closed) pipWindowRef.current.close();
    pipWindowRef.current = null;
    clearInterval(pipTimerRef.current);
    setPipOpen(false);
  }

  // ── Drag support (desktop) ─────────────────────────────────────────────
  const pillRef = useRef(null);
  const drag = useRef({ on: false, sx: 0, sy: 0, ox: 0, oy: 0 });
  const didDrag = useRef(false);
  const [pos, setPos] = useState({ x: null, y: null });

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

  if (!open) return null;

  const glassStyle = {
    background: 'rgba(10,15,30,0.55)',
    backdropFilter: 'blur(18px)',
    WebkitBackdropFilter: 'blur(18px)',
  };
  const floatStyle = pos.x !== null && !pipOpen
    ? { position: 'fixed', left: pos.x, top: pos.y, right: 'auto', bottom: 'auto' }
    : {};
  // Study timer bottom-center/top-right use krta hai — ye left side me rakha, taaki dono
  // ek saath chal saken bina overlap ke.
  const posClass = "z-50 fixed bottom-[calc(56px+64px+env(safe-area-inset-bottom,0px))] left-3 md:bottom-auto md:top-4 md:left-4";

  // ── PiP active badge (browser me sirf ek chota indicator, asli widget bahar khula hai) ──
  if (pipOpen) {
    return (
      <div className={posClass}>
        <button
          onClick={closePip}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] transition-all"
          style={{ ...glassStyle, border: `1px solid ${color}30`, color }}
        >
          <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: color }} />
          Stopwatch floating · close
        </button>
      </div>
    );
  }

  // ── Minimized pill ──────────────────────────────────────────────────────
  if (minimized) {
    return (
      <div
        ref={pillRef}
        style={{ ...floatStyle, ...glassStyle, border: `1px solid ${color}33` }}
        onMouseDown={onMouseDown}
        onClick={() => { if (!didDrag.current) toggleMinimized(); }}
        className={`${posClass} flex items-center gap-1.5 px-2.5 py-1 rounded-full cursor-pointer select-none transition-all active:scale-95`}
      >
        <i className="ti ti-stopwatch text-[11px]" style={{ color }} />
        <span className="text-[11px] font-mono font-bold" style={{ color }}>{fmt(elapsed)}</span>
        {isRunning && !isPaused && <div className="w-1.5 h-1.5 rounded-full animate-pulse flex-shrink-0" style={{ backgroundColor: color }} />}
        <i className="ti ti-chevron-down text-[9px] text-slate-500" />
      </div>
    );
  }

  // ── Full panel ───────────────────────────────────────────────────────────
  return (
    <div
      ref={pillRef}
      style={{
        ...floatStyle, ...glassStyle,
        border: `1px solid ${color}2e`,
        boxShadow: `0 4px 20px rgba(0,0,0,0.35), 0 0 0 1px ${color}12`,
      }}
      className={`${posClass} w-[190px] rounded-2xl select-none overflow-hidden`}
    >
      {/* Drag handle / header */}
      <div
        onMouseDown={onMouseDown}
        className="flex items-center justify-between px-3 pt-2.5 pb-1.5 cursor-grab active:cursor-grabbing"
      >
        <span className="flex items-center gap-1.5 text-[10px] uppercase tracking-wide font-semibold" style={{ color }}>
          <i className="ti ti-stopwatch text-xs" /> Stopwatch
        </span>
        <div className="flex items-center gap-1">
          {PIP_SUPPORTED && (
            <button onClick={openPip} className="w-5 h-5 rounded-full flex items-center justify-center" style={{ background: `${color}18`, border: `1px solid ${color}30` }} title="Float on top (whole laptop screen)">
              <i className="ti ti-picture-in-picture text-[10px]" style={{ color }} />
            </button>
          )}
          <button onClick={toggleMinimized} className="w-5 h-5 rounded-full flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.07)' }}>
            <i className="ti ti-minus text-[10px] text-slate-300" />
          </button>
          <button onClick={closeWidget} className="w-5 h-5 rounded-full flex items-center justify-center" style={{ background: 'rgba(127,29,29,0.35)' }}>
            <i className="ti ti-x text-[10px] text-red-400" />
          </button>
        </div>
      </div>

      {/* Time display */}
      <div className="px-3 pb-2 text-center">
        <span className="text-[26px] font-mono font-bold leading-none tracking-wide" style={{ color, opacity: isPaused ? 0.55 : 1 }}>
          {fmt(elapsed)}
        </span>
      </div>

      {/* Controls */}
      <div className="px-3 pb-2.5 flex items-center gap-1.5">
        {!isRunning ? (
          <button
            onClick={start}
            className="flex-1 h-8 rounded-lg flex items-center justify-center gap-1 text-[11px] font-semibold"
            style={{ background: `${color}20`, border: `1px solid ${color}40`, color }}
          >
            <i className="ti ti-player-play text-xs" /> Start
          </button>
        ) : (
          <>
            <button
              onClick={isPaused ? resume : pause}
              className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ background: 'rgba(255,255,255,0.07)' }}
              title={isPaused ? 'Resume' : 'Pause'}
            >
              <i className={`ti ${isPaused ? 'ti-player-play' : 'ti-player-pause'} text-xs text-slate-200`} />
            </button>
            <button
              onClick={lap}
              disabled={isPaused}
              className="flex-1 h-8 rounded-lg flex items-center justify-center gap-1 text-[11px] font-semibold disabled:opacity-40"
              style={{ background: `${color}20`, border: `1px solid ${color}40`, color }}
            >
              <i className="ti ti-flag-3 text-xs" /> Lap
            </button>
            <button
              onClick={stop}
              className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ background: 'rgba(127,29,29,0.35)' }}
              title="Stop"
            >
              <i className="ti ti-player-stop text-xs text-red-400" />
            </button>
          </>
        )}
        {!isRunning && (elapsed > 0 || laps.length > 0) && (
          <button
            onClick={reset}
            className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: 'rgba(255,255,255,0.07)' }}
            title="Reset"
          >
            <i className="ti ti-refresh text-xs text-slate-300" />
          </button>
        )}
      </div>

      {/* Laps list */}
      {laps.length > 0 && (
        <div className="max-h-[130px] overflow-y-auto border-t border-white/5 px-3 py-1.5 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
          {[...laps].reverse().map((l) => (
            <div key={l.id} className="flex items-center justify-between py-0.5 text-[10.5px]">
              <span className="text-slate-500">Q{l.no}</span>
              <span className="font-mono text-slate-300">{fmt(l.lapTime)}</span>
              <span className="font-mono text-slate-500">{fmt(l.totalTime)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
