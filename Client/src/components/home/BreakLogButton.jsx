// src/components/home/BreakLogButton.jsx
// Manual break tracker trigger (Lunch/Walk/Nap/Rest/Custom) for Home.
// Deliberately never imports timerStore or useTimer — this cannot, even
// by accident, read or write anything related to study sessions.
//
// The overlay's open/closed state lives in breakUIStore (not local state)
// so the break ring in the Study Time card can open this exact same
// overlay too — one control surface, shown from two entry points.

import { useState, useEffect } from 'react';
import useBreakLogStore from '@/store/breakLogStore';
import useBreakUIStore from '@/store/breakUIStore';
import { saveBreak } from '@/api/breaks';
import { getStudyDayString } from '@/utils/time';
import { BREAK_TYPES } from '@/constants/breakTypes';

function formatElapsed(sec) {
  const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
  return h > 0
    ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
    : `${m}:${String(s).padStart(2, '0')}`;
}

export default function BreakLogButton() {
  const open = useBreakUIStore((s) => s.overlayOpen);
  const openOverlay = useBreakUIStore((s) => s.openOverlay);
  const closeOverlay = useBreakUIStore((s) => s.closeOverlay);
  const { isBreakRunning, breakType, breakLabel, breakStartTime, startBreak, stopBreak } = useBreakLogStore();
  const [customLabel, setCustomLabel] = useState('');
  const [elapsed, setElapsed] = useState(0);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isBreakRunning || !breakStartTime) return;
    const tick = () => setElapsed(Math.floor((Date.now() - new Date(breakStartTime).getTime()) / 1000));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [isBreakRunning, breakStartTime]);

  async function handleStop() {
    setSaving(true);
    const endTime = new Date().toISOString();
    const duration = Math.floor((new Date(endTime) - new Date(breakStartTime)) / 1000);
    try {
      if (duration >= 5) {
        await saveBreak({
          type: breakType, label: breakLabel,
          startTime: breakStartTime, endTime, duration,
          date: getStudyDayString(),
        });
      }
    } catch (e) {
      console.error('[Break] save failed', e);
    } finally {
      stopBreak();
      setSaving(false);
      closeOverlay();
    }
  }

  return (
    <>
      {/* Small always-visible trigger — deliberately tiny */}
      <button
        onClick={openOverlay}
        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full border text-xs font-medium
                    ${isBreakRunning
                      ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
                      : 'bg-slate-800/60 border-slate-700 text-slate-300'}`}
      >
        <i className="ti ti-coffee text-[13px]" />
        {isBreakRunning ? formatElapsed(elapsed) : 'Break'}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center"
          onClick={closeOverlay}
        >
          {/* Dimmed backdrop, not full black — per request */}
          <div className="absolute inset-0 bg-black/45" />

          <div
            onClick={(e) => e.stopPropagation()}
            className="relative w-full sm:max-w-sm bg-[#0f172a] border border-slate-700 rounded-t-3xl sm:rounded-3xl p-5 pb-8 sm:pb-5"
          >
            {!isBreakRunning ? (
              <>
                <p className="text-white font-semibold mb-3">Start a break</p>
                <div className="grid grid-cols-3 gap-2">
                  {BREAK_TYPES.map((t) => (
                    <button
                      key={t.value}
                      onClick={() => {
                        if (t.value === 'custom') return; // wait for label input below
                        startBreak(t.value);
                        closeOverlay();
                      }}
                      className="flex flex-col items-center gap-1 py-3 rounded-xl bg-slate-800/60 border border-slate-700 text-slate-300 hover:bg-slate-800"
                    >
                      <i className={`ti ${t.icon} text-lg`} style={{ color: t.color }} />
                      <span className="text-[11px]">{t.label}</span>
                    </button>
                  ))}
                </div>
                <div className="flex gap-2 mt-3">
                  <input
                    value={customLabel}
                    onChange={(e) => setCustomLabel(e.target.value)}
                    placeholder="Custom break label…"
                    className="flex-1 bg-[#1e293b] border border-slate-700 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-purple-500"
                  />
                  <button
                    onClick={() => { if (!customLabel.trim()) return; startBreak('custom', customLabel.trim()); setCustomLabel(''); closeOverlay(); }}
                    className="px-4 py-2 rounded-xl bg-purple-600 text-white text-sm font-medium disabled:opacity-50"
                    disabled={!customLabel.trim()}
                  >
                    Start
                  </button>
                </div>
              </>
            ) : (
              <>
                <p className="text-white font-semibold mb-1">
                  {breakType === 'custom' ? breakLabel : BREAK_TYPES.find(t => t.value === breakType)?.label} break running
                </p>
                <p className="text-3xl font-bold text-emerald-300 tabular-nums my-3">{formatElapsed(elapsed)}</p>
                <button
                  onClick={handleStop}
                  disabled={saving}
                  className="w-full py-3 rounded-xl bg-rose-500 text-white text-sm font-medium disabled:opacity-50"
                >
                  {saving ? 'Saving…' : 'End break'}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}