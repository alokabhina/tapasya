// src/components/achievements/LevelBadge.jsx
// Hero level card — animated SVG ring, glow accent, next level progress
// props: totalHours

const LEVELS = [
  { name: 'Beginner',  minHours: 0,    maxHours: 50,   icon: '🌱', color: '#22c55e', dim: '#052e16' },
  { name: 'Scholar',   minHours: 50,   maxHours: 200,  icon: '📖', color: '#3b82f6', dim: '#0c1a3a' },
  { name: 'Expert',    minHours: 200,  maxHours: 500,  icon: '⚡', color: '#a855f7', dim: '#1a0a2e' },
  { name: 'Legend',    minHours: 500,  maxHours: null, icon: '👑', color: '#f97316', dim: '#1c0a00' },
];

function getLevel(h) {
  for (let i = LEVELS.length - 1; i >= 0; i--) {
    if (h >= LEVELS[i].minHours) return { level: LEVELS[i], index: i };
  }
  return { level: LEVELS[0], index: 0 };
}

// SVG ring progress
function RingProgress({ pct, color, size = 88 }) {
  const r   = (size - 10) / 2;
  const circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;

  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
      {/* Track */}
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#1e293b" strokeWidth={5} />
      {/* Progress */}
      <circle
        cx={size / 2} cy={size / 2} r={r}
        fill="none"
        stroke={color}
        strokeWidth={5}
        strokeLinecap="round"
        strokeDasharray={`${dash} ${circ}`}
        style={{ transition: 'stroke-dasharray 0.8s ease', filter: `drop-shadow(0 0 4px ${color}88)` }}
      />
    </svg>
  );
}

export default function LevelBadge({ totalHours = 0 }) {
  const { level, index } = getLevel(totalHours);
  const isMax = index === LEVELS.length - 1;
  const next  = !isMax ? LEVELS[index + 1] : null;

  const pct = isMax
    ? 100
    : Math.min(((totalHours - level.minHours) / (next.minHours - level.minHours)) * 100, 100);

  const hoursToNext = next ? Math.max(0, next.minHours - totalHours) : 0;

  return (
    <div
      className="relative rounded-2xl border overflow-hidden p-5"
      style={{
        background: `linear-gradient(135deg, ${level.dim} 0%, #07090f 60%)`,
        borderColor: level.color + '30',
      }}
    >
      {/* Subtle glow orb */}
      <div
        className="absolute -top-8 -right-8 w-32 h-32 rounded-full opacity-20 pointer-events-none"
        style={{ background: `radial-gradient(circle, ${level.color}, transparent 70%)` }}
      />

      <div className="flex items-center gap-5">

        {/* Ring + icon */}
        <div className="relative flex-shrink-0 w-[88px] h-[88px]">
          <RingProgress pct={Math.round(pct)} color={level.color} />
          <div className="absolute inset-0 flex items-center justify-center text-3xl">
            {level.icon}
          </div>
        </div>

        {/* Text content */}
        <div className="flex-1 min-w-0">
          <p className="text-[10px] text-slate-600 uppercase tracking-[0.15em] font-semibold mb-0.5">
            Current Level
          </p>
          <h2
            className="text-2xl font-bold leading-tight mb-1"
            style={{ color: level.color, fontFamily: "'Sora', sans-serif", letterSpacing: '-0.02em' }}
          >
            {level.name}
          </h2>
          <p className="text-[12px] text-slate-500">
            {Math.round(totalHours)}h studied total
          </p>

          {/* Next level */}
          {!isMax ? (
            <div className="mt-2.5">
              <div className="h-1 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{ width: `${pct}%`, backgroundColor: level.color }}
                />
              </div>
              <p className="text-[10px] text-slate-700 mt-1">
                {Math.round(hoursToNext)}h to{' '}
                <span style={{ color: next.color }}>{next.name}</span>
              </p>
            </div>
          ) : (
            <p className="text-[11px] mt-2" style={{ color: level.color }}>
              Maximum level reached 🔥
            </p>
          )}
        </div>

        {/* XP pill */}
        <div
          className="absolute top-4 right-4 px-2.5 py-1 rounded-full text-[10px] font-bold border"
          style={{
            color: level.color,
            borderColor: level.color + '40',
            background: level.color + '15',
          }}
        >
          {Math.round(pct)}%
        </div>
      </div>

      {/* Level milestones strip */}
      <div className="mt-4 pt-3 border-t border-slate-800/60 flex items-center justify-between">
        {LEVELS.map((l, i) => {
          const reached = totalHours >= l.minHours;
          return (
            <div key={l.name} className="flex flex-col items-center gap-1">
              <div
                className="w-6 h-6 rounded-lg flex items-center justify-center text-sm transition-all"
                style={
                  reached
                    ? { background: l.color + '25', boxShadow: `0 0 6px ${l.color}44` }
                    : { background: '#1e293b' }
                }
              >
                <span style={reached ? {} : { filter: 'grayscale(1)', opacity: 0.3 }}>
                  {l.icon}
                </span>
              </div>
              <p
                className="text-[9px] font-medium"
                style={{ color: reached ? l.color : '#334155' }}
              >
                {l.name}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}