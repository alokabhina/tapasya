// src/components/todo/TaskItem.jsx
// Checkbox + text + subject tag + photo thumbnail
// swipe right=done (green), left=delete (red), touch events for mobile
// props: task, onToggle, onDelete

import { useRef, useState } from 'react';
import { useSubjectStore } from '../../store/subjectStore';

const SWIPE_THRESHOLD = 80;

export default function TaskItem({ task, onToggle, onDelete }) {
  const subjects = useSubjectStore((s) => s.subjects);
  const subject  = subjects.find((s) => s.id === task.subjectId);

  const [offsetX, setOffsetX] = useState(0);
  const [swiping, setSwiping] = useState(false);
  const touchRef = useRef({ startX: 0, startY: 0, active: false });

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
    if (Math.abs(dy) > Math.abs(dx)) { touchRef.current.active = false; return; }
    setSwiping(true);
    setOffsetX(Math.max(-SWIPE_THRESHOLD * 1.5, Math.min(SWIPE_THRESHOLD * 1.5, dx)));
  }

  function onTouchEnd() {
    touchRef.current.active = false;
    if (offsetX > SWIPE_THRESHOLD) {
      onToggle?.(task.id, !task.done);
    } else if (offsetX < -SWIPE_THRESHOLD) {
      onDelete?.(task.id);
    }
    setOffsetX(0);
    setSwiping(false);
  }

  const swipeRight = offsetX > 0;
  const swipeProg  = Math.min(Math.abs(offsetX) / SWIPE_THRESHOLD, 1);

  return (
    <div className="relative overflow-hidden rounded-xl">
      {/* Swipe backgrounds */}
      <div className="absolute inset-0 flex items-center rounded-xl overflow-hidden" aria-hidden="true">
        {/* Right = done (green) */}
        <div
          className="absolute inset-0 flex items-center pl-5"
          style={{ backgroundColor: `rgba(34,197,94,${swipeRight ? swipeProg * 0.8 : 0})` }}
        >
          <i className="ti ti-check text-white text-xl" />
        </div>
        {/* Left = delete (red) */}
        <div
          className="absolute inset-0 flex items-center justify-end pr-5"
          style={{ backgroundColor: `rgba(239,68,68,${!swipeRight ? swipeProg * 0.8 : 0})` }}
        >
          <i className="ti ti-trash text-white text-xl" />
        </div>
      </div>

      {/* Card */}
      <div
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        style={{
          transform: `translateX(${offsetX}px)`,
          transition: swiping ? 'none' : 'transform 0.25s ease',
        }}
        className={`relative flex items-start gap-3 px-4 py-3.5 rounded-xl border
          ${task.done
            ? 'bg-slate-800/30 border-slate-800/40'
            : 'bg-slate-800/70 border-slate-700/50'}`}
      >
        {/* Checkbox */}
        <button
          onClick={() => onToggle?.(task.id, !task.done)}
          className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-colors
            ${task.done
              ? 'bg-green-500 border-green-500'
              : 'border-slate-600 hover:border-orange-400'}`}
          aria-label={task.done ? 'Mark as pending' : 'Mark as done'}
        >
          {task.done && <i className="ti ti-check text-[9px] text-white" />}
        </button>

        {/* Content */}
        <div className="flex-1 min-w-0 space-y-1">
          <p className={`text-sm leading-snug ${task.done ? 'line-through text-slate-500' : 'text-slate-200'}`}>
            {task.text}
          </p>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Subject tag */}
            {subject && (
              <span
                className="text-[10px] font-medium px-2 py-0.5 rounded-full text-white"
                style={{ backgroundColor: subject.color + 'aa' }}
              >
                {subject.name}
              </span>
            )}
            {/* Time */}
            {task.createdAt && (
              <span className="text-[10px] text-slate-600">
                {new Date(task.createdAt?.toDate?.() || task.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
          </div>
        </div>

        {/* Photo thumbnail */}
        {task.photoURL && (
          <img
            src={task.photoURL}
            alt="Task photo"
            className="w-12 h-12 rounded-lg object-cover flex-shrink-0 border border-slate-700"
          />
        )}

        {/* Desktop delete */}
        <button
          onClick={() => onDelete?.(task.id)}
          className="hidden md:flex w-7 h-7 rounded-lg bg-transparent hover:bg-red-900/40 items-center justify-center transition-colors flex-shrink-0"
          aria-label="Delete task"
        >
          <i className="ti ti-trash text-xs text-slate-600 hover:text-red-400" />
        </button>
      </div>
    </div>
  );
}