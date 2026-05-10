// GoalBar.jsx
// Progress bar — props: current (sec), goal (sec)
// Percentage + "Xh of Yh" label

import { formatHours } from '../../utils/time';

export default function GoalBar({ current = 0, goal = 0 }) {
  const pct = goal > 0 ? Math.min((current / goal) * 100, 100) : 0;
  const done = goal > 0 && current >= goal;

  return (
    <div className="w-full space-y-1.5">
      {/* Labels */}
      <div className="flex items-center justify-between text-xs">
        <span className="text-slate-500">Daily Goal</span>
        <span className={done ? 'text-green-400 font-medium' : 'text-orange-400 font-medium'}>
          {goal > 0
            ? `${formatHours(current)} of ${formatHours(goal)}`
            : 'Set a goal in Settings'}
        </span>
      </div>

      {/* Bar */}
      <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${pct}%`,
            background: done
              ? '#22c55e'
              : 'linear-gradient(90deg, #ea580c, #f97316)',
          }}
        />
      </div>

      {/* Percentage */}
      {goal > 0 && (
        <p className="text-right text-[10px] text-slate-600">{Math.round(pct)}%</p>
      )}
    </div>
  );
}