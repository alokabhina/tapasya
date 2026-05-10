// src/components/calendar/DayDetail.jsx
// Bottom sheet for tapped day — lists all sessions (subject, time, duration), total at top
// props: date (YYYY-MM-DD), sessions[], onClose

import { useEffect, useRef } from 'react';
import { formatDuration, formatHours } from '../../utils/time';

function formatTime(ts) {
  if (!ts) return '--';
  const d = ts?.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatDate(str) {
  if (!str) return '';
  const [y, m, d] = str.split('-');
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

export default function DayDetail({ date, sessions = [], onClose }) {
  const sheetRef = useRef(null);
  const totalSec = sessions.reduce((s, sess) => s + (sess.duration || 0), 0);

  // Close on backdrop click
  function handleBackdrop(e) {
    if (e.target === e.currentTarget) onClose?.();
  }

  // Close on Escape
  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') onClose?.(); }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  if (!date) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center
                 bg-black/60 backdrop-blur-sm"
      onClick={handleBackdrop}
    >
      <div
        ref={sheetRef}
        className="w-full max-w-lg bg-[#1a2234] rounded-t-2xl md:rounded-2xl
                   border border-slate-700/50 shadow-2xl
                   max-h-[80vh] flex flex-col"
      >
        {/* Handle bar (mobile) */}
        <div className="flex justify-center pt-3 pb-1 md:hidden">
          <div className="w-10 h-1 bg-slate-700 rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-start justify-between px-5 py-4 border-b border-slate-800">
          <div>
            <p className="text-slate-200 font-semibold text-sm">{formatDate(date)}</p>
            <p className="text-orange-400 text-xs mt-0.5 font-medium">
              {sessions.length} session{sessions.length !== 1 ? 's' : ''} · {formatHours(totalSec)} total
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center transition-colors ml-4 mt-0.5"
            aria-label="Close"
          >
            <i className="ti ti-x text-xs text-slate-400" />
          </button>
        </div>

        {/* Session list */}
        <div className="flex-1 overflow-y-auto px-5 py-3 space-y-2">
          {sessions.length === 0 ? (
            <p className="text-slate-500 text-sm text-center py-8">No sessions recorded</p>
          ) : (
            sessions.map((sess, i) => (
              <div
                key={sess.id || i}
                className="flex items-center gap-3 p-3 rounded-xl bg-slate-800/60"
              >
                {/* Subject color dot */}
                <div
                  className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: sess.subjectColor || '#f97316' }}
                />

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-200 truncate">
                    {sess.subjectName || 'Unknown subject'}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {formatTime(sess.startTime)} → {formatTime(sess.endTime)}
                  </p>
                  {sess.notes && (
                    <p className="text-xs text-slate-600 mt-1 truncate">{sess.notes}</p>
                  )}
                </div>

                {/* Duration */}
                <div className="text-right flex-shrink-0">
                  <p className="text-orange-400 text-sm font-medium font-timer">
                    {formatDuration(sess.duration || 0)}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer total */}
        {sessions.length > 0 && (
          <div className="px-5 py-3 border-t border-slate-800 flex justify-between items-center">
            <span className="text-xs text-slate-500">Total study time</span>
            <span className="text-orange-400 font-semibold text-sm font-timer">
              {formatHours(totalSec)}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}