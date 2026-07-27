// src/components/achievements/BadgeCountPill.jsx
// Chhota reusable "X/Y badges" indicator — Sidebar, Profile, Stats page teeno
// mein use hota hai taaki achievements sirf Achievements page tak limited na
// rahein.

import { useBadges } from '../../hooks/useBadges';
import { ALL_BADGES } from './BadgeGrid';

// variant: 'pill' (chhota badge, sidebar nav ke liye)
//          'stat' (Profile/Stats ke stat-card grid mein fit hone wala)
export default function BadgeCountPill({ variant = 'pill', className = '' }) {
  const { badges, loading } = useBadges();

  if (loading) return null;

  const unlockedCount = badges.length;
  const totalCount    = ALL_BADGES.length;

  if (variant === 'stat') {
    return (
      <div className={`bg-[#1e293b] rounded-xl p-3 border border-slate-700/50 text-center ${className}`}>
        <div className="w-8 h-8 rounded-lg bg-yellow-500/10 flex items-center justify-center mx-auto mb-2">
          <i className="ti ti-trophy text-yellow-400 text-sm" />
        </div>
        <p className="text-base font-bold text-yellow-400">{unlockedCount}/{totalCount}</p>
        <p className="text-xs text-slate-500 mt-0.5">Badges</p>
      </div>
    );
  }

  // default: 'pill'
  return (
    <span
      className={`inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-yellow-500/15 text-yellow-400 ${className}`}
    >
      {unlockedCount}/{totalCount}
    </span>
  );
}