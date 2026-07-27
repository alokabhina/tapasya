// src/components/achievements/BadgeCard.jsx
// Redesign: Premium modal — colored top band, glow ring, unlock date
// props: badge, isUnlocked, unlockData, onClose

import { useEffect } from 'react';

const BADGE_COLORS = {
  first_session:    '#f97316',
  five_hours_day:   '#eab308',
  streak_7:         '#3b82f6',
  streak_30:        '#6366f1',
  hours_100:        '#f97316',
  midnight_session: '#8b5cf6',
  early_bird:       '#f59e0b',
  hours_500:        '#06b6d4',
  five_subjects:    '#10b981',
  perfect_week:     '#ec4899',
  hours_1000:       '#f97316',
  group_join:       '#22c55e',
  weekend_warrior:  '#d946ef',
  comeback_kid:     '#14b8a6',
};

function formatUnlockDate(ts) {
  if (!ts) return '';
  const d = ts?.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' });
}

export default function BadgeCard({ badge, isUnlocked, unlockData, onClose }) {
  const color = BADGE_COLORS[badge.id] || '#f97316';

  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') onClose?.(); }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  function handleBackdrop(e) {
    if (e.target === e.currentTarget) onClose?.();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm px-5"
      onClick={handleBackdrop}
    >
      <div
        className="w-full max-w-xs rounded-2xl overflow-hidden border shadow-2xl"
        style={{
          background: `linear-gradient(160deg, ${color}18 0%, #0d1420 40%)`,
          borderColor: isUnlocked ? color + '40' : '#1e293b',
          boxShadow: isUnlocked ? `0 0 40px ${color}20` : 'none',
        }}
      >
        {/* Top color bar */}
        <div
          className="h-1 w-full"
          style={{ background: isUnlocked ? `linear-gradient(90deg, ${color}88, ${color})` : '#1e293b' }}
        />

        {/* Content */}
        <div className="px-6 py-7 flex flex-col items-center gap-3 text-center">

          {/* Glow ring around icon */}
          <div
            className="w-20 h-20 rounded-full flex items-center justify-center relative"
            style={{
              background: isUnlocked ? `radial-gradient(circle, ${color}20, transparent 70%)` : '#111827',
              border: `2px solid ${isUnlocked ? color + '40' : '#1f2937'}`,
              boxShadow: isUnlocked ? `0 0 24px ${color}30` : 'none',
            }}
          >
            <span
              className="text-4xl"
              style={!isUnlocked ? { filter: 'grayscale(1) blur(1.5px)', opacity: 0.3 } : {}}
            >
              {badge.icon}
            </span>
          </div>

          {/* Status pill */}
          <div
            className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest"
            style={
              isUnlocked
                ? { background: color + '20', color }
                : { background: '#1f2937', color: '#475569' }
            }
          >
            {isUnlocked ? '✓ Unlocked' : 'Locked'}
          </div>

          {/* Name */}
          <h2
            className="text-lg font-bold"
            style={{
              color: isUnlocked ? color : '#475569',
              fontFamily: "'Sora', sans-serif",
              letterSpacing: '-0.02em',
            }}
          >
            {badge.name}
          </h2>

          {/* Description */}
          <p className="text-[13px] text-slate-400 leading-relaxed">{badge.description}</p>

          {/* Condition */}
          <div
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-[11px] text-slate-500 border border-slate-800/80 bg-slate-900/40 w-full justify-center"
          >
            <i className="ti ti-target text-slate-600 text-xs" />
            {badge.condition}
          </div>

          {/* Unlock date */}
          {isUnlocked && unlockData?.unlockedAt && (
            <div className="flex items-center gap-1.5 text-[11px]" style={{ color: color + 'bb' }}>
              <i className="ti ti-calendar-check text-xs" />
              Unlocked {formatUnlockDate(unlockData.unlockedAt)}
            </div>
          )}
          {!isUnlocked && (
            <p className="text-[11px] text-slate-700 italic">Complete the condition to unlock</p>
          )}
        </div>

        {/* Close button */}
        <div className="px-5 pb-5">
          <button
            onClick={onClose}
            className="w-full py-3 rounded-xl text-[13px] font-medium text-slate-400 border border-slate-800 hover:bg-slate-800/60 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}