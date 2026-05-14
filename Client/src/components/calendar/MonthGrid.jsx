// src/components/calendar/MonthGrid.jsx
// Month calendar grid — each cell shows: date number, study hours, subject color bars
// Like the screenshot: Sun–Sat columns, full month rows, colored dot-bars per subject
//
// Props:
//   month         — 0-indexed month (0=Jan … 11=Dec)
//   year          — full year
//   sessionsByDate — { 'YYYY-MM-DD': Session[] }  (each session has subjectColor, duration)
//   heatmapData   — { 'YYYY-MM-DD': totalSeconds }
//   onDayClick    — (dateStr) => void
//   selectedDate  — currently selected date string

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function pad(n) { return String(n).padStart(2, '0'); }
function dateKey(y, m, d) { return `${y}-${pad(m + 1)}-${pad(d)}`; }

// Color for the hour text based on study time
function hoursColor(seconds) {
  const h = seconds / 3600;
  if (h <= 0)  return 'text-slate-700';
  if (h < 1)   return 'text-blue-400';
  if (h < 2)   return 'text-violet-400';
  if (h < 4)   return 'text-violet-300';
  return 'text-green-400';
}

// Cell bg intensity
function cellBg(seconds) {
  const h = seconds / 3600;
  if (h <= 0)  return 'bg-[#111827]';
  if (h < 1)   return 'bg-[#1e3a5f]';
  if (h < 2)   return 'bg-[#2d1b69]';
  if (h < 4)   return 'bg-[#3b1e8a]';
  return 'bg-[#14532d]';
}

function formatCellHours(seconds) {
  if (!seconds) return null;
  const h = seconds / 3600;
  return `${Math.round(h * 10) / 10}h`;
}

// Build a 6-row × 7-col grid for the month
function buildMonthGrid(year, month) {
  const firstDay = new Date(year, month, 1).getDay(); // 0=Sun
  const lastDate = new Date(year, month + 1, 0).getDate();

  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= lastDate; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  const weeks = [];
  for (let i = 0; i < cells.length; i += 7) {
    weeks.push(cells.slice(i, i + 7));
  }
  return weeks;
}

// Render up to 5 subject dot-bars
function SubjectBars({ sessions = [] }) {
  if (!sessions.length) return null;

  // Deduplicate by color, sum durations
  const map = {};
  sessions.forEach((s) => {
    const c = s.subjectColor || '#6366f1';
    map[c] = (map[c] || 0) + (s.duration || 0);
  });

  const bars = Object.entries(map).slice(0, 5);
  const totalSec = bars.reduce((sum, [, s]) => sum + s, 0) || 1;

  return (
    <div className="flex gap-[2px] mt-1 w-full">
      {bars.map(([color, sec]) => {
        // width proportional to duration, min 3px
        const pct = Math.max(10, Math.round((sec / totalSec) * 100));
        return (
          <div
            key={color}
            style={{
              backgroundColor: color,
              width: `${pct}%`,
              height: 4,
              borderRadius: 2,
              opacity: 0.85,
            }}
          />
        );
      })}
    </div>
  );
}

export default function MonthGrid({
  month,
  year,
  sessionsByDate = {},
  heatmapData = {},
  onDayClick,
  selectedDate,
}) {
  const weeks = buildMonthGrid(year, month);
  const todayStr = dateKey(new Date().getFullYear(), new Date().getMonth(), new Date().getDate());

  return (
    <div>
      {/* Day-of-week headers */}
      <div className="grid grid-cols-7 mb-1">
        {DAY_LABELS.map((l) => (
          <div key={l} className="text-center text-[10px] text-slate-600 font-medium py-1">
            {l}
          </div>
        ))}
      </div>

      {/* Weeks */}
      <div className="flex flex-col gap-1">
        {weeks.map((week, wi) => (
          <div key={wi} className="grid grid-cols-7 gap-1">
            {week.map((day, di) => {
              if (!day) {
                return (
                  <div
                    key={di}
                    className="rounded-xl bg-[#0d1117] border border-[#1a2235]"
                    style={{ minHeight: 70 }}
                  />
                );
              }

              const key   = dateKey(year, month, day);
              const sec   = heatmapData[key] || 0;
              const subs  = sessionsByDate[key] || [];
              const isToday    = key === todayStr;
              const isSelected = key === selectedDate;
              const isPast     = new Date(key) < new Date(todayStr);
              const isFuture   = new Date(key) > new Date(todayStr);

              return (
                <button
                  key={di}
                  onClick={() => onDayClick?.(key)}
                  style={{ minHeight: 70 }}
                  className={[
                    'rounded-xl border p-1.5 text-left flex flex-col transition-all active:scale-95',
                    cellBg(sec),
                    isSelected
                      ? 'border-white/50 ring-1 ring-white/30'
                      : isToday
                      ? 'border-violet-500/70'
                      : 'border-[#1a2235] hover:border-slate-600',
                    isFuture && !isToday ? 'opacity-40' : '',
                  ].join(' ')}
                >
                  {/* Date number */}
                  <span
                    className={[
                      'text-[11px] font-medium leading-none',
                      isToday
                        ? 'text-violet-300'
                        : sec > 0
                        ? 'text-slate-300'
                        : 'text-slate-600',
                    ].join(' ')}
                  >
                    {day}
                  </span>

                  {/* Hours label */}
                  {sec > 0 && (
                    <span className={`text-[10px] mt-0.5 leading-none font-medium ${hoursColor(sec)}`}>
                      {formatCellHours(sec)}
                    </span>
                  )}

                  {/* Subject color bars */}
                  <div className="flex-1 flex items-end">
                    <SubjectBars sessions={subs} />
                  </div>
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}