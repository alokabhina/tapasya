// src/components/history/SessionCard.jsx
// Session row: subject dot + name + date + start→end + duration + notes
// edit + delete buttons, mobile swipe-left = delete
// props: session, onEdit, onDelete

import { useRef, useState } from 'react';
import { formatDuration } from '../../utils/time';

function formatTime(ts) {
  if (!ts) return '--';
  const d = ts?.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatDate(ts) {
  if (!ts) return '';
  const d = ts?.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

const SWIPE_THRESHOLD = 72;

export default function SessionCard({ session, onEdit, onDelete }) {
  const [offsetX, setOffsetX] = useState(0);
  const [swiping, setSwiping] = useState(false);
  const touchRef = useRef({ startX: 0, startY: 0, active: false });

  // ── Swipe handlers ──────────────────────────────────────────────────────────
  function onTouchStart(e) {
    touchRef.current = {
      startX: e.touches[0].clientX,
      startY: e.touches[0].clientY,
      active: true,
    };
    setSwiping(false);
  }

  function onTouchMove(e) {
    if (!touchRef.current.active) return;
    const dx = e.touches[0].clientX - touchRef.current.startX;
    const dy = e.touches[0].clientY - touchRef.current.startY;
    // Only horizontal swipe
    if (Math.abs(dy) > Math.abs(dx)) { touchRef.current.active = false; return; }
    if (dx < 0) {
      setSwiping(true);
      setOffsetX(Math.max(dx, -SWIPE_THRESHOLD * 1.5));
    }
  }

  function onTouchEnd() {
    touchRef.current.active = false;
    if (offsetX < -SWIPE_THRESHOLD) {
      // Trigger delete
      onDelete?.(session.id);
    }
    setOffsetX(0);
    setSwiping(false);
  }

  const swipeProgress = Math.min(Math.abs(offsetX) / SWIPE_THRESHOLD, 1);

  return (
    <div className="relative overflow-hidden rounded-xl">
      {/* Red delete bg revealed on swipe */}
      <div
        className="absolute inset-0 flex items-center justify-end px-5 rounded-xl"
        style={{ backgroundColor: `rgba(239,68,68,${swipeProgress * 0.9})` }}
        aria-hidden="true"
      >
        <i className="ti ti-trash text-white text-lg" />
      </div>

      {/* Main card */}
      <div
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        style={{
          transform: `translateX(${offsetX}px)`,
          transition: swiping ? 'none' : 'transform 0.25s ease',
        }}
        className="relative bg-slate-800/70 border border-slate-700/50 rounded-xl px-4 py-3.5 flex items-start gap-3"
      >
        {/* Subject dot */}
        <div
          className="w-2.5 h-2.5 rounded-full flex-shrink-0 mt-1.5"
          style={{ backgroundColor: session.subjectColor || '#f97316' }}
        />

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm font-medium text-slate-200 truncate">
              {session.subjectName || 'Unknown'}
            </p>
            <span className="text-orange-400 text-sm font-medium font-timer flex-shrink-0">
              {formatDuration(session.duration || 0)}
            </span>
          </div>

          <p className="text-xs text-slate-500 mt-0.5">
            {formatDate(session.startTime)} · {formatTime(session.startTime)} → {formatTime(session.endTime)}
          </p>

          {session.notes && (
            <p className="text-xs text-slate-600 mt-1 truncate">{session.notes}</p>
          )}
        </div>

        {/* Desktop action buttons */}
        <div className="hidden md:flex items-center gap-1 flex-shrink-0 ml-1">
          <button
            onClick={() => onEdit?.(session)}
            className="w-7 h-7 rounded-lg bg-slate-700 hover:bg-slate-600 flex items-center justify-center transition-colors"
            aria-label="Edit session"
          >
            <i className="ti ti-pencil text-xs text-slate-300" />
          </button>
          <button
            onClick={() => onDelete?.(session.id)}
            className="w-7 h-7 rounded-lg bg-slate-700 hover:bg-red-900/60 flex items-center justify-center transition-colors"
            aria-label="Delete session"
          >
            <i className="ti ti-trash text-xs text-slate-300 hover:text-red-400" />
          </button>
        </div>
      </div>
    </div>
  );
}