// src/components/achievements/BadgeCard.jsx
// Modal: badge icon + name + description + unlock condition + unlock date
// props: badge, isUnlocked, unlockData, onClose

import { useEffect } from 'react';

function formatUnlockDate(ts) {
  if (!ts) return '';
  const d = ts?.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' });
}

export default function BadgeCard({ badge, isUnlocked, unlockData, onClose }) {
  // Escape key
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4"
      onClick={handleBackdrop}
    >
      <div className="w-full max-w-xs bg-[#1a2234] border border-slate-700/50 rounded-2xl shadow-2xl text-center overflow-hidden">
        {/* Top color band */}
        <div
          className={`h-1.5 w-full ${isUnlocked ? 'bg-orange-500' : 'bg-slate-700'}`}
        />

        <div className="px-6 py-6 space-y-3">
          {/* Badge icon */}
          <div
            className="text-6xl mx-auto"
            style={!isUnlocked ? { filter: 'grayscale(1) blur(1.5px)', opacity: 0.4 } : {}}
          >
            {badge.icon}
          </div>

          {/* Name */}
          <h2 className={`text-base font-semibold ${isUnlocked ? 'text-orange-300' : 'text-slate-500'}`}>
            {badge.name}
          </h2>

          {/* Description */}
          <p className="text-sm text-slate-400 leading-relaxed">
            {badge.description}
          </p>

          {/* Condition */}
          <div className="flex items-center justify-center gap-1.5 text-xs text-slate-600">
            <i className="ti ti-lock text-[11px]" />
            <span>{badge.condition}</span>
          </div>

          {/* Unlock date */}
          {isUnlocked && unlockData?.unlockedAt ? (
            <div className="flex items-center justify-center gap-1.5 text-xs text-orange-400/80">
              <i className="ti ti-calendar-check text-[11px]" />
              <span>Unlocked {formatUnlockDate(unlockData.unlockedAt)}</span>
            </div>
          ) : !isUnlocked ? (
            <p className="text-xs text-slate-700 italic">Not yet unlocked</p>
          ) : null}
        </div>

        {/* Close */}
        <div className="px-6 pb-5">
          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-xl text-sm text-slate-400 bg-slate-800 hover:bg-slate-700 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}