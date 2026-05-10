// src/components/calendar/HeatmapGrid.jsx
// Full grid, cell color = orange intensity by hours (0→dark, 1-2h→light, 3-5h→medium, 6h+→deep)
// tappable
// props: data{} — { "YYYY-MM-DD": totalSeconds }, onDayClick(dateString)

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// Orange intensity levels
function cellColor(seconds) {
  const hours = seconds / 3600;
  if (hours <= 0)   return { bg: '#0f172a', border: '#1e293b' };
  if (hours < 1)    return { bg: '#431407', border: '#7c2d12' };  // very light
  if (hours < 3)    return { bg: '#7c2d12', border: '#9a3412' };  // light
  if (hours < 6)    return { bg: '#c2410c', border: '#ea580c' };  // medium
  return              { bg: '#f97316', border: '#fb923c' };          // deep
}

// Build full quarter grid: 3 months, start from first Sunday
function buildQuarterCells(year, quarterIndex) {
  // quarterIndex: 0=Jan-Mar, 1=Apr-Jun, 2=Jul-Sep, 3=Oct-Dec
  const startMonth = quarterIndex * 3;
  const months = [0, 1, 2].map((i) => startMonth + i);

  return months.map((month) => {
    const firstDay = new Date(year, month, 1);
    const lastDay  = new Date(year, month + 1, 0);
    const totalDays = lastDay.getDate();

    // Weeks array: each week = 7 days (null for padding)
    const cells = [];
    const startPad = firstDay.getDay(); // 0=Sun
    for (let i = 0; i < startPad; i++) cells.push(null);
    for (let d = 1; d <= totalDays; d++) {
      cells.push(new Date(year, month, d));
    }
    // Pad end to complete last week
    while (cells.length % 7 !== 0) cells.push(null);

    const weeks = [];
    for (let i = 0; i < cells.length; i += 7) {
      weeks.push(cells.slice(i, i + 7));
    }
    return { month, weeks };
  });
}

function pad(n) { return String(n).padStart(2, '0'); }
function dateKey(d) { return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; }

const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

export default function HeatmapGrid({ data = {}, onDayClick, year, quarter }) {
  const y = year || new Date().getFullYear();
  const q = quarter !== undefined ? quarter : Math.floor(new Date().getMonth() / 3);
  const months = buildQuarterCells(y, q);
  const today = dateKey(new Date());

  return (
    <div className="space-y-5">
      {/* Day of week header */}
      <div className="grid grid-cols-7 gap-1 mb-1">
        {DAY_LABELS.map((l) => (
          <div key={l} className="text-center text-[10px] text-slate-600 font-medium">{l}</div>
        ))}
      </div>

      {months.map(({ month, weeks }) => (
        <div key={month}>
          <p className="text-xs font-medium text-slate-400 mb-2">{MONTH_NAMES[month]}</p>
          <div className="space-y-1">
            {weeks.map((week, wi) => (
              <div key={wi} className="grid grid-cols-7 gap-1">
                {week.map((date, di) => {
                  if (!date) return <div key={di} />;
                  const key = dateKey(date);
                  const sec = data[key] || 0;
                  const { bg, border } = cellColor(sec);
                  const isToday = key === today;
                  return (
                    <button
                      key={di}
                      onClick={() => onDayClick?.(key)}
                      title={`${key}${sec > 0 ? ` — ${Math.round(sec/360)/10}h` : ''}`}
                      className={`aspect-square rounded-sm transition-transform active:scale-90
                        ${isToday ? 'ring-1 ring-orange-500' : ''}`}
                      style={{ backgroundColor: bg, border: `1px solid ${border}` }}
                      aria-label={`${key}, ${sec > 0 ? Math.round(sec/360)/10 + 'h studied' : 'no study'}`}
                    >
                      {/* Date number for current month */}
                      <span className="text-[8px] text-white/30 leading-none block text-center pt-[1px]">
                        {date.getDate()}
                      </span>
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Legend */}
      <div className="flex items-center gap-2 justify-end">
        <span className="text-[10px] text-slate-600">Less</span>
        {['#0f172a', '#431407', '#7c2d12', '#c2410c', '#f97316'].map((c, i) => (
          <div key={i} className="w-3 h-3 rounded-sm" style={{ backgroundColor: c }} />
        ))}
        <span className="text-[10px] text-slate-600">More</span>
      </div>
    </div>
  );
}