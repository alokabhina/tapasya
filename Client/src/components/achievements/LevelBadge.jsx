// src/components/achievements/LevelBadge.jsx
// Level: Beginner → Scholar → Expert → Legend (by total hours)
// Progress bar to next level
// props: totalHours

const LEVELS = [
  { name: 'Beginner',  minHours: 0,    maxHours: 50,   icon: '🌱', color: '#22c55e' },
  { name: 'Scholar',   minHours: 50,   maxHours: 200,  icon: '📖', color: '#3b82f6' },
  { name: 'Expert',    minHours: 200,  maxHours: 500,  icon: '⚡', color: '#a855f7' },
  { name: 'Legend',    minHours: 500,  maxHours: null, icon: '👑', color: '#f97316' },
];

function getLevel(totalHours) {
  for (let i = LEVELS.length - 1; i >= 0; i--) {
    if (totalHours >= LEVELS[i].minHours) return { level: LEVELS[i], index: i };
  }
  return { level: LEVELS[0], index: 0 };
}

export default function LevelBadge({ totalHours = 0 }) {
  const { level, index } = getLevel(totalHours);
  const isMax = index === LEVELS.length - 1;
  const next  = !isMax ? LEVELS[index + 1] : null;

  const pct = isMax
    ? 100
    : Math.min(
        ((totalHours - level.minHours) / (next.minHours - level.minHours)) * 100,
        100
      );

  return (
    <div
      className="flex items-center gap-4 p-4 rounded-2xl border"
      style={{
        backgroundColor: level.color + '12',
        borderColor:      level.color + '30',
      }}
    >
      {/* Icon */}
      <div
        className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0"
        style={{ backgroundColor: level.color + '20' }}
      >
        {level.icon}
      </div>

      {/* Details */}
      <div className="flex-1 min-w-0 space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold" style={{ color: level.color }}>
            {level.name}
          </p>
          <p className="text-xs text-slate-500 font-medium">
            {Math.round(totalHours)}h total
          </p>
        </div>

        {/* Progress bar */}
        <div className="h-1.5 rounded-full overflow-hidden bg-slate-800">
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{ width: `${pct}%`, backgroundColor: level.color }}
          />
        </div>

        {/* Next level label */}
        <p className="text-[10px] text-slate-600">
          {isMax
            ? 'Maximum level reached 🔥'
            : `${Math.round(next.minHours - totalHours)}h to ${next.name}`}
        </p>
      </div>
    </div>
  );
}