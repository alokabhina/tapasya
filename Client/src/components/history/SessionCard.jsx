// src/components/history/SessionCard.jsx
// Premium redesign: table-row layout on desktop, card on mobile
// — Subject colored glow dot + name
// — Duration in orange monospace
// — Date + time range with icons
// — Edit/Delete action buttons
// — Mobile swipe-left to delete (preserved)
// — Subtle row hover with left border accent
// props: session, index, onEdit, onDelete

import { useRef, useState } from 'react';
import { formatDuration } from '../../utils/time';

function formatTime(ts) {
  if (!ts) return '--';
  const d = ts?.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatDateShort(ts) {
  if (!ts) return '';
  const d = ts?.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

const SWIPE_THRESHOLD = 72;

export default function SessionCard({ session, index = 0, onEdit, onDelete }) {
  const [offsetX, setOffsetX]   = useState(0);
  const [swiping, setSwiping]   = useState(false);
  const [hovered, setHovered]   = useState(false);
  const touchRef = useRef({ startX: 0, startY: 0, active: false });

  function onTouchStart(e) {
    touchRef.current = { startX: e.touches[0].clientX, startY: e.touches[0].clientY, active: true };
    setSwiping(false);
  }
  function onTouchMove(e) {
    if (!touchRef.current.active) return;
    const dx = e.touches[0].clientX - touchRef.current.startX;
    const dy = e.touches[0].clientY - touchRef.current.startY;
    if (Math.abs(dy) > Math.abs(dx)) { touchRef.current.active = false; return; }
    if (dx < 0) { setSwiping(true); setOffsetX(Math.max(dx, -SWIPE_THRESHOLD * 1.5)); }
  }
  function onTouchEnd() {
    touchRef.current.active = false;
    if (offsetX < -SWIPE_THRESHOLD) onDelete?.(session.id);
    setOffsetX(0);
    setSwiping(false);
  }

  const swipePct = Math.min(Math.abs(offsetX) / SWIPE_THRESHOLD, 1);
  const color    = session.subjectColor || '#f97316';

  return (
    <div className="relative overflow-hidden">

      {/* Swipe delete bg */}
      <div
        className="absolute inset-0 flex items-center justify-end px-5"
        style={{ backgroundColor: `rgba(239,68,68,${swipePct * 0.85})` }}
        aria-hidden="true"
      >
        <i className="ti ti-trash text-white text-base" />
      </div>

      {/* Main row */}
      <div
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        style={{
          transform: `translateX(${offsetX}px)`,
          transition: swiping ? 'none' : 'transform 0.25s ease',
          animationDelay: `${index * 30}ms`,
          borderLeft: hovered ? `2px solid ${color}` : '2px solid transparent',
        }}
        className={[
          'relative flex items-center gap-4 px-4 py-4 transition-all duration-200',
          hovered ? 'bg-[#0f1a27]' : 'bg-transparent',
        ].join(' ')}
      >
        {/* ── Subject ── */}
        <div className="flex-1 min-w-0 flex items-center gap-3">
          {/* Glowing dot */}
          <div
            className="w-3 h-3 rounded-full flex-shrink-0"
            style={{
              backgroundColor: color,
              boxShadow: hovered ? `0 0 8px 2px ${color}55` : 'none',
              transition: 'box-shadow 0.2s',
            }}
          />
          <div className="min-w-0">
            <p className="text-[13px] font-semibold text-slate-200 truncate" style={{ fontFamily: "'Sora', sans-serif" }}>
              {session.subjectName || 'Unknown'}
            </p>
            {session.notes && (
              <p className="text-[11px] text-slate-600 truncate mt-0.5">{session.notes}</p>
            )}
          </div>
        </div>

        {/* ── Duration ── */}
        <div className="w-24 flex-shrink-0 text-center md:text-left">
          <span
            className="text-[15px] font-bold tracking-tight"
            style={{ color: '#f97316', fontFamily: 'monospace' }}
          >
            {formatDuration(session.duration || session.durationSeconds || 0)}
          </span>
        </div>

        {/* ── Date & Time ── */}
        <div className="hidden md:flex flex-col gap-0.5 flex-shrink-0 min-w-[150px]">
          <div className="flex items-center gap-1.5 text-[12px] text-slate-400">
            <i className="ti ti-calendar text-slate-600 text-xs" />
            {formatDateShort(session.startTime)}
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-slate-600">
            <i className="ti ti-clock text-slate-700 text-xs" />
            {formatTime(session.startTime)} – {formatTime(session.endTime)}
          </div>
        </div>

        {/* ── Actions ── */}
        <div
          className="flex items-center gap-1.5 flex-shrink-0 transition-opacity duration-200"
          style={{ opacity: hovered ? 1 : 0.3 }}
        >
          <button
            onClick={() => onEdit?.(session)}
            className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 flex items-center justify-center transition-colors group"
            aria-label="Edit session"
          >
            <i className="ti ti-pencil text-slate-400 group-hover:text-slate-200 text-xs" />
          </button>
          <button
            onClick={() => onDelete?.(session._id || session.id)}
            className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-red-900/60 flex items-center justify-center transition-colors group"
            aria-label="Delete session"
          >
            <i className="ti ti-trash text-slate-400 group-hover:text-red-400 text-xs" />
          </button>
        </div>
      </div>
    </div>
  );
}