// src/components/layout/ClockTimerWidget.jsx
// Clock-type (circular dial) countdown timer miniplayer — question-solving ke liye,
// stopwatch (QuestionStopwatch.jsx) jaisa hi independent, study timer ko affect nahi krta.
// Duration set karo (presets ya custom minutes) -> Start -> ring khali hoti jayegi ->
// khatam hone par beep + pulse alert.

import { useEffect, useRef, useState } from 'react';
import useClockTimerStore from '@/store/clockTimerStore';

function fmt(totalSeconds) {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

const PRESETS = [5, 10, 15, 20, 30]; // minutes

// Simple beep via WebAudio — koi asset load karne ki zarurat nahi
function playBeep() {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    const ctx = new Ctx();
    [0, 220, 440].forEach((delay) => {
      setTimeout(() => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = 880;
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
        osc.connect(gain).connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.35);
      }, delay);
    });
  } catch {}
}

export default function ClockTimerWidget() {
  const open        = useClockTimerStore((s) => s.open);
  const minimized    = useClockTimerStore((s) => s.minimized);
  const durationSec  = useClockTimerStore((s) => s.durationSec);
  const remaining    = useClockTimerStore((s) => s.remaining);
  const isRunning    = useClockTimerStore((s) => s.isRunning);
  const isPaused     = useClockTimerStore((s) => s.isPaused);
  const finished     = useClockTimerStore((s) => s.finished);

  const setDuration  = useClockTimerStore((s) => s.setDuration);
  const start        = useClockTimerStore((s) => s.start);
  const pause        = useClockTimerStore((s) => s.pause);
  const resume        = useClockTimerStore((s) => s.resume);
  const reset         = useClockTimerStore((s) => s.reset);
  const closeWidget   = useClockTimerStore((s) => s.closeWidget);
  const toggleMinimized = useClockTimerStore((s) => s.toggleMinimized);
  const acknowledgeFinish = useClockTimerStore((s) => s.acknowledgeFinish);
  const tick          = useClockTimerStore((s) => s.tick);

  useEffect(() => {
    if (!isRunning || isPaused) return;
    tick();
    const id = setInterval(tick, 250);
    return () => clearInterval(id);
  }, [isRunning, isPaused, tick]);

  useEffect(() => {
    if (finished) playBeep();
  }, [finished]);

  // ── Drag support (desktop) ─────────────────────────────────────────────
  const pillRef = useRef(null);
  const drag = useRef({ on: false, sx: 0, sy: 0, ox: 0, oy: 0 });
  const didDrag = useRef(false);
  const [pos, setPos] = useState({ x: null, y: null });

  function onMouseDown(e) {
    if (window.innerWidth < 768) return;
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

  const color = finished ? '#f87171' : '#a78bfa'; // violet — stopwatch(cyan)/study timer(orange) se alag
  const glassStyle = {
    background: 'rgba(10,15,30,0.55)',
    backdropFilter: 'blur(18px)',
    WebkitBackdropFilter: 'blur(18px)',
  };
  const floatStyle = pos.x !== null
    ? { position: 'fixed', left: pos.x, top: pos.y, right: 'auto', bottom: 'auto' }
    : {};
  // Stopwatch left side pe hai, ye right side — dono ek saath chal sakein
  const posClass = "z-50 fixed bottom-[calc(56px+64px+env(safe-area-inset-bottom,0px))] right-3 md:bottom-auto md:top-4 md:right-[76px]";

  const pct = durationSec > 0 ? remaining / durationSec : 0;
  const R = 26, CIRC = 2 * Math.PI * R;
  const dashOffset = CIRC * (1 - pct);

  // ── Minimized pill ──────────────────────────────────────────────────────
  if (minimized) {
    return (
      <div
        ref={pillRef}
        style={{ ...floatStyle, ...glassStyle, border: `1px solid ${color}33` }}
        onMouseDown={onMouseDown}
        onClick={() => { if (!didDrag.current) { toggleMinimized(); acknowledgeFinish(); } }}
        className={`${posClass} flex items-center gap-1.5 px-2.5 py-1 rounded-full cursor-pointer select-none transition-all active:scale-95 ${finished ? 'animate-pulse' : ''}`}
      >
        <i className="ti ti-clock text-[11px]" style={{ color }} />
        <span className="text-[11px] font-mono font-bold" style={{ color }}>{fmt(remaining)}</span>
        <i className="ti ti-chevron-down text-[9px] text-slate-500" />
      </div>
    );
  }

  // ── Full panel (clock-dial layout) ────────────────────────────────────────
  return (
    <div
      ref={pillRef}
      style={{
        ...floatStyle, ...glassStyle,
        border: `1px solid ${color}2e`,
        boxShadow: `0 4px 20px rgba(0,0,0,0.35), 0 0 0 1px ${color}12`,
      }}
      className={`${posClass} w-[190px] rounded-2xl select-none overflow-hidden ${finished ? 'animate-pulse' : ''}`}
    >
      {/* Header / drag handle */}
      <div
        onMouseDown={onMouseDown}
        className="flex items-center justify-between px-3 pt-2.5 pb-1.5 cursor-grab active:cursor-grabbing"
      >
        <span className="flex items-center gap-1.5 text-[10px] uppercase tracking-wide font-semibold" style={{ color }}>
          <i className="ti ti-clock text-xs" /> Timer
        </span>
        <div className="flex items-center gap-1">
          <button onClick={toggleMinimized} className="w-5 h-5 rounded-full flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.07)' }}>
            <i className="ti ti-minus text-[10px] text-slate-300" />
          </button>
          <button onClick={closeWidget} className="w-5 h-5 rounded-full flex items-center justify-center" style={{ background: 'rgba(127,29,29,0.35)' }}>
            <i className="ti ti-x text-[10px] text-red-400" />
          </button>
        </div>
      </div>

      {/* Clock dial */}
      <div className="flex justify-center py-1">
        <svg width="72" height="72" viewBox="0 0 64 64">
          <circle cx="32" cy="32" r={R} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="5" />
          <circle
            cx="32" cy="32" r={R} fill="none" stroke={color} strokeWidth="5"
            strokeDasharray={CIRC} strokeDashoffset={dashOffset} strokeLinecap="round"
            transform="rotate(-90 32 32)" style={{ transition: 'stroke-dashoffset 0.25s linear' }}
          />
          <text x="32" y="36" textAnchor="middle" fontSize="11" fontFamily="ui-monospace, monospace" fontWeight="700" fill={color}>
            {fmt(remaining)}
          </text>
        </svg>
      </div>

      {/* Idle: duration presets */}
      {!isRunning && remaining === durationSec && !finished && (
        <div className="px-3 pb-1.5 flex flex-wrap gap-1 justify-center">
          {PRESETS.map((m) => (
            <button
              key={m}
              onClick={() => setDuration(m * 60)}
              className="px-1.5 py-0.5 rounded-md text-[10px] font-medium"
              style={{
                background: durationSec === m * 60 ? `${color}25` : 'rgba(255,255,255,0.06)',
                color: durationSec === m * 60 ? color : '#94a3b8',
                border: `1px solid ${durationSec === m * 60 ? color + '40' : 'transparent'}`,
              }}
            >
              {m}m
            </button>
          ))}
        </div>
      )}

      {finished && (
        <div className="px-3 pb-1 text-center text-[10.5px] font-semibold text-red-400">Time up!</div>
      )}

      {/* Controls */}
      <div className="px-3 pb-2.5 pt-1 flex items-center gap-1.5">
        {!isRunning ? (
          <button
            onClick={() => { acknowledgeFinish(); start(); }}
            className="flex-1 h-8 rounded-lg flex items-center justify-center gap-1 text-[11px] font-semibold"
            style={{ background: `${color}20`, border: `1px solid ${color}40`, color }}
          >
            <i className="ti ti-player-play text-xs" /> Start
          </button>
        ) : (
          <>
            <button
              onClick={isPaused ? resume : pause}
              className="flex-1 h-8 rounded-lg flex items-center justify-center gap-1 text-[11px] font-semibold"
              style={{ background: `${color}20`, border: `1px solid ${color}40`, color }}
            >
              <i className={`ti ${isPaused ? 'ti-player-play' : 'ti-player-pause'} text-xs`} /> {isPaused ? 'Resume' : 'Pause'}
            </button>
          </>
        )}
        {(isRunning || remaining !== durationSec) && (
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
    </div>
  );
}