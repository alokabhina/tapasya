// src/components/watch/WatchStatsWidget.jsx
export default function WatchStatsWidget({ stats }) {
  if (!stats) {
    return (
      <div className="flex items-center gap-3 px-3 py-2 rounded-xl bg-slate-800/60 border border-slate-700/60 animate-pulse">
        <div className="h-4 w-28 rounded bg-slate-700/60" />
      </div>
    )
  }

  const { total = 0, completed = 0, todayWatchHours = 0, weekWatchHours = 0 } = stats
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0

  return (
    <div className="flex items-center gap-3 px-3 py-2 rounded-xl bg-slate-800/60 border border-slate-700/60 text-sm w-full sm:w-auto overflow-x-auto no-scrollbar">
      <div className="flex items-center gap-1.5 text-slate-300 shrink-0">
        <i className="ti ti-video text-orange-400" />
        <span className="font-semibold tabular-nums">{total}</span>
        <span className="text-slate-500 hidden sm:inline">videos</span>
      </div>
      <div className="w-px h-4 bg-slate-700 shrink-0" />
      <div className="flex items-center gap-1.5 text-slate-300 shrink-0">
        <i className="ti ti-circle-check text-green-400" />
        <span className="font-semibold tabular-nums">{completed}</span>
        <span className="text-slate-500 hidden sm:inline">done</span>
        {total > 0 && <span className="text-slate-600 text-xs hidden md:inline">({pct}%)</span>}
      </div>
      <div className="w-px h-4 bg-slate-700 shrink-0" />
      <div className="flex items-center gap-1.5 text-slate-300 shrink-0">
        <i className="ti ti-clock-hour-4 text-blue-400" />
        <span className="font-semibold tabular-nums">{todayWatchHours}h</span>
        <span className="text-slate-500 hidden sm:inline">today</span>
      </div>
      {weekWatchHours > 0 && (
        <>
          <div className="w-px h-4 bg-slate-700 shrink-0 hidden md:block" />
          <div className="hidden md:flex items-center gap-1.5 text-slate-300 shrink-0">
            <i className="ti ti-calendar-stats text-purple-400" />
            <span className="font-semibold tabular-nums">{weekWatchHours}h</span>
            <span className="text-slate-500">this week</span>
          </div>
        </>
      )}
    </div>
  )
}