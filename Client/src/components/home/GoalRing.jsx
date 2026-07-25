// src/components/home/GoalRing.jsx
import CircularProgress from './CircularProgress';

export default function GoalRing({ todayTotal, dailyGoalSeconds, goalPct, size = 96 }) {
  const remaining = Math.max((dailyGoalSeconds || 0) - (todayTotal || 0), 0);
  const h = Math.floor(remaining / 3600);
  const m = Math.floor((remaining % 3600) / 60);
  const done = remaining <= 0 && dailyGoalSeconds > 0;
  const label = done ? 'Done!' : h > 0 ? `${h}h ${m}m` : `${m}m`;

  return (
    <CircularProgress size={size} pct={goalPct} color={done ? '#22c55e' : '#f97316'} trackColor="rgba(255,255,255,0.1)">
      <i className={`ti ${done ? 'ti-check' : 'ti-target'} text-[15px]`} style={{ color: done ? '#22c55e' : '#f97316' }} />
      <span className="text-[12px] font-semibold text-white leading-tight">{label}</span>
      {!done && <span className="text-[9px] text-slate-500 leading-none">left</span>}
    </CircularProgress>
  );
}