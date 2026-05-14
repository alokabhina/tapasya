// src/components/achievements/BadgeGrid.jsx
// Redesign: Categorized badge grid — glowing unlocked cards, dim locked
// Unlocked first, then locked; tap → BadgeCard modal

import { useState } from 'react';
import { useBadges } from '../../hooks/useBadges';
import BadgeCard from './BadgeCard';

export const ALL_BADGES = [
  { id: 'first_session',    icon: '🔥', name: 'First Flame',      description: 'Complete your first study session',           condition: 'Complete 1 session',           category: 'Milestone' },
  { id: 'five_hours_day',   icon: '⚡', name: 'Power Day',        description: 'Study 5+ hours in a single day',              condition: '5 hours in one day',           category: 'Intensity' },
  { id: 'streak_7',         icon: '🗓️', name: 'Week Warrior',     description: 'Maintain a 7-day study streak',               condition: '7-day streak',                 category: 'Streak' },
  { id: 'streak_30',        icon: '🏆', name: 'Month Master',     description: '30-day study streak — true tapasya',          condition: '30-day streak',                category: 'Streak' },
  { id: 'hours_100',        icon: '💯', name: 'Centurion',        description: '100 total hours of focused study',             condition: '100 total hours',              category: 'Milestone' },
  { id: 'midnight_session', icon: '🌙', name: 'Night Owl',        description: 'Study past midnight',                         condition: 'Session crosses midnight',     category: 'Habit' },
  { id: 'early_bird',       icon: '🌅', name: 'Early Bird',       description: 'Start a session before 6am',                  condition: 'Session starts before 6:00 AM',category: 'Habit' },
  { id: 'hours_500',        icon: '🦅', name: 'Eagle Eye',        description: '500 total hours — aspirant elite',            condition: '500 total hours',              category: 'Milestone' },
  { id: 'five_subjects',    icon: '📚', name: 'Polymath',         description: 'Study 5 different subjects',                  condition: 'Active 5 subjects',            category: 'Diversity' },
  { id: 'perfect_week',     icon: '✨', name: 'Perfect Week',     description: 'Hit your daily goal every day for 7 days',    condition: '7 consecutive goal days',      category: 'Streak' },
  { id: 'hours_1000',       icon: '👑', name: 'Tapasya Legend',   description: '1000 hours — the rarest achievement',         condition: '1000 total hours',             category: 'Milestone' },
  { id: 'group_join',       icon: '🤝', name: 'Together We Rise', description: 'Join a study group',                          condition: 'Join any study group',         category: 'Social' },
];

// Glow color per badge (accent)
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
};

export default function BadgeGrid() {
  const { badges } = useBadges();
  const [selected, setSelected] = useState(null);

  const unlockedIds  = new Set(badges.map((b) => b.badgeId));
  const unlockedCount = ALL_BADGES.filter((b) => unlockedIds.has(b.id)).length;

  // Sort: unlocked first
  const sorted = [...ALL_BADGES].sort((a, b) => {
    const au = unlockedIds.has(a.id) ? 0 : 1;
    const bu = unlockedIds.has(b.id) ? 0 : 1;
    return au - bu;
  });

  return (
    <div>
      {/* Unlocked / locked counts */}
      <div className="flex items-center gap-3 mb-4">
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-orange-500" />
          <span className="text-[11px] text-slate-500">{unlockedCount} unlocked</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-slate-700" />
          <span className="text-[11px] text-slate-600">{ALL_BADGES.length - unlockedCount} locked</span>
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-3 gap-3">
        {sorted.map((badge) => {
          const isUnlocked = unlockedIds.has(badge.id);
          const unlockData = badges.find((b) => b.badgeId === badge.id);
          const color      = BADGE_COLORS[badge.id] || '#f97316';

          return (
            <button
              key={badge.id}
              onClick={() => setSelected({ badge, isUnlocked, unlockData })}
              className="relative flex flex-col items-center gap-2 p-4 rounded-2xl border transition-all duration-200 active:scale-95 focus:outline-none text-center"
              style={
                isUnlocked
                  ? {
                      background: `linear-gradient(145deg, ${color}12, ${color}06)`,
                      borderColor: color + '35',
                      boxShadow: `0 0 16px ${color}15`,
                    }
                  : {
                      background: '#0d1420',
                      borderColor: '#1e293b',
                    }
              }
            >
              {/* Unlocked glow dot */}
              {isUnlocked && (
                <div
                  className="absolute top-2.5 right-2.5 w-1.5 h-1.5 rounded-full"
                  style={{ backgroundColor: color, boxShadow: `0 0 4px ${color}` }}
                />
              )}

              {/* Icon */}
              <span
                className="text-3xl"
                style={!isUnlocked ? { filter: 'grayscale(1) blur(1px)', opacity: 0.25 } : {}}
              >
                {badge.icon}
              </span>

              {/* Name */}
              <span
                className="text-[10px] font-semibold leading-tight"
                style={{ color: isUnlocked ? color : '#334155' }}
              >
                {badge.name}
              </span>

              {/* Category pill */}
              <span
                className="text-[9px] px-2 py-0.5 rounded-full font-medium"
                style={
                  isUnlocked
                    ? { background: color + '20', color: color + 'cc' }
                    : { background: '#1e293b', color: '#475569' }
                }
              >
                {badge.category}
              </span>

              {/* Lock icon for locked */}
              {!isUnlocked && (
                <div className="absolute top-2.5 right-2.5">
                  <i className="ti ti-lock text-slate-700 text-[10px]" />
                </div>
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