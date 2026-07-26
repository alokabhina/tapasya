// src/pages/Achievements.jsx
// Redesign: Cinematic dark premium — hero level card, badge grid with glow effects

import { useState } from 'react';
import { useBadges } from '../hooks/useBadges';
import BadgeGrid, { ALL_BADGES } from '../components/achievements/BadgeGrid';
import BadgeCard from '../components/achievements/BadgeCard';
import LevelBadge from '../components/achievements/LevelBadge';
import { useUserStore } from '../store/userStore';

export default function Achievements() {
  const [selectedBadge, setSelectedBadge] = useState(null);
  const { badges } = useBadges();
  const totalHoursAllTime = useUserStore((s) => s.totalHoursAllTime) || 0;

  // ✅ FIX: `badges` unlocked-badge objects ki list hai ({ badgeId, unlockedAt }),
  //    total possible badges nahi — pehle yaha badges.length hi totalCount ban jata
  //    tha (so 0/0 ya galat % dikhta tha). Total ab ALL_BADGES (poori list) se aata hai.
  const unlockedCount = badges.length;
  const totalCount    = ALL_BADGES.length;
  const pct           = Math.round((unlockedCount / Math.max(totalCount, 1)) * 100);

  return (
    <div
      className="min-h-screen bg-[#07090f] text-white pb-28"
      style={{ fontFamily: "'DM Sans', sans-serif" }}
    >
      {/* ── Header ── */}
      <div className="px-5 pt-7 pb-5 flex items-start justify-between">
        <div>
          <p className="text-[11px] text-slate-600 uppercase tracking-[0.2em] font-semibold mb-1">
            Your progress
          </p>
          <h1
            className="text-2xl font-bold text-white tracking-tight"
            style={{ fontFamily: "'Sora', sans-serif", letterSpacing: '-0.03em' }}
          >
            Achievements
          </h1>
        </div>
        {/* Badge count pill */}
        <div className="mt-1 flex items-center gap-1.5 bg-orange-500/10 border border-orange-500/25 rounded-full px-3 py-1.5">
          <span className="text-orange-400 text-sm font-bold" style={{ fontFamily: "'Sora', sans-serif" }}>
            {unlockedCount}
          </span>
          <span className="text-orange-500/60 text-xs">/</span>
          <span className="text-slate-500 text-xs">{totalCount}</span>
          <span className="text-slate-600 text-[10px] ml-0.5">badges</span>
        </div>
      </div>

      {/* ── Level card (hero) ── */}
      <div className="px-5 mb-5">
        <LevelBadge totalHours={totalHoursAllTime} />
      </div>

      {/* ── Collection progress ── */}
      <div className="px-5 mb-6">
        <div className="bg-[#0d1420] border border-slate-800/70 rounded-2xl p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <i className="ti ti-shield-star text-orange-400 text-base" />
              <span className="text-[13px] font-semibold text-slate-300">Badge Collection</span>
            </div>
            <span
              className="text-sm font-bold text-orange-400"
              style={{ fontFamily: "'Sora', sans-serif" }}
            >
              {pct}%
            </span>
          </div>

          {/* Segmented progress bar */}
          <div className="relative h-2 bg-slate-800 rounded-full overflow-hidden">
            <div
              className="absolute inset-y-0 left-0 rounded-full transition-all duration-700"
              style={{
                width: `${pct}%`,
                background: 'linear-gradient(90deg, #c2410c, #f97316, #fb923c)',
              }}
            />
          </div>

          <div className="flex items-center justify-between mt-2.5">
            <p className="text-[11px] text-slate-600">
              {totalCount - unlockedCount} more to unlock
            </p>
            <div className="flex items-center gap-1">
              {[...Array(Math.min(unlockedCount, 5))].map((_, i) => (
                <div key={i} className="w-1.5 h-1.5 rounded-full bg-orange-500" />
              ))}
              {unlockedCount > 5 && (
                <span className="text-[10px] text-orange-500 ml-1">+{unlockedCount - 5}</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Badge grid ── */}
      <div className="px-5">
        <div className="flex items-center justify-between mb-4">
          <p className="text-[11px] text-slate-600 uppercase tracking-[0.15em] font-semibold">
            All Badges
          </p>
          <p className="text-[11px] text-slate-700">Tap to view details..</p>
        </div>
        <BadgeGrid />
      </div>

      {/* Badge modal */}
      {selectedBadge && (
        <BadgeCard
          badge={selectedBadge}
          isUnlocked={!!selectedBadge.unlockedAt}
          onClose={() => setSelectedBadge(null)}
        />
      )}
    </div>
  );
}