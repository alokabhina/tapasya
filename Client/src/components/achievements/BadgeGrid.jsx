// src/components/achievements/BadgeGrid.jsx
// All badges grid, unlocked=color, locked=grayscale+blur, sorted unlocked first
// counter at top, tap → BadgeCard modal
// import useBadges

import { useState } from 'react';
import { useBadges } from '../../hooks/useBadges';
import BadgeCard from './BadgeCard';

// Full badge catalogue — matches utils/badges.js conditions
export const ALL_BADGES = [
  {
    id: 'first_session',
    icon: '🔥',
    name: 'First Flame',
    description: 'Complete your first study session',
    condition: 'Complete 1 session',
  },
  {
    id: 'five_hours_day',
    icon: '⚡',
    name: 'Power Day',
    description: 'Study 5+ hours in a single day',
    condition: '5 hours in one day',
  },
  {
    id: 'streak_7',
    icon: '🗓️',
    name: 'Week Warrior',
    description: 'Maintain a 7-day study streak',
    condition: '7-day streak',
  },
  {
    id: 'streak_30',
    icon: '🏆',
    name: 'Month Master',
    description: '30-day study streak — true tapasya',
    condition: '30-day streak',
  },
  {
    id: 'hours_100',
    icon: '💯',
    name: 'Centurion',
    description: '100 total hours of focused study',
    condition: '100 total hours',
  },
  {
    id: 'midnight_session',
    icon: '🌙',
    name: 'Night Owl',
    description: 'Study past midnight',
    condition: 'Session crosses midnight',
  },
  {
    id: 'early_bird',
    icon: '🌅',
    name: 'Early Bird',
    description: 'Start a session before 6am',
    condition: 'Session starts before 6:00 AM',
  },
  {
    id: 'hours_500',
    icon: '🦅',
    name: 'Eagle Eye',
    description: '500 total hours — aspirant elite',
    condition: '500 total hours',
  },
  {
    id: 'five_subjects',
    icon: '📚',
    name: 'Polymath',
    description: 'Study 5 different subjects',
    condition: 'Active 5 subjects',
  },
  {
    id: 'perfect_week',
    icon: '✨',
    name: 'Perfect Week',
    description: 'Hit your daily goal every day for 7 days',
    condition: '7 consecutive goal days',
  },
  {
    id: 'hours_1000',
    icon: '👑',
    name: 'Tapasya Legend',
    description: '1000 hours — the rarest achievement',
    condition: '1000 total hours',
  },
  {
    id: 'group_join',
    icon: '🤝',
    name: 'Together We Rise',
    description: 'Join a study group',
    condition: 'Join any study group',
  },
];

export default function BadgeGrid() {
  const { badges } = useBadges();
  const [selected, setSelected] = useState(null);

  const unlockedIds = new Set(badges.map((b) => b.badgeId));

  // Sort: unlocked first
  const sorted = [...ALL_BADGES].sort((a, b) => {
    const au = unlockedIds.has(a.id) ? 0 : 1;
    const bu = unlockedIds.has(b.id) ? 0 : 1;
    return au - bu;
  });

  const unlockedCount = sorted.filter((b) => unlockedIds.has(b.id)).length;

  return (
    <div>
      {/* Counter */}
      <div className="flex items-center gap-2 mb-5">
        <span className="text-slate-200 text-sm font-medium">
          {unlockedCount} / {ALL_BADGES.length} unlocked
        </span>
        <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-orange-500 rounded-full transition-all"
            style={{ width: `${(unlockedCount / ALL_BADGES.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
        {sorted.map((badge) => {
          const isUnlocked = unlockedIds.has(badge.id);
          const unlockData = badges.find((b) => b.badgeId === badge.id);
          return (
            <button
              key={badge.id}
              onClick={() => setSelected({ badge, isUnlocked, unlockData })}
              className={`flex flex-col items-center gap-2 p-3 rounded-2xl border transition-all
                active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500
                ${isUnlocked
                  ? 'bg-orange-950/30 border-orange-900/40 hover:border-orange-700/60'
                  : 'bg-slate-800/40 border-slate-800 hover:border-slate-700'}`}
            >
              <span
                className="text-3xl"
                style={!isUnlocked ? { filter: 'grayscale(1) blur(1px)', opacity: 0.4 } : {}}
              >
                {badge.icon}
              </span>
              <span
                className={`text-[10px] font-medium text-center leading-tight
                  ${isUnlocked ? 'text-orange-300' : 'text-slate-600'}`}
              >
                {badge.name}
              </span>
              {isUnlocked && (
                <span className="w-1.5 h-1.5 rounded-full bg-orange-400" aria-label="Unlocked" />
              )}
            </button>
          );
        })}
      </div>

      {/* Modal */}
      {selected && (
        <BadgeCard
          badge={selected.badge}
          isUnlocked={selected.isUnlocked}
          unlockData={selected.unlockData}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}