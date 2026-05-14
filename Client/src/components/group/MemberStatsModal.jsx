// src/components/group/MemberStatsModal.jsx
// Shows a group member's public stats: heatmap, subject breakdown, study hours
// Opened when you tap on a teammate in the Members tab

import { useEffect, useState } from 'react';
import { fetchMemberStats } from '../../api/groups';
import Avatar from '../ui/Avatar';
import { formatHours } from '../../utils/time';

// ── Heatmap helpers ──────────────────────────────────────────────────────────
function pad(n) { return String(n).padStart(2, '0'); }
function dateKey(d) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function cellColor(seconds) {
  const h = seconds / 3600;
  if (h <= 0)  return '#0f172a';
  if (h < 1)   return '#431407';
  if (h < 3)   return '#7c2d12';
  if (h < 6)   return '#c2410c';
  return              '#f97316';
}

// Build last-N-days grid (7 columns = Sun–Sat)
function buildRecentGrid(heatmap, days = 70) {
  const cells = [];
  const today = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    cells.push(d);
  }
  // Pad front so first cell aligns to correct weekday column
  const padCount = cells[0].getDay(); // 0=Sun
  const paddedCells = [...Array(padCount).fill(null), ...cells];
  // Group into weeks
  const weeks = [];
  for (let i = 0; i < paddedCells.length; i += 7) {
    weeks.push(paddedCells.slice(i, i + 7));
  }
  return weeks;
}

const DAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function MiniHeatmap({ heatmap }) {
  const weeks = buildRecentGrid(heatmap, 70);
  const today = dateKey(new Date());

  // Month label positions
  const monthLabels = [];
  let lastMonth = null;
  weeks.forEach((week, wi) => {
    const firstReal = week.find(d => d !== null);
    if (firstReal) {
      const m = firstReal.getMonth();
      if (m !== lastMonth) { monthLabels.push({ wi, label: MONTH_NAMES[m] }); lastMonth = m; }
    }
  });

  return (
    <div className="w-full">
      {/* Month labels */}
      <div className="flex mb-1" style={{ paddingLeft: '18px' }}>
        {weeks.map((_, wi) => {
          const label = monthLabels.find(l => l.wi === wi);
          return (
            <div key={wi} className="flex-1 text-[9px] text-slate-500">
              {label ? label.label : ''}
            </div>
          );
        })}
      </div>

      <div className="flex gap-1">
        {/* Day-of-week labels */}
        <div className="flex flex-col gap-1 justify-between" style={{ minWidth: '14px' }}>
          {DAY_LABELS.map((l, i) => (
            <div key={i} className="text-[9px] text-slate-600 leading-none h-3 flex items-center">{l}</div>
          ))}
        </div>

        {/* Grid columns (each = one week) */}
        <div className="flex gap-1 flex-1">
          {weeks.map((week, wi) => (
            <div key={wi} className="flex flex-col gap-1 flex-1">
              {week.map((date, di) => {
                if (!date) return (
                  <div key={di} className="h-3 rounded-sm" style={{ backgroundColor: 'transparent' }} />
                );
                const key = dateKey(date);
                const sec = heatmap[key] || 0;
                const isToday = key === today;
                return (
                  <div
                    key={di}
                    title={`${key}${sec > 0 ? ` — ${formatHours(sec)}` : ''}`}
                    className={`h-3 rounded-sm ${isToday ? 'ring-1 ring-orange-400' : ''}`}
                    style={{ backgroundColor: cellColor(sec) }}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-1.5 justify-end mt-2">
        <span className="text-[9px] text-slate-600">Less</span>
        {['#0f172a', '#431407', '#7c2d12', '#c2410c', '#f97316'].map((c, i) => (
          <div key={i} className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: c }} />
        ))}
        <span className="text-[9px] text-slate-600">More</span>
      </div>
    </div>
  );
}

// ── Subject bar ──────────────────────────────────────────────────────────────
function SubjectBreakdown({ subjects = [], totalSeconds }) {
  if (!subjects.length) return (
    <p className="text-xs text-slate-600 italic">No subject data available</p>
  );
  return (
    <div className="space-y-2">
      {subjects.slice(0, 5).map((s, i) => {
        const pct = totalSeconds > 0 ? ((s.seconds / totalSeconds) * 100).toFixed(1) : 0;
        return (
          <div key={i}>
            <div className="flex justify-between items-center mb-1">
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color || '#f97316' }} />
                <span className="text-xs text-slate-300 truncate max-w-[140px]">{s.name}</span>
              </div>
              <span className="text-xs text-slate-500 font-mono">{formatHours(s.seconds)}</span>
            </div>
            <div className="h-1.5 bg-[#0f172a] rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${pct}%`, backgroundColor: s.color || '#f97316' }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Main modal ───────────────────────────────────────────────────────────────
export default function MemberStatsModal({ groupId, member, onClose }) {
  const [stats, setStats]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState('');

  useEffect(() => {
    if (!groupId || !member?.userId) return;
    setLoading(true); setError('');
    fetchMemberStats(groupId, member.userId)
      .then(setStats)
      .catch(e => setError(e?.response?.data?.error || 'Stats load nahi hui'))
      .finally(() => setLoading(false));
  }, [groupId, member?.userId]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70"
      onClick={onClose}
    >
      <div
        className="bg-[#111827] border border-[#1e293b] rounded-t-3xl sm:rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* Handle bar */}
        <div className="flex justify-center pt-3 pb-1 sm:hidden">
          <div className="w-10 h-1 rounded-full bg-[#334155]" />
        </div>

        {/* Header */}
        <div className="flex items-center gap-3 px-5 pt-4 pb-3 border-b border-[#1e293b]">
          <Avatar photoURL={member.photoURL} name={member.displayName} size="md" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-white truncate">{member.displayName}</p>
            <p className="text-xs text-slate-500">Study stats</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#1e293b] flex items-center justify-center text-slate-400 hover:text-white transition-colors"
          >
            <i className="ti ti-x text-sm" />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-4 space-y-5">
          {loading && (
            <div className="flex justify-center py-10">
              <div className="w-6 h-6 rounded-full border-2 border-orange-500 border-t-transparent animate-spin" />
            </div>
          )}

          {error && (
            <p className="text-xs text-red-400 text-center py-4">{error}</p>
          )}

          {stats && !loading && (
            <>
              {/* Quick stats pills */}
              <div className="grid grid-cols-3 gap-2">
                <div className="bg-[#1e293b] rounded-xl p-3 text-center">
                  <p className="text-base font-bold text-orange-400 font-mono">
                    {formatHours(stats.weeklySeconds)}
                  </p>
                  <p className="text-[10px] text-slate-500 mt-0.5">This Week</p>
                </div>
                <div className="bg-[#1e293b] rounded-xl p-3 text-center">
                  <p className="text-base font-bold text-blue-400">
                    {stats.activeDays}
                  </p>
                  <p className="text-[10px] text-slate-500 mt-0.5">Active Days</p>
                </div>
                <div className="bg-[#1e293b] rounded-xl p-3 text-center">
                  <p className="text-base font-bold text-emerald-400">
                    🔥{stats.streak}
                  </p>
                  <p className="text-[10px] text-slate-500 mt-0.5">Streak</p>
                </div>
              </div>

              {/* Attendance heatmap */}
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">
                  Attendance (last 10 weeks)
                </p>
                <div className="bg-[#1e293b] rounded-xl p-3">
                  <MiniHeatmap heatmap={stats.heatmap} />
                </div>
              </div>

              {/* Subject breakdown */}
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">
                  Subject Breakdown (90 days)
                </p>
                <div className="bg-[#1e293b] rounded-xl p-3">
                  <SubjectBreakdown
                    subjects={stats.subjectBreakdown}
                    totalSeconds={stats.recentTotal}
                  />
                </div>
              </div>

              {/* All-time total */}
              <div className="bg-gradient-to-r from-orange-950/40 to-orange-900/20 border border-orange-900/30 rounded-xl p-3 flex items-center gap-3">
                <i className="ti ti-clock-hour-4 text-orange-400 text-xl" />
                <div>
                  <p className="text-sm font-bold text-orange-300 font-mono">
                    {formatHours(stats.totalSeconds)}
                  </p>
                  <p className="text-[10px] text-slate-500">Total all-time in this group</p>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}