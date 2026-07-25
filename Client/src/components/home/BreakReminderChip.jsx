// src/components/home/BreakReminderChip.jsx
// The one "break" ring in the Study Time card. Two sources feed it, never
// both shown at once — a running manual break (lunch/walk/etc, started via
// the header's Break button) takes priority; otherwise the auto post-session
// nudge (countdown → overdue) is shown. Both are pure UI: navigation for
// manual breaks and reminder timing never touch study session data.

import { useState, useEffect } from 'react';
import { useBreakReminder, formatMMSS } from '@/hooks/useBreakReminder';
import useBreakReminderStore from '@/store/breakReminderStore';
import useBreakLogStore from '@/store/breakLogStore';
import useBreakUIStore from '@/store/breakUIStore';
import { breakTypeMeta } from '@/constants/breakTypes';
import CircularProgress from './CircularProgress';

const NUDGE_SECONDS = 5 * 60;
const EXTEND_OPTIONS = [
  { label: '+30s', seconds: 30 },
  { label: '+1m',  seconds: 60 },
  { label: '+2m',  seconds: 120 },
  { label: '+5m',  seconds: 300 },
];

function formatElapsed(sec) {
  const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
  return h > 0
    ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
    : `${m}:${String(s).padStart(2, '0')}`;
}

export default function BreakReminderChip({ size = 96 }) {
  const openOverlay = useBreakUIStore((s) => s.openOverlay);
  const { isBreakRunning, breakType, breakStartTime } = useBreakLogStore();
  const reminder = useBreakReminder();
  const [manualElapsed, setManualElapsed] = useState(0);
  const [showExtend, setShowExtend] = useState(false);

  useEffect(() => {
    if (!isBreakRunning || !breakStartTime) return;
    const tick = () => setManualElapsed(Math.floor((Date.now() - new Date(breakStartTime).getTime()) / 1000));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [isBreakRunning, breakStartTime]);

  // ── 1) A manual break (lunch/walk/etc.) is running — show it here too ────
  if (isBreakRunning) {
    const meta = breakTypeMeta(breakType);
    return (
      <button
        onClick={openOverlay}
        className="block p-0 m-0 border-0 bg-transparent shrink-0 leading-none animate-pulse"
      >
        <CircularProgress size={size} pct={100} color={meta.color} trackColor="rgba(255,255,255,0.1)">
          <i className={`ti ${meta.icon} text-[15px]`} style={{ color: meta.color }} />
          <span className="text-[12px] font-semibold leading-tight" style={{ color: meta.color }}>
            {formatElapsed(manualElapsed)}
          </span>
          <span className="text-[9px] text-slate-500 leading-none">{meta.label}</span>
        </CircularProgress>
      </button>
    );
  }

  // ── 2) Otherwise, the auto post-session nudge (if any) ───────────────────
  if (!reminder) return null;
  const { phase, seconds } = reminder;
  const overdue = phase === 'overdue';
  const almostUp = phase === 'countdown' && seconds <= 60;
  const pct = overdue ? 100 : ((NUDGE_SECONDS - seconds) / NUDGE_SECONDS) * 100;
  const color = overdue ? '#f43f5e' : almostUp ? '#f59e0b' : '#38bdf8';

  function handleClick() {
    // Only clickable once overdue — clicking while the countdown is still
    // running navigated to /timer and caused the page to hang, so the
    // click is disabled entirely until the reminder goes overdue.
    if (!overdue) return;
    setShowExtend((v) => !v);
  }

  return (
    <div className="relative shrink-0">
      <button
        onClick={handleClick}
        disabled={!overdue}
        className={`block p-0 m-0 border-0 bg-transparent shrink-0 leading-none ${overdue ? 'animate-pulse' : 'cursor-default'}`}
      >
        <CircularProgress size={size} pct={pct} color={color} trackColor="rgba(255,255,255,0.1)">
          <i className={`ti ${overdue ? 'ti-alarm' : 'ti-cup'} text-[15px]`} style={{ color }} />
          <span className="text-[12px] font-semibold leading-tight" style={{ color }}>
            {overdue ? `+${formatMMSS(seconds)}` : formatMMSS(seconds)}
          </span>
          <span className="text-[9px] text-slate-500 leading-none">
            {overdue ? (showExtend ? 'tap to add' : 'overdue · tap +') : 'break'}
          </span>
        </CircularProgress>
      </button>

      {showExtend && (
        <div
          className="absolute z-20 top-full left-1/2 -translate-x-1/2 mt-2 flex gap-1 bg-[#0f172a] border border-slate-700 rounded-xl p-1.5 shadow-lg"
        >
          {EXTEND_OPTIONS.map((opt) => (
            <button
              key={opt.seconds}
              onClick={() => {
                useBreakReminderStore.getState().addExtension(opt.seconds);
                setShowExtend(false);
              }}
              className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-[10px] font-medium whitespace-nowrap"
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}