// src/pages/Stats.jsx — Rebuilt with:
// - Daily: 4am-4am day, prev/next navigation, per-day stats
// - Weekly: Sunday-Saturday of current/navigated week
// - Monthly: month stats + hourly activity heatmap (kis time padh raha)
// - Timer fix: elapsed-based duration (stop periods excluded)

import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import {
  AreaChart, Area, BarChart as ReBarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import useStats from '@/hooks/useStats';
import { formatDuration, formatHumanDuration, getDateString, getStudyDayString, getSundayWeekRange, getNDaysFrom, getLastNDays } from '@/utils/time';
import { aggregateForDay, aggregateByDateList, aggregateWeeklySunSat, getHourlyPattern, getHourlyMinutes, getCumulative, aggregateBySubject } from '@/utils/stats';
import { getFocusHistory, getFocusStats } from '@/utils/focusHistory';
import { fetchReadingStats } from '@/api/Vocab';
import { exportStatsPDF, exportStatsCSV } from '@/utils/export';
import { useBadges } from '@/hooks/useBadges';
import { ALL_BADGES } from '@/components/achievements/BadgeGrid';
import useUserStore from '@/store/userStore';
import { useExams } from '@/components/home/ExamCountdown';
import { generateSummaryReport } from '@/utils/generateSummaryReport';

// ─── Helpers ────────────────────────────────────────────────────────────────

function addDays(dateStr, n) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(y, m - 1, d + n);
  return getDateString(dt);
}

function formatDayLabel(dateStr) {
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
}

function formatWeekLabel(dateStr) {
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString('en-IN', { weekday: 'short' });
}

function formatMonthName(dateStr) {
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
}

// Compute startDate/endDate for each period mode
function getPeriodRange(mode, navDate) {
  const today = getStudyDayString();
  if (mode === 'day') {
    return { startDate: navDate, endDate: navDate };
  }
  if (mode === 'week') {
    const ref = new Date(navDate + 'T12:00:00');
    const { start, end } = getSundayWeekRange(ref);
    return { startDate: getDateString(start), endDate: getDateString(end) };
  }
  if (mode === 'month') {
    const [y, m] = navDate.split('-').map(Number);
    const startDate = `${String(y).padStart(4,'0')}-${String(m).padStart(2,'0')}-01`;
    const endDate = getDateString(new Date(y, m, 0)); // last day of month
    return { startDate, endDate };
  }
  if (mode === 'custom') return { startDate: navDate.split('|')[0], endDate: navDate.split('|')[1] };
  return { startDate: today, endDate: today };
}

// ─── Metric Card ─────────────────────────────────────────────────────────────
function MetricCard({ icon, label, value, sub, accent }) {
  const map = {
    orange: { ring:'ring-orange-500/20', iconBg:'bg-orange-500/10', tc:'text-orange-400' },
    purple: { ring:'ring-purple-500/20', iconBg:'bg-purple-500/10', tc:'text-purple-400' },
    blue:   { ring:'ring-blue-500/20',   iconBg:'bg-blue-500/10',   tc:'text-blue-400' },
    green:  { ring:'ring-green-500/20',  iconBg:'bg-green-500/10',  tc:'text-green-400' },
  };
  const s = map[accent] || map.orange;
  return (
    <div className={`bg-gradient-to-br from-[#111827] to-[#0d1420] ring-1 ${s.ring} rounded-2xl p-4 shadow-lg`}>
      <div className={`inline-flex items-center justify-center w-9 h-9 rounded-xl ${s.iconBg} mb-3 ring-1 ${s.ring}`}>
        <i className={`ti ${icon} text-base ${s.tc}`} />
      </div>
      <p className="text-[9px] text-slate-500 mb-1 font-semibold tracking-[0.15em] uppercase">{label}</p>
      <p className={`text-2xl font-black font-mono tracking-tight ${s.tc} leading-none`}>{value}</p>
      {sub && <p className="text-[10px] text-slate-600 mt-1.5">{sub}</p>}
    </div>
  );
}

function ChartCard({ title, icon, children, right, badge }) {
  return (
    <div className="bg-gradient-to-br from-[#111827] to-[#0d1420] ring-1 ring-slate-800/60 rounded-2xl overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800/50">
        <div className="flex items-center gap-2.5">
          {icon && <div className="w-7 h-7 rounded-lg bg-slate-800/80 flex items-center justify-center"><i className={`ti ${icon} text-sm text-slate-400`} /></div>}
          <h3 className="text-sm font-bold text-slate-200 tracking-tight">{title}</h3>
          {badge && <span className="text-[9px] font-semibold text-slate-500 bg-slate-800/60 px-2 py-0.5 rounded-full uppercase tracking-wider">{badge}</span>}
        </div>
        {right}
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

// ─── Donut ────────────────────────────────────────────────────────────────────
function DonutChart({ data, total }) {
  const [hovered, setHovered] = useState(null);
  if (!data.length) return (
    <div className="flex flex-col items-center justify-center h-36 gap-2">
      <i className="ti ti-chart-donut text-2xl text-slate-700" />
      <p className="text-slate-600 text-sm">No data this period</p>
    </div>
  );
  return (
    <div className="flex items-center gap-6">
      <div className="relative flex-shrink-0" style={{ width: 140, height: 140 }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} cx="50%" cy="50%" innerRadius={40} outerRadius={65} paddingAngle={3} dataKey="value" startAngle={90} endAngle={-270}
              onMouseEnter={(_, i) => setHovered(i)} onMouseLeave={() => setHovered(null)}>
              {data.map((d, i) => <Cell key={i} fill={d.color||'#f97316'} opacity={hovered===null||hovered===i?1:0.35} style={{transition:'opacity 0.2s'}} />)}
            </Pie>
            <Tooltip content={({ active, payload }) => {
              if (!active||!payload?.length) return null;
              const d = payload[0].payload;
              const pct = total > 0 ? Math.round((d.value/total)*100) : 0;
              return (
                <div className="bg-[#0d1117] border border-slate-700/50 rounded-xl px-3 py-2.5 text-xs shadow-2xl">
                  <div className="flex items-center gap-2 mb-1.5"><span className="w-2.5 h-2.5 rounded-full" style={{backgroundColor:d.color}} /><span className="text-slate-200 font-semibold">{d.name}</span></div>
                  <p className="text-orange-400 font-mono font-bold">{formatHumanDuration(d.value)}</p>
                  <p className="text-slate-500 mt-0.5">{pct}% of total</p>
                </div>
              );
            }} />
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <p className="text-sm font-black font-mono text-white leading-none">{formatHumanDuration(total)}</p>
          <p className="text-[9px] text-slate-600 mt-0.5 uppercase tracking-wider">Total</p>
        </div>
      </div>
      <div className="flex-1 space-y-2.5 min-w-0">
        {data.map((d, i) => {
          const pct = total > 0 ? Math.round((d.value/total)*100) : 0;
          return (
            <div key={i} className={`transition-opacity duration-200 ${hovered!==null&&hovered!==i?'opacity-40':'opacity-100'}`}
              onMouseEnter={()=>setHovered(i)} onMouseLeave={()=>setHovered(null)}>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2 min-w-0"><span className="w-2 h-2 rounded-full flex-shrink-0" style={{backgroundColor:d.color}}/><span className="text-xs text-slate-300 truncate font-medium">{d.name}</span></div>
                <div className="flex items-center gap-2 flex-shrink-0 ml-2"><span className="text-xs font-mono text-slate-400">{formatHumanDuration(d.value)}</span><span className="text-[10px] font-bold w-8 text-right" style={{color:d.color}}>{pct}%</span></div>
              </div>
              <div className="h-1.5 bg-slate-800/80 rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all duration-700" style={{width:`${pct}%`,backgroundColor:d.color,boxShadow:`0 0 6px ${d.color}60`}} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Stacked Bar Chart ────────────────────────────────────────────────────────
function StackedBarChart({ data, xKey = 'label', height = 200 }) {
  if (!data.length) return (
    <div className="flex flex-col items-center justify-center h-44 gap-2">
      <i className="ti ti-chart-bar text-xl text-slate-600" />
      <p className="text-slate-600 text-sm">No data this period</p>
    </div>
  );
  const subjects = [...new Set(data.flatMap(d => Object.keys(d).filter(k => k !== 'date' && k !== 'label' && k !== 'fullDate')))];
  const COLORS = ['#f97316','#a855f7','#3b82f6','#22c55e','#f59e0b','#ec4899','#06b6d4','#84cc16'];
  return (
    <ResponsiveContainer width="100%" height={height}>
      <ReBarChart data={data} barSize={18} barCategoryGap="30%">
        <defs>{COLORS.map((c,i)=><linearGradient key={i} id={`bg${i}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={c} stopOpacity={0.9}/><stop offset="100%" stopColor={c} stopOpacity={0.5}/></linearGradient>)}</defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
        <XAxis dataKey={xKey} tick={{fill:'#64748b',fontSize:10,fontWeight:600}} axisLine={false} tickLine={false} />
        <YAxis tick={{fill:'#475569',fontSize:10}} axisLine={false} tickLine={false} tickFormatter={v=>`${v}h`} width={28} />
        <Tooltip content={({active,payload,label})=>{
          if(!active||!payload?.length) return null;
          const total=payload.reduce((s,p)=>s+(p.value||0),0);
          return (<div className="bg-[#0d1117] border border-slate-700/50 rounded-xl px-3 py-3 text-xs shadow-2xl min-w-[130px]">
            <p className="text-slate-300 mb-2.5 font-bold">{label}</p>
            {payload.filter(p=>p.value>0).map((p,i)=>(
              <div key={i} className="flex items-center justify-between gap-3 mb-1">
                <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full" style={{backgroundColor:p.fill}}/><span className="text-slate-400 truncate max-w-[70px]">{p.dataKey}</span></div>
                <span className="text-slate-100 font-mono font-semibold">{p.value}h</span>
              </div>
            ))}
            <div className="border-t border-slate-800 pt-1.5 mt-2 flex justify-between"><span className="text-slate-500">Total</span><span className="text-orange-400 font-bold font-mono">{Math.round(total*10)/10}h</span></div>
          </div>);
        }} cursor={{fill:'rgba(255,255,255,0.02)'}} />
        {subjects.map((s,i)=><Bar key={s} dataKey={s} stackId="a" fill={`url(#bg${i%COLORS.length})`} radius={i===subjects.length-1?[4,4,0,0]:[0,0,0,0]} />)}
      </ReBarChart>
    </ResponsiveContainer>
  );
}

// ─── Hourly Heatmap (timeframe activity) ─────────────────────────────────────
function HourlyActivityHeatmap({ sessions }) {
  const hourlyMins = useMemo(() => getHourlyMinutes(sessions), [sessions]);
  const max = Math.max(...hourlyMins, 1);
  const LABELS = ['12a','1','2','3','4','5','6','7','8','9','10','11','12p','1','2','3','4','5','6','7','8','9','10','11'];

  const getPeakHours = () => {
    const sorted = hourlyMins.map((v, i) => ({ h: i, v })).sort((a, b) => b.v - a.v);
    return sorted.filter(x => x.v > 0).slice(0, 3).map(x => {
      const ampm = x.h < 12 ? 'am' : 'pm';
      const h = x.h % 12 || 12;
      return `${h}${ampm}`;
    });
  };

  return (
    <div>
      <div className="flex gap-0.5 mb-1">
        {hourlyMins.map((v, i) => {
          const pct = v / max;
          return (
            <div key={i} className="flex-1 rounded-sm cursor-help transition-all duration-200 hover:scale-y-125 group relative"
              style={{
                height: 28,
                backgroundColor: pct < 0.02 ? '#1e293b' : `rgba(249,115,22,${0.12 + pct * 0.78})`,
                boxShadow: pct > 0.5 ? `0 0 8px rgba(249,115,22,${pct * 0.4})` : 'none',
              }}
              title={`${LABELS[i]} — ${v} min`}
            />
          );
        })}
      </div>
      <div className="flex mt-1">
        {LABELS.map((l, i) => (
          <div key={i} className="flex-1">
            <span className="text-[8px] text-slate-700 font-medium">{l}</span>
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between mt-3">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm bg-slate-800"/><span className="text-[9px] text-slate-600">Inactive</span></div>
          <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm" style={{backgroundColor:'rgba(249,115,22,0.85)',boxShadow:'0 0 6px rgba(249,115,22,0.4)'}}/><span className="text-[9px] text-slate-600">Peak</span></div>
        </div>
        {getPeakHours().length > 0 && (
          <p className="text-[10px] text-orange-400 font-medium">
            Most active: {getPeakHours().join(', ')}
          </p>
        )}
      </div>
    </div>
  );
}

// ─── Cumulative Area Chart ────────────────────────────────────────────────────
function CumulativeChart({ data }) {
  if (!data.length) return <div className="flex items-center justify-center h-36 text-slate-600 text-sm">No data</div>;
  return (
    <ResponsiveContainer width="100%" height={160}>
      <AreaChart data={data}>
        <defs>
          <linearGradient id="cumGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f97316" stopOpacity={0.25}/><stop offset="100%" stopColor="#f97316" stopOpacity={0.01}/>
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
        <XAxis dataKey="label" tick={{fill:'#475569',fontSize:9}} axisLine={false} tickLine={false} interval={Math.ceil(data.length/5)} />
        <YAxis tick={{fill:'#475569',fontSize:9}} axisLine={false} tickLine={false} tickFormatter={v=>`${v}h`} width={28} />
        <Tooltip content={({active,payload,label})=>{
          if(!active||!payload?.length) return null;
          return (<div className="bg-[#0d1117] border border-slate-700/50 rounded-xl px-3 py-2.5 text-xs shadow-2xl">
            <p className="text-slate-400 mb-1 font-medium">{label}</p>
            <p className="text-orange-400 font-bold font-mono">{payload[0].value}h cumulative</p>
          </div>);
        }} cursor={{stroke:'#f9731640',strokeWidth:1}} />
        <Area type="monotone" dataKey="hours" stroke="#f97316" strokeWidth={2.5} fill="url(#cumGrad)" dot={false}
          activeDot={{fill:'#f97316',stroke:'#f9731440',strokeWidth:4,r:4}} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

// ─── Focus charts ─────────────────────────────────────────────────────────────
// ── Helpers for daily start/end/rest ─────────────────────────────────────────
function parseSessTime(s, field) {
  const raw = s[field];
  if (!raw) return null;
  const d = raw?.toDate ? raw.toDate() : new Date(raw);
  return isNaN(d.getTime()) ? null : d;
}

function fmt12(date) {
  if (!date) return '--';
  return date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
}

function fmtRestDur(ms) {
  const m = Math.round(ms / 60000);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60), rm = m % 60;
  return rm > 0 ? `${h}h ${rm}m` : `${h}h`;
}

// Get sorted + parsed blocks from sessions
function buildSessionBlocks(sessions) {
  return sessions
    .map(s => {
      const start = parseSessTime(s, 'startTime');
      let end = parseSessTime(s, 'endTime');
      if (!end && start && s.duration) end = new Date(start.getTime() + s.duration * 1000);
      if (!start) return null;
      if (!end || end <= start) end = new Date(start.getTime() + (s.duration || 0) * 1000);
      return {
        start, end,
        subject: s.subjectName || 'Unknown',
        color: s.subjectColor || '#f97316',
        duration: s.duration || Math.round((end - start) / 1000),
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.start - b.start);
}

// ── Daily Start/End/Rest summary banner ──────────────────────────────────────
function DayStartEndBanner({ sessions }) {
  if (!sessions || sessions.length === 0) return null;
  const blocks = buildSessionBlocks(sessions);
  if (!blocks.length) return null;

  const dayStart = blocks[0].start;
  const dayEnd   = blocks[blocks.length - 1].end;
  const totalSpanMs = dayEnd - dayStart;
  const studyMs = blocks.reduce((s, b) => s + b.duration * 1000, 0);
  const restMs  = Math.max(0, totalSpanMs - studyMs);

  const studyPct = totalSpanMs > 0 ? Math.round((studyMs / totalSpanMs) * 100) : 0;
  const restPct  = 100 - studyPct;

  return (
    <div className="bg-[#0d1625] rounded-2xl border border-slate-800/60 overflow-hidden">
      {/* Top bar: study vs rest ratio */}
      <div className="flex h-1.5 w-full overflow-hidden">
        <div style={{ width: `${studyPct}%`, backgroundColor: '#f97316' }} className="transition-all duration-700"/>
        <div style={{ width: `${restPct}%`, backgroundColor: '#1e293b' }}/>
      </div>

      <div className="p-4">
        {/* Start / End row */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="bg-[#0a0f1a] rounded-xl p-3 border border-slate-800/40">
            <div className="flex items-center gap-1.5 mb-1">
              <i className="ti ti-player-play text-green-400 text-xs"/>
              <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">Day Start</span>
            </div>
            <p className="text-lg font-bold font-mono text-green-400">{fmt12(dayStart)}</p>
            <p className="text-[10px] text-slate-600 mt-0.5">First session began</p>
          </div>
          <div className="bg-[#0a0f1a] rounded-xl p-3 border border-slate-800/40">
            <div className="flex items-center gap-1.5 mb-1">
              <i className="ti ti-player-stop text-red-400 text-xs"/>
              <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">Day End</span>
            </div>
            <p className="text-lg font-bold font-mono text-red-400">{fmt12(dayEnd)}</p>
            <p className="text-[10px] text-slate-600 mt-0.5">Last session ended</p>
          </div>
        </div>

        {/* Study vs Rest comparison */}
        <div className="grid grid-cols-2 gap-3">
          <div className="flex items-center gap-2.5 bg-orange-500/8 border border-orange-500/20 rounded-xl px-3 py-2.5">
            <div className="w-8 h-8 rounded-lg bg-orange-500/20 flex items-center justify-center flex-shrink-0">
              <i className="ti ti-book-2 text-orange-400 text-sm"/>
            </div>
            <div>
              <p className="text-sm font-bold font-mono text-orange-400">{fmtRestDur(studyMs)}</p>
              <p className="text-[10px] text-slate-500">Study time <span className="text-orange-500/70">({studyPct}%)</span></p>
            </div>
          </div>
          <div className="flex items-center gap-2.5 bg-slate-800/30 border border-slate-700/30 rounded-xl px-3 py-2.5">
            <div className="w-8 h-8 rounded-lg bg-slate-700/30 flex items-center justify-center flex-shrink-0">
              <i className="ti ti-coffee text-slate-400 text-sm"/>
            </div>
            <div>
              <p className="text-sm font-bold font-mono text-slate-300">{fmtRestDur(restMs)}</p>
              <p className="text-[10px] text-slate-500">Rest / breaks <span className="text-slate-600">({restPct}%)</span></p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Daily Study Timeline (vertical with gaps) ─────────────────────────────────
function DayStudyTimeline({ sessions }) {
  if (!sessions || sessions.length === 0) return (
    <div className="flex flex-col items-center justify-center h-20 gap-2">
      <i className="ti ti-timeline text-2xl text-slate-700"/>
      <p className="text-slate-600 text-sm">No sessions to show</p>
    </div>
  );

  const blocks = buildSessionBlocks(sessions);
  if (!blocks.length) return (
    <div className="flex items-center justify-center h-16 text-slate-600 text-sm">No valid sessions</div>
  );

  // Build interleaved list: session + gap between sessions
  const items = [];
  blocks.forEach((b, i) => {
    items.push({ type: 'session', ...b });
    if (i < blocks.length - 1) {
      const gapMs = blocks[i + 1].start - b.end;
      if (gapMs > 30000) { // only show gaps > 30s
        items.push({ type: 'gap', start: b.end, end: blocks[i + 1].start, ms: gapMs });
      }
    }
  });

  // Total span for proportional heights (min 10px per block, max 120px per block)
  const totalSpanMs = blocks[blocks.length - 1].end - blocks[0].start;

  function heightPx(ms) {
    if (totalSpanMs <= 0) return 48;
    return Math.min(120, Math.max(48, Math.round((ms / totalSpanMs) * 400)));
  }

  return (
    <div className="w-full">
      {/* Header: total span */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-green-400"/>
          <span className="text-[10px] text-slate-500">{fmt12(blocks[0].start)}</span>
        </div>
        <span className="text-[10px] text-slate-600">
          {fmtRestDur(totalSpanMs)} total span
        </span>
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-slate-500">{fmt12(blocks[blocks.length-1].end)}</span>
          <span className="w-2 h-2 rounded-full bg-red-400"/>
        </div>
      </div>

      {/* Vertical timeline */}
      <div className="flex gap-3">
        {/* Left time column */}
        <div className="flex flex-col items-end flex-shrink-0 w-14">
          {items.map((item, i) => (
            <div key={i} className="flex flex-col items-end justify-between"
              style={{ height: `${heightPx(item.type === 'session' ? item.duration * 1000 : item.ms)}px` }}>
              <span className="text-[9px] text-slate-600 leading-none">{fmt12(item.start)}</span>
              {i === items.length - 1 && (
                <span className="text-[9px] text-slate-600 leading-none">{fmt12(item.end)}</span>
              )}
            </div>
          ))}
        </div>

        {/* Center line + blocks */}
        <div className="flex flex-col items-center flex-shrink-0 w-6 relative">
          {/* Continuous vertical line */}
          <div className="absolute top-2 bottom-2 w-px bg-slate-800 left-1/2 -translate-x-1/2"/>
          {items.map((item, i) => {
            const h = heightPx(item.type === 'session' ? item.duration * 1000 : item.ms);
            return (
              <div key={i} className="relative z-10 flex flex-col items-center"
                style={{ height: `${h}px` }}>
                {item.type === 'session' ? (
                  <>
                    {/* Top dot */}
                    <div className="w-3 h-3 rounded-full border-2 border-[#0d1625] flex-shrink-0 mt-0.5"
                      style={{ backgroundColor: item.color }}/>
                    {/* Filled line */}
                    <div className="flex-1 w-1 rounded-full my-0.5"
                      style={{ backgroundColor: item.color + 'aa' }}/>
                    {/* Bottom dot */}
                    <div className="w-2.5 h-2.5 rounded-full border-2 border-[#0d1625] flex-shrink-0 mb-0.5"
                      style={{ backgroundColor: item.color + '88' }}/>
                  </>
                ) : (
                  <>
                    {/* Gap — dashed line */}
                    <div className="flex-1 w-px border-l-2 border-dashed border-slate-700/50 my-1"/>
                  </>
                )}
              </div>
            );
          })}
        </div>

        {/* Right content column */}
        <div className="flex flex-col flex-1 min-w-0">
          {items.map((item, i) => {
            const h = heightPx(item.type === 'session' ? item.duration * 1000 : item.ms);
            return (
              <div key={i} className="flex items-start pt-0.5"
                style={{ height: `${h}px` }}>
                {item.type === 'session' ? (
                  <div className="rounded-xl px-3 py-2 border w-full"
                    style={{
                      backgroundColor: item.color + '14',
                      borderColor: item.color + '33',
                    }}>
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }}/>
                        <span className="text-xs font-semibold truncate" style={{ color: item.color }}>{item.subject}</span>
                      </div>
                      <span className="text-xs font-bold font-mono text-white flex-shrink-0">{formatDuration(item.duration)}</span>
                    </div>
                    <p className="text-[10px] text-slate-500 mt-1">
                      {fmt12(item.start)} → {fmt12(item.end)}
                    </p>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 px-2 py-1 w-full">
                    <i className="ti ti-coffee text-slate-700 text-xs flex-shrink-0"/>
                    <span className="text-[10px] text-slate-700">
                      Break · {fmtRestDur(item.ms)}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── Weekly Improvement (for Month view) ────────────────────────────────────────
// Shows each week of the month with hours + % change vs prev week
function WeeklyImprovement({ sessions, monthNav }) {
  const weeks = useMemo(() => {
    if (!sessions || !monthNav) return [];
    const [y, m] = monthNav.split('-').map(Number);
    const firstDay = new Date(y, m - 1, 1);
    const lastDay = new Date(y, m, 0);

    // Build week buckets: Sun–Sat within month
    const result = [];
    let cur = new Date(firstDay);
    let weekNum = 1;
    while (cur <= lastDay) {
      const weekStart = new Date(cur);
      // End of week = next Saturday or end of month
      const weekEnd = new Date(cur);
      weekEnd.setDate(weekEnd.getDate() + (6 - weekEnd.getDay()));
      if (weekEnd > lastDay) weekEnd.setTime(lastDay.getTime());

      const startStr = getDateString(weekStart);
      const endStr = getDateString(weekEnd);

      const weekSessions = sessions.filter(s => {
        const d = s.date || getDateString(new Date(s.startTime?.toDate?.()?.toISOString() || s.startTime));
        return d >= startStr && d <= endStr;
      });
      const totalSecs = weekSessions.reduce((sum, s) => sum + (s.duration || 0), 0);

      result.push({
        label: `Week ${weekNum}`,
        startStr, endStr,
        seconds: totalSecs,
        hours: totalSecs / 3600,
      });

      // Move to next Sunday
      const nextSun = new Date(weekEnd);
      nextSun.setDate(nextSun.getDate() + 1);
      cur = nextSun;
      weekNum++;
    }
    return result;
  }, [sessions, monthNav]);

  if (weeks.length === 0) return (
    <div className="flex items-center justify-center h-16 text-slate-600 text-sm">No data</div>
  );

  const maxHours = Math.max(...weeks.map(w => w.hours), 1);

  return (
    <div className="space-y-2">
      {weeks.map((week, i) => {
        const prev = weeks[i - 1];
        const diff = prev ? week.hours - prev.hours : null;
        const pct = Math.round((week.hours / maxHours) * 100);
        const improved = diff !== null && diff > 0;
        const declined = diff !== null && diff < 0;

        return (
          <div key={i} className="bg-[#0a0f1a] rounded-xl p-3 border border-slate-800/40">
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-300">{week.label}</span>
                <span className="text-[10px] text-slate-600">{week.startStr.slice(5)} – {week.endStr.slice(5)}</span>
              </div>
              <div className="flex items-center gap-2">
                {diff !== null && (
                  <span className={`text-[10px] font-bold flex items-center gap-0.5
                    ${improved ? 'text-green-400' : declined ? 'text-red-400' : 'text-slate-500'}`}>
                    <i className={`ti ${improved ? 'ti-trending-up' : declined ? 'ti-trending-down' : 'ti-minus'} text-[10px]`}/>
                    {diff > 0 ? '+' : ''}{diff.toFixed(1)}h
                  </span>
                )}
                <span className="text-xs font-bold font-mono text-orange-400">{week.hours.toFixed(1)}h</span>
              </div>
            </div>
            <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <div className="h-full rounded-full transition-all duration-500"
                style={{ width: `${pct}%`, backgroundColor: improved ? '#22c55e' : declined ? '#ef4444' : '#f97316' }}/>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function FocusDailyBars({ byDay }) {
  if (!byDay.length) return <div className="flex flex-col items-center justify-center h-28 gap-2"><i className="ti ti-target text-2xl text-slate-700"/><p className="text-slate-600 text-sm">No focus sessions yet</p></div>;
  const data = byDay.slice(-14).map(d => ({ ...d, hours: +(d.focusSeconds/3600).toFixed(2) }));
  return (
    <ResponsiveContainer width="100%" height={120}>
      <ReBarChart data={data} barSize={10} barCategoryGap="30%">
        <defs><linearGradient id="fb" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#a855f7" stopOpacity={0.9}/><stop offset="100%" stopColor="#a855f7" stopOpacity={0.4}/></linearGradient></defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
        <XAxis dataKey="date" tickFormatter={d=>d.slice(5)} tick={{fill:'#475569',fontSize:9}} axisLine={false} tickLine={false} interval={Math.ceil(data.length/7)} />
        <YAxis tick={{fill:'#475569',fontSize:9}} axisLine={false} tickLine={false} tickFormatter={v=>`${v}h`} width={24} />
        <Tooltip content={({active,payload,label})=>{
          if(!active||!payload?.length) return null;
          return (<div className="bg-[#0d1117] border border-slate-700/50 rounded-xl px-3 py-2.5 text-xs shadow-2xl">
            <p className="text-slate-400 mb-1 font-medium">{label}</p>
            <p className="text-purple-400 font-bold font-mono">{payload[0].value}h focus</p>
            <p className="text-slate-500">{payload[0]?.payload?.sessions} sessions</p>
          </div>);
        }} cursor={{fill:'rgba(255,255,255,0.02)'}} />
        <Bar dataKey="hours" fill="url(#fb)" radius={[4,4,0,0]} />
      </ReBarChart>
    </ResponsiveContainer>
  );
}

function VocabDailyBars({ last7Days }) {
  if (!last7Days?.length) return <div className="flex flex-col items-center justify-center h-28 gap-2"><i className="ti ti-book-2 text-2xl text-slate-700"/><p className="text-slate-600 text-sm">No vocab reading yet</p></div>;
  const data = last7Days.map(d => ({ ...d, minutes: +(d.seconds/60).toFixed(1) }));
  return (
    <ResponsiveContainer width="100%" height={120}>
      <ReBarChart data={data} barSize={16} barCategoryGap="30%">
        <defs><linearGradient id="vb" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#10b981" stopOpacity={0.9}/><stop offset="100%" stopColor="#10b981" stopOpacity={0.4}/></linearGradient></defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
        <XAxis dataKey="date" tickFormatter={d=>d.slice(5)} tick={{fill:'#475569',fontSize:9}} axisLine={false} tickLine={false} />
        <YAxis tick={{fill:'#475569',fontSize:9}} axisLine={false} tickLine={false} tickFormatter={v=>`${v}m`} width={28} />
        <Tooltip content={({active,payload,label})=>{
          if(!active||!payload?.length) return null;
          return (<div className="bg-[#0d1117] border border-slate-700/50 rounded-xl px-3 py-2.5 text-xs shadow-2xl">
            <p className="text-slate-400 mb-1 font-medium">{label}</p>
            <p className="text-emerald-400 font-bold font-mono">{payload[0].value}m reading</p>
          </div>);
        }} cursor={{fill:'rgba(255,255,255,0.02)'}} />
        <Bar dataKey="minutes" fill="url(#vb)" radius={[4,4,0,0]} />
      </ReBarChart>
    </ResponsiveContainer>
  );
}

function FocusHourlyHeatmap({ pattern }) {
  const max = Math.max(...pattern, 0.01);
  const LABELS = ['12a','1','2','3','4','5','6','7','8','9','10','11','12p','1','2','3','4','5','6','7','8','9','10','11'];
  return (
    <div>
      <div className="flex gap-0.5 mb-1">
        {pattern.map((v,i)=>{
          const pct=v/max;
          return <div key={i} className="flex-1 rounded-sm cursor-help"
            style={{height:24,backgroundColor:pct<0.01?'#1e293b':`rgba(168,85,247,${0.1+pct*0.85})`}}
            title={`${i}:00 — ${Math.round(v*60)} min`}/>;
        })}
      </div>
      <div className="flex mt-1">{LABELS.map((l,i)=><div key={i} className="flex-1"><span className="text-[8px] text-slate-700 font-medium">{l}</span></div>)}</div>
    </div>
  );
}

function ProgressBar({ label, value, max, color, sublabel }) {
  const pct = max > 0 ? Math.round((value/max)*100) : 0;
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs text-slate-400 font-medium">{label}</span>
        <div className="flex items-center gap-2">{sublabel&&<span className="text-[10px] text-slate-600">{sublabel}</span>}<span className="text-xs font-bold font-mono" style={{color}}>{value}</span></div>
      </div>
      <div className="h-2 bg-slate-800/80 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-700" style={{width:`${pct}%`,backgroundColor:color}} />
      </div>
    </div>
  );
}

// ─── Period Navigator (prev/next arrows + label) ──────────────────────────────
function PeriodNavigator({ mode, navDate, onNav }) {
  let label = '';
  if (mode === 'day') label = formatDayLabel(navDate);
  else if (mode === 'week') {
    const ref = new Date(navDate + 'T12:00:00');
    const { start, end } = getSundayWeekRange(ref);
    label = `${getDateString(start).slice(5).replace('-','/')} – ${getDateString(end).slice(5).replace('-','/')}`;
  } else if (mode === 'month') {
    label = formatMonthName(navDate + '-01');
  }

  const canGoForward = () => {
    const today = getStudyDayString();
    if (mode === 'day') return navDate < today;
    if (mode === 'week') {
      const { end } = getSundayWeekRange(new Date(navDate + 'T12:00:00'));
      return getDateString(end) < today;
    }
    if (mode === 'month') {
      const [y, m] = navDate.split('-').map(Number);
      const [ty, tm] = today.split('-').map(Number);
      return y < ty || (y === ty && m < tm);
    }
    return false;
  };

  return (
    <div className="flex items-center gap-2">
      <button onClick={() => onNav(-1)}
        className="w-8 h-8 rounded-xl bg-slate-800/80 ring-1 ring-slate-700/50 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-700 transition-all">
        <i className="ti ti-chevron-left text-sm" />
      </button>
      <span className="text-sm font-semibold text-slate-200 min-w-[160px] text-center">{label}</span>
      <button onClick={() => onNav(1)} disabled={!canGoForward()}
        className="w-8 h-8 rounded-xl bg-slate-800/80 ring-1 ring-slate-700/50 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-700 transition-all disabled:opacity-30 disabled:cursor-not-allowed">
        <i className="ti ti-chevron-right text-sm" />
      </button>
    </div>
  );
}

// ─── Main Stats Page ──────────────────────────────────────────────────────────
const PERIODS = ['Day', 'Week', 'Month', 'Custom'];

export default function Stats() {
  const today4am = getStudyDayString();
  const [activeTab,     setActiveTab]     = useState('Week');
  const [customStart,   setCustomStart]   = useState('');
  const [customEnd,     setCustomEnd]     = useState('');
  const [activeSection, setActiveSection] = useState('study');
  const [exporting,     setExporting]     = useState('');
  const [refreshKey,    setRefreshKey]    = useState(0);
  const [vocabStats,    setVocabStats]    = useState(null);
  const [vocabLoading,  setVocabLoading]  = useState(false);
  const [showThemePicker, setShowThemePicker] = useState(false);
  const themePickerRef = useRef(null);

  useEffect(() => {
    if (!showThemePicker) return;
    function handleClickOutside(e) {
      if (themePickerRef.current && !themePickerRef.current.contains(e.target)) {
        setShowThemePicker(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showThemePicker]);
  const [summaryBusy,     setSummaryBusy]     = useState(false);
  const [summaryProgress, setSummaryProgress] = useState('');
  const customPhotoInputRef = useRef(null);

  // Navigation dates per mode
  const [dayNav,   setDayNav]   = useState(today4am);            // YYYY-MM-DD
  const [weekNav,  setWeekNav]  = useState(today4am);            // any date in target week
  const [monthNav, setMonthNav] = useState(today4am.slice(0,7)); // YYYY-MM

  useEffect(() => {
    const refresh = () => setRefreshKey(k => k + 1);
    document.addEventListener('visibilitychange', refresh);
    window.addEventListener('focus', refresh);
    // AUTO-REFRESH: timer stop hone par stats turant update ho
    window.addEventListener('tapasya:session-saved', refresh);
    return () => { document.removeEventListener('visibilitychange', refresh); window.removeEventListener('focus', refresh); window.removeEventListener('tapasya:session-saved', refresh); };
  }, []);

  // Vocab reading time — sirf jab uska tab khula ho tab fetch karo
  useEffect(() => {
    if (activeSection !== 'vocab') return;
    setVocabLoading(true);
    fetchReadingStats(today4am).then(setVocabStats).finally(() => setVocabLoading(false));
  }, [activeSection, refreshKey, today4am]);

  // Navigate forward/back
  function handleNav(dir) {
    if (activeTab === 'Day') {
      const next = addDays(dayNav, dir);
      if (dir > 0 && next > today4am) return;
      setDayNav(next);
    } else if (activeTab === 'Week') {
      const refDate = new Date(weekNav + 'T12:00:00');
      refDate.setDate(refDate.getDate() + dir * 7);
      const newStr = getDateString(refDate);
      // Don't go past today's week
      const { start: todayWeekStart } = getSundayWeekRange(new Date());
      if (dir > 0 && refDate >= todayWeekStart) {
        // allow only if we're not already at current week
        const { start: curWeekStart } = getSundayWeekRange(new Date(weekNav + 'T12:00:00'));
        if (getDateString(curWeekStart) >= getDateString(todayWeekStart)) return;
      }
      setWeekNav(newStr);
    } else if (activeTab === 'Month') {
      const [y, m] = monthNav.split('-').map(Number);
      let ny = y, nm = m + dir;
      if (nm > 12) { ny++; nm = 1; }
      if (nm < 1)  { ny--; nm = 12; }
      const newMonthStr = `${ny}-${String(nm).padStart(2,'0')}`;
      // Don't go past current month
      const todayMonth = today4am.slice(0,7);
      if (dir > 0 && newMonthStr > todayMonth) return;
      setMonthNav(newMonthStr);
    }
  }

  // Compute fetch range based on tab+nav
  const { startDate, endDate } = useMemo(() => {
    if (activeTab === 'Day')    return { startDate: dayNav,   endDate: dayNav };
    if (activeTab === 'Week') {
      const ref = new Date(weekNav + 'T12:00:00');
      const { start, end } = getSundayWeekRange(ref);
      return { startDate: getDateString(start), endDate: getDateString(end) };
    }
    if (activeTab === 'Month') {
      const [y, m] = monthNav.split('-').map(Number);
      return { startDate: `${monthNav}-01`, endDate: getDateString(new Date(y, m, 0)) };
    }
    if (activeTab === 'Custom' && customStart && customEnd) {
      return { startDate: customStart, endDate: customEnd };
    }
    // fallback
    const d = new Date(); d.setDate(d.getDate()-6);
    return { startDate: getDateString(d), endDate: today4am };
  }, [activeTab, dayNav, weekNav, monthNav, customStart, customEnd]);

  const period = useMemo(() => ({
    period: activeTab.toLowerCase(),
    startDate, endDate,
  }), [activeTab, startDate, endDate]);

  const { donutData, loading, totalSeconds, sessions } = useStats(period, refreshKey);
  const { badges: earnedBadges } = useBadges();
  const displayName = useUserStore((s) => s.displayName) || 'Aspirant';
  const exams = useExams();
  const upcomingExams = (exams || [])
    .filter((e) => {
      if (!e.examDate) return false
      const today = new Date(); today.setHours(0,0,0,0)
      const ex = new Date(e.examDate); ex.setHours(0,0,0,0)
      return ex >= today
    })
    .sort((a, b) => new Date(a.examDate) - new Date(b.examDate))
  const primaryExam = upcomingExams[0]; // ✅ FIX: sirf upcoming exam — pehle koi bhi (past bhi) le leta tha, isse "-17 days left" jaisa bug aata tha

  // ── Daily view data ──────────────────────────────────────────────────────
  const daySubjects = useMemo(() => activeTab === 'Day' ? aggregateForDay(sessions || [], dayNav) : [], [sessions, dayNav, activeTab]);

  // ── Weekly view data ─────────────────────────────────────────────────────
  const weekBarData = useMemo(() => {
    if (activeTab !== 'Week') return [];
    const ref = new Date(weekNav + 'T12:00:00');
    const { start } = getSundayWeekRange(ref);
    const startStr = getDateString(start);
    const dateList = getNDaysFrom(startStr, 7);
    const rawData = aggregateByDateList(sessions || [], dateList);
    const dayNames = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
    return rawData.map((d, i) => ({ ...d, label: dayNames[i] }));
  }, [sessions, weekNav, activeTab]);

  // ── Monthly view data ────────────────────────────────────────────────────
  const monthBarData = useMemo(() => {
    if (activeTab !== 'Month') return [];
    const [y, m] = monthNav.split('-').map(Number);
    const daysInMonth = new Date(y, m, 0).getDate();
    const dateList = getNDaysFrom(`${monthNav}-01`, daysInMonth);
    const rawData = aggregateByDateList(sessions || [], dateList);
    return rawData.map((d, idx) => ({ ...d, label: String(idx + 1) }));
  }, [sessions, monthNav, activeTab]);

  const monthHourlyData = useMemo(() => {
    if (activeTab !== 'Month') return null;
    return sessions || [];
  }, [sessions, activeTab]);

  // ── Cumulative step data ─────────────────────────────────────────────────
  const processedStepData = useMemo(() => {
    if (!sessions) return [];
    const cum = getCumulative(sessions);
    return cum.map(d => ({
      ...d,
      hours: parseFloat((d.hours||0).toFixed(2)),
      label: d.date ? new Date(d.date+'T00:00').toLocaleDateString('en-IN',{month:'short',day:'numeric'}) : d.date,
    }));
  }, [sessions]);

  const daysInPeriod = activeTab==='Day'?1:activeTab==='Week'?7:30;
  const dailyAvg = ((totalSeconds||0)/daysInPeriod/3600).toFixed(1);

  // ── Focus data ───────────────────────────────────────────────────────────
  const focusRecords = useMemo(() => getFocusHistory(startDate, endDate), [startDate, endDate, refreshKey]);
  const focusStats   = useMemo(() => getFocusStats(focusRecords), [focusRecords]);

  async function handleExportPDF() {
    setExporting('pdf');
    try { await exportStatsPDF({sessions:sessions||[],focusRecords,period:activeTab,totalSeconds:totalSeconds||0,donutData:donutData||[],barData:weekBarData}); } finally { setExporting(''); }
  }
  function handleExportCSV() {
    setExporting('csv');
    try { exportStatsCSV({sessions:sessions||[],focusRecords,donutData:donutData||[],barData:weekBarData}); } finally { setExporting(''); }
  }

  async function handleGenerateSummary(theme, customImageDataUrl = null) {
    setShowThemePicker(false);
    setSummaryBusy(true);
    let examDaysLeft = null;
    if (primaryExam?.examDate) {
      const today = new Date(); today.setHours(0,0,0,0);
      const ex = new Date(primaryExam.examDate); ex.setHours(0,0,0,0);
      examDaysLeft = Math.ceil((ex - today) / 86400000);
    }
    try {
      await generateSummaryReport({
        userName: displayName,
        examName: primaryExam?.name || '',
        examDaysLeft,
        theme,
        customImageDataUrl,
        onProgress: setSummaryProgress,
      });
    } catch (err) {
      console.error('Summary report failed:', err);
      alert('Report generate karne mein dikkat aayi. Dobara try karo.');
    } finally {
      setSummaryBusy(false);
      setSummaryProgress('');
    }
  }

  function handleCustomPhotoPick() {
    customPhotoInputRef.current?.click();
  }

  function handleCustomPhotoSelected(e) {
    const file = e.target.files?.[0];
    e.target.value = ''; // reset so selecting the same file again still fires onChange
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      handleGenerateSummary('custom', reader.result);
    };
    reader.onerror = () => alert('Photo read karne mein dikkat aayi. Dobara try karo.');
    reader.readAsDataURL(file);
  }

  const isToday = activeTab === 'Day' && dayNav === today4am;

  return (
    <div className="min-h-screen bg-[#080d16] pb-24 lg:pb-8">
      <div className="max-w-3xl mx-auto px-3 sm:px-4 pt-6">

        {/* Header */}
        <div className="flex flex-col gap-4 mb-6">
          <div className="flex items-start justify-between flex-wrap gap-2">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <div className="w-1 h-6 bg-orange-500 rounded-full" />
                <h1 className="text-xl font-black text-slate-100 tracking-tight">Statistics</h1>
              </div>
              <p className="text-slate-500 text-xs pl-3">Track your learning journey</p>
            </div>
            <div ref={themePickerRef} className="flex items-center gap-1.5 relative">
              <button onClick={handleExportCSV} disabled={!!exporting||loading}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#111827] ring-1 ring-slate-700/50 text-slate-400 hover:text-green-400 hover:ring-green-500/40 text-xs font-semibold transition-all disabled:opacity-40">
                <i className={`ti ${exporting==='csv'?'ti-loader-2 animate-spin':'ti-table-export'} text-sm`}/> Excel
              </button>
              <button onClick={handleExportPDF} disabled={!!exporting||loading}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#111827] ring-1 ring-slate-700/50 text-slate-400 hover:text-red-400 hover:ring-red-500/40 text-xs font-semibold transition-all disabled:opacity-40">
                <i className={`ti ${exporting==='pdf'?'ti-loader-2 animate-spin':'ti-file-type-pdf'} text-sm`}/> PDF
              </button>

              {/* ✨ Generate Summary — animated colorful PDF report */}
              <button
                onClick={() => setShowThemePicker((v) => !v)}
                disabled={summaryBusy}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-orange-500 via-pink-500 to-purple-500 bg-[length:200%_auto] hover:bg-[position:100%_0] text-white text-xs font-bold shadow-lg shadow-orange-500/30 transition-all duration-500 disabled:opacity-60"
              >
                <i className={`ti ${summaryBusy ? 'ti-loader-2 animate-spin' : 'ti-sparkles'} text-sm`}/>
                {summaryBusy ? (summaryProgress || 'Generating…') : 'Generate Summary'}
              </button>

              {showThemePicker && !summaryBusy && (
                <div className="absolute right-0 top-full mt-2 z-30 bg-[#0d1117] ring-1 ring-slate-700/60 rounded-2xl p-3 shadow-2xl w-64">
                  <p className="text-[11px] text-slate-400 font-semibold mb-2.5 px-1">Apna report character choose karo</p>
                  <div className="flex gap-2.5">
                    <button onClick={() => handleGenerateSummary('boy')}
                      className="flex-1 group rounded-xl overflow-hidden ring-1 ring-slate-700/60 hover:ring-red-500/60 transition-all bg-[#141414]">
                      <img src="/report-characters/boy.png" alt="Mastermind" className="w-full h-28 object-cover object-top" />
                      <div className="py-1.5 text-[11px] font-bold text-red-400 group-hover:text-red-300">Mastermind</div>
                    </button>
                    <button onClick={() => handleGenerateSummary('girl')}
                      className="flex-1 group rounded-xl overflow-hidden ring-1 ring-slate-700/60 hover:ring-pink-500/60 transition-all bg-[#141414]">
                      <img src="/report-characters/girl.png" alt="Street Icon" className="w-full h-28 object-cover object-top" />
                      <div className="py-1.5 text-[11px] font-bold text-pink-400 group-hover:text-pink-300">Street Icon</div>
                    </button>
                  </div>
                  <button onClick={handleCustomPhotoPick}
                    className="mt-2.5 w-full flex items-center gap-2.5 rounded-xl ring-1 ring-slate-700/60 hover:ring-sky-500/60 transition-all bg-[#141414] p-2.5 group">
                    <div className="w-9 h-9 rounded-lg bg-sky-500/10 flex items-center justify-center shrink-0 group-hover:bg-sky-500/20">
                      <i className="ti ti-camera-plus text-sky-400 text-base" />
                    </div>
                    <div className="text-left">
                      <div className="text-[11px] font-bold text-sky-400 group-hover:text-sky-300">Upload Your Photo</div>
                      <div className="text-[10px] text-slate-500">Apni pic se personalized report</div>
                    </div>
                  </button>
                  <input
                    ref={customPhotoInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleCustomPhotoSelected}
                    className="hidden"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Period tabs */}
          <div className="flex gap-1 p-1 bg-[#0d1117] rounded-xl ring-1 ring-slate-800/50 w-fit">
            {PERIODS.map(t => (
              <button key={t} onClick={()=>setActiveTab(t)}
                className={`px-3 sm:px-4 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 ${activeTab===t?'bg-orange-500 text-white shadow-lg shadow-orange-500/30':'text-slate-500 hover:text-slate-300 hover:bg-slate-800/50'}`}>
                {t}
              </button>
            ))}
          </div>

          {/* Navigator for Day/Week/Month */}
          {(activeTab === 'Day' || activeTab === 'Week' || activeTab === 'Month') && (
            <div className="flex items-center gap-3 flex-wrap">
              <PeriodNavigator
                mode={activeTab.toLowerCase()}
                navDate={activeTab==='Day' ? dayNav : activeTab==='Week' ? weekNav : monthNav}
                onNav={handleNav}
              />
              {activeTab === 'Day' && !isToday && (
                <button onClick={() => setDayNav(today4am)}
                  className="text-xs text-orange-400 hover:text-orange-300 transition-colors px-2 py-1 rounded-lg bg-orange-500/10">
                  Today
                </button>
              )}
            </div>
          )}

          {activeTab==='Custom' && (
            <div className="flex items-center gap-2 flex-wrap">
              <input type="date" value={customStart} onChange={e=>setCustomStart(e.target.value)}
                className="bg-[#111827] ring-1 ring-slate-700/50 text-slate-200 text-xs rounded-xl px-3 py-2 focus:outline-none focus:ring-orange-500" />
              <span className="text-slate-600 text-xs font-medium">→</span>
              <input type="date" value={customEnd} onChange={e=>setCustomEnd(e.target.value)}
                className="bg-[#111827] ring-1 ring-slate-700/50 text-slate-200 text-xs rounded-xl px-3 py-2 focus:outline-none focus:ring-orange-500" />
            </div>
          )}
        </div>

        {/* Section switcher */}
        <div className="flex gap-1 p-1 bg-[#0d1117] rounded-xl ring-1 ring-slate-800/50 mb-6 w-fit">
          <button onClick={()=>setActiveSection('study')}
            className={`px-4 sm:px-5 py-2 rounded-lg text-xs font-bold transition-all duration-200 flex items-center gap-1.5 ${activeSection==='study'?'bg-orange-500 text-white shadow-lg shadow-orange-500/30':'text-slate-500 hover:text-slate-300 hover:bg-slate-800/50'}`}>
            <i className="ti ti-book-2 text-sm"/> Study Stats
          </button>
          <button onClick={()=>setActiveSection('focus')}
            className={`px-4 sm:px-5 py-2 rounded-lg text-xs font-bold transition-all duration-200 flex items-center gap-1.5 ${activeSection==='focus'?'bg-purple-600 text-white shadow-lg shadow-purple-600/30':'text-slate-500 hover:text-slate-300 hover:bg-slate-800/50'}`}>
            <i className="ti ti-target text-sm"/> Focus Mode
          </button>
          <button onClick={()=>setActiveSection('vocab')}
            className={`px-4 sm:px-5 py-2 rounded-lg text-xs font-bold transition-all duration-200 flex items-center gap-1.5 ${activeSection==='vocab'?'bg-emerald-600 text-white shadow-lg shadow-emerald-600/30':'text-slate-500 hover:text-slate-300 hover:bg-slate-800/50'}`}>
            <i className="ti ti-book-2 text-sm"/> Vocab Reading
          </button>
        </div>

        {/* ── STUDY STATS ── */}
        {activeSection==='study' && (
          <>
            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3">
                <div className="w-10 h-10 border-2 border-orange-500 border-t-transparent rounded-full animate-spin"/>
                <p className="text-slate-600 text-xs">Loading stats...</p>
              </div>
            ) : (
              <>
                {/* Metric Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-5">
                  <MetricCard icon="ti-clock"       label="Total Time" value={formatDuration(totalSeconds||0)} accent="orange" />
                  <MetricCard icon="ti-trending-up" label={activeTab==='Day'?'Sessions':'Daily Avg'} value={activeTab==='Day'?String(sessions?.length||0):`${dailyAvg}h`} sub={activeTab==='Day'?'today':'per day'} accent="blue" />
                  <MetricCard icon="ti-books"       label="Subjects"   value={donutData?.length||0}  sub="studied"   accent="green" />
                  <MetricCard icon="ti-player-play" label="Sessions"   value={sessions?.length||0}   sub="completed" accent="purple" />
                  <MetricCard icon="ti-trophy"      label="Badges"     value={`${earnedBadges.length}/${ALL_BADGES.length}`} sub="unlocked" accent="orange" />
                </div>

                {/* ─ DAY VIEW ─ */}
                {activeTab === 'Day' && (
                  <>
                    {/* Start / End / Study-Rest banner */}
                    {sessions && sessions.length > 0 && (
                      <div className="mb-4">
                        <DayStartEndBanner sessions={sessions} />
                      </div>
                    )}
                    <div className="mb-4">
                      <ChartCard title={`${isToday ? 'Today' : formatDayLabel(dayNav)} — Subject Breakdown`} icon="ti-chart-donut-3">
                        {daySubjects.length > 0 ? (
                          <DonutChart data={daySubjects} total={totalSeconds||0} />
                        ) : (
                          <div className="flex flex-col items-center justify-center h-36 gap-2">
                            <i className="ti ti-moon-stars text-2xl text-slate-700" />
                            <p className="text-slate-600 text-sm">No study sessions {isToday ? 'today' : 'this day'}</p>
                          </div>
                        )}
                      </ChartCard>
                    </div>
                    {sessions && sessions.length > 0 && (
                      <div className="mb-4">
                        <ChartCard title="Study Timeline" icon="ti-timeline">
                          <DayStudyTimeline sessions={sessions} />
                        </ChartCard>
                      </div>
                    )}
                    {sessions && sessions.length > 0 && (
                      <ChartCard title="Sessions Log" icon="ti-list">
                        <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
                          {sessions.slice().reverse().map((s, i) => {
                            const t = new Date(s.startTime?.toDate?.()?.toISOString() || s.startTime);
                            const timeStr = isNaN(t.getTime()) ? '' : t.toLocaleTimeString('en-IN', {hour:'2-digit',minute:'2-digit',hour12:true});
                            return (
                              <div key={i} className="flex items-center justify-between bg-[#0a0f1a] rounded-xl px-3 py-2.5 border border-slate-800/40">
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{backgroundColor:s.subjectColor||'#f97316'}}/>
                                  <span className="text-xs text-slate-300 truncate font-medium">{s.subjectName||'Unknown'}</span>
                                </div>
                                <div className="flex items-center gap-3 flex-shrink-0">
                                  {timeStr && <span className="text-[10px] text-slate-600">{timeStr}</span>}
                                  <span className="text-xs font-mono text-orange-400 font-bold">{formatHumanDuration(s.duration)}</span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </ChartCard>
                    )}
                  </>
                )}

                {/* ─ WEEK VIEW ─ */}
                {activeTab === 'Week' && (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                      <ChartCard title="Subject Split" icon="ti-chart-donut-3" badge={`${donutData?.length||0} subjects`}>
                        <DonutChart data={donutData||[]} total={totalSeconds||0} />
                      </ChartCard>
                      <ChartCard title="Daily Hours (Sun–Sat)" icon="ti-chart-bar">
                        <StackedBarChart data={weekBarData} xKey="label" />
                      </ChartCard>
                    </div>
                    {processedStepData.length > 0 && (
                      <div className="mb-4">
                        <ChartCard title="Cumulative Progress" icon="ti-trending-up" badge="growth curve">
                          <CumulativeChart data={processedStepData} />
                        </ChartCard>
                      </div>
                    )}
                  </>
                )}

                {/* ─ MONTH VIEW ─ */}
                {activeTab === 'Month' && (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                      <ChartCard title="Subject Split" icon="ti-chart-donut-3">
                        <DonutChart data={donutData||[]} total={totalSeconds||0} />
                      </ChartCard>
                      <ChartCard title="Daily Hours This Month" icon="ti-chart-bar">
                        <StackedBarChart data={monthBarData} xKey="label" height={180} />
                      </ChartCard>
                    </div>
                    {/* Weekly Improvement */}
                    <div className="mb-4">
                      <ChartCard title="Weekly Improvement" icon="ti-trending-up" badge="this month">
                        <p className="text-[10px] text-slate-500 mb-3 font-semibold uppercase tracking-[0.12em]">
                          Week-by-week comparison — green = improved, red = less than prev week
                        </p>
                        <WeeklyImprovement sessions={sessions || []} monthNav={monthNav} />
                      </ChartCard>
                    </div>
                    {/* Hourly activity heatmap */}
                    <div className="mb-4">
                      <ChartCard title="When Do You Study?" icon="ti-sun" badge="by hour">
                        <p className="text-[10px] text-slate-500 mb-3 font-semibold uppercase tracking-[0.12em]">
                          Total activity this month by hour of day
                        </p>
                        {monthHourlyData && monthHourlyData.length > 0 ? (
                          <HourlyActivityHeatmap sessions={monthHourlyData} />
                        ) : (
                          <div className="flex items-center justify-center h-16 text-slate-600 text-sm">No data</div>
                        )}
                      </ChartCard>
                    </div>
                    {processedStepData.length > 0 && (
                      <div className="mb-4">
                        <ChartCard title="Cumulative Progress" icon="ti-trending-up">
                          <CumulativeChart data={processedStepData} />
                        </ChartCard>
                      </div>
                    )}
                  </>
                )}

                {/* ─ CUSTOM VIEW ─ */}
                {activeTab === 'Custom' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                    <ChartCard title="Subject Split" icon="ti-chart-donut-3">
                      <DonutChart data={donutData||[]} total={totalSeconds||0} />
                    </ChartCard>
                    <ChartCard title="Daily Hours" icon="ti-chart-bar">
                      <StackedBarChart data={(sessions||[]).length > 0
                        ? aggregateByDateList(sessions, getLastNDays(Math.min(30, Math.ceil((new Date(endDate)-new Date(startDate))/86400000)+1))).map((d, idx) => ({...d, label: d.date}))
                        : []} xKey="label" />
                    </ChartCard>
                  </div>
                )}

                {/* Recent Sessions (all views) */}
                {sessions && sessions.length > 0 && activeTab !== 'Day' && (
                  <ChartCard title="Recent Sessions" icon="ti-list">
                    <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
                      {sessions.slice(0,12).map((s,i)=>(
                        <div key={i} className="flex items-center justify-between bg-[#0a0f1a] rounded-xl px-3 py-2.5 border border-slate-800/40 hover:border-slate-700/60 transition-colors">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{backgroundColor:s.subjectColor||'#f97316'}}/>
                            <span className="text-xs text-slate-300 truncate font-medium">{s.subjectName||'Unknown'}</span>
                          </div>
                          <div className="flex items-center gap-3 flex-shrink-0">
                            <span className="text-[10px] text-slate-600">{s.date}</span>
                            <span className="text-xs font-mono text-orange-400 font-bold">{formatHumanDuration(s.duration)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ChartCard>
                )}

                {!sessions?.length && !loading && (
                  <div className="text-center py-16 mt-4">
                    <div className="w-16 h-16 rounded-2xl bg-slate-800/30 flex items-center justify-center mx-auto mb-4"><i className="ti ti-chart-bar text-3xl text-slate-600 opacity-30"/></div>
                    <p className="text-sm text-slate-600 font-medium">Is period mein koi session nahi</p>
                    <p className="text-xs mt-1 text-slate-700">Padhai shuru karo! 🔥</p>
                  </div>
                )}
              </>
            )}
          </>
        )}

        {/* ── FOCUS MODE STATS ── */}
        {activeSection==='focus' && (
          <>
            <div className="flex items-center justify-between mb-4">
              <p className="text-[10px] text-slate-600 font-medium">Data from localStorage · updates on tab switch</p>
              <button onClick={() => setRefreshKey(k => k + 1)}
                className="flex items-center gap-1.5 text-[10px] text-slate-500 hover:text-purple-400 transition-colors px-2 py-1 rounded-lg hover:bg-purple-500/5">
                <i className="ti ti-refresh text-xs"/> Refresh
              </button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
              <MetricCard icon="ti-target"      label="Focus Sessions" value={focusStats.totalWorkSessions}                     sub="work sessions" accent="purple"/>
              <MetricCard icon="ti-clock"       label="Focus Time"     value={formatHumanDuration(focusStats.totalFocusSeconds)} sub="total focused" accent="purple"/>
              <MetricCard icon="ti-check"       label="Completion"     value={`${focusStats.completionRate}%`}                  sub="sessions done" accent="green"/>
              <MetricCard icon="ti-clock-hour-3" label="Avg Session"   value={`${focusStats.avgFocusMinutes}m`}                 sub="per session"   accent="orange"/>
            </div>
            <div className="mb-4">
              <ChartCard title="Daily Focus Hours" icon="ti-chart-bar" right={<span className="text-xs text-slate-600 font-medium">{focusStats.totalWorkSessions} sessions</span>}>
                <FocusDailyBars byDay={focusStats.byDay}/>
              </ChartCard>
            </div>
            <div className="mb-4">
              <ChartCard title="When Do You Focus?" icon="ti-sun" badge="by hour">
                <p className="text-[10px] text-slate-500 mb-3 font-semibold uppercase tracking-[0.12em]">Activity by hour of day</p>
                <FocusHourlyHeatmap pattern={focusStats.hourlyPattern}/>
                <div className="flex items-center justify-between mt-3">
                  <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm bg-slate-800"/><span className="text-[9px] text-slate-600 font-medium">Inactive</span></div>
                  <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm bg-purple-500"/><span className="text-[9px] text-slate-600 font-medium">Peak focus</span></div>
                </div>
              </ChartCard>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <ChartCard title="Breaks Taken" icon="ti-coffee">
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-green-500/5 ring-1 ring-green-500/15 rounded-xl">
                    <div className="flex items-center gap-2.5"><span className="text-xl">☕</span><div><p className="text-xs text-slate-300 font-semibold">Short Breaks</p><p className="text-[10px] text-slate-600">5 minutes</p></div></div>
                    <span className="text-xl font-black text-green-400 font-mono">{focusStats.shortBreaks}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-blue-500/5 ring-1 ring-blue-500/15 rounded-xl">
                    <div className="flex items-center gap-2.5"><span className="text-xl">🌙</span><div><p className="text-xs text-slate-300 font-semibold">Long Breaks</p><p className="text-[10px] text-slate-600">15 minutes</p></div></div>
                    <span className="text-xl font-black text-blue-400 font-mono">{focusStats.longBreaks}</span>
                  </div>
                  <div className="flex items-center justify-between pt-1 border-t border-slate-800/60">
                    <span className="text-xs text-slate-500 font-medium">Total break time</span>
                    <span className="text-xs font-black font-mono text-slate-300">{formatHumanDuration(focusStats.totalBreakSeconds)}</span>
                  </div>
                </div>
              </ChartCard>
              <ChartCard title="Session Quality" icon="ti-star">
                <div className="space-y-4">
                  <ProgressBar label="Completed ✅" value={focusStats.completedSessions} max={focusStats.totalWorkSessions} color="#22c55e" sublabel={`${focusStats.completionRate}%`}/>
                  <ProgressBar label="Stopped early ⏹️" value={focusStats.totalWorkSessions-focusStats.completedSessions} max={focusStats.totalWorkSessions} color="#f97316" sublabel={`${100-focusStats.completionRate}%`}/>
                  <div className={`text-xs rounded-xl px-3 py-2.5 font-medium mt-2 ${focusStats.completionRate>=80?'bg-green-500/10 text-green-400 ring-1 ring-green-500/20':focusStats.completionRate>=50?'bg-blue-500/10 text-blue-400 ring-1 ring-blue-500/20':focusStats.totalWorkSessions===0?'bg-slate-800/50 text-slate-500':'bg-orange-500/10 text-orange-400 ring-1 ring-orange-500/20'}`}>
                    {focusStats.completionRate>=80?'🔥 Excellent discipline!':focusStats.completionRate>=50?'💪 Good consistency!':focusStats.totalWorkSessions===0?'🎯 Start your first focus session!':'⚡ Try to finish more sessions!'}
                  </div>
                </div>
              </ChartCard>
            </div>
            <ChartCard title="Focus Session Log" icon="ti-list" right={<span className="text-xs text-slate-600">{focusRecords.filter(r=>r.type==='work').length} sessions</span>}>
              {focusRecords.filter(r=>r.type==='work').length===0 ? (
                <div className="text-center py-10">
                  <div className="w-12 h-12 rounded-2xl bg-slate-800/40 flex items-center justify-center mx-auto mb-3"><i className="ti ti-target text-2xl text-slate-700"/></div>
                  <p className="text-sm text-slate-600 font-medium">No focus sessions this period</p>
                  <p className="text-xs text-slate-700 mt-1">Use Focus Mode on home screen!</p>
                </div>
              ) : (
                <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
                  {focusRecords.filter(r=>r.type==='work').slice(0,25).map((r,i)=>{
                    const mins=Math.round(r.durationSeconds/60);
                    const time=new Date(r.startTime).toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'});
                    return (
                      <div key={i} className="flex items-center justify-between bg-[#0a0f1a] rounded-xl px-3 py-2.5 border border-slate-800/40 hover:border-slate-700/60 transition-colors">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className={`w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 ${r.completed?'bg-green-500/10 ring-1 ring-green-500/20':'bg-orange-500/10 ring-1 ring-orange-500/20'}`}>
                            <i className={`ti ${r.completed?'ti-check':'ti-player-stop'} text-[10px] ${r.completed?'text-green-400':'text-orange-400'}`}/>
                          </div>
                          <div className="min-w-0"><p className="text-xs text-slate-300 font-medium">{r.date}</p><p className="text-[10px] text-slate-600">{time}</p></div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${r.completed?'bg-green-500/10 text-green-400':'bg-orange-500/10 text-orange-400'}`}>{r.completed?'Done':'Partial'}</span>
                          <span className="text-sm font-mono text-purple-400 font-black">{mins}m</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </ChartCard>
          </>
        )}

        {/* ── VOCAB READING TIME STATS ── */}
        {activeSection==='vocab' && (
          <>
            <div className="flex items-center justify-between mb-4">
              <p className="text-[10px] text-slate-600 font-medium">Sirf active reading time count hota hai — 20 sec idle rehne pe timer ruk jaata hai</p>
              <button onClick={() => setRefreshKey(k => k + 1)}
                className="flex items-center gap-1.5 text-[10px] text-slate-500 hover:text-emerald-400 transition-colors px-2 py-1 rounded-lg hover:bg-emerald-500/5">
                <i className="ti ti-refresh text-xs"/> Refresh
              </button>
            </div>

            {vocabLoading && !vocabStats ? (
              <div className="text-center py-16"><p className="text-sm text-slate-600">Loading vocab stats...</p></div>
            ) : (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-3">
                  <MetricCard icon="ti-clock"        label="Today"      value={formatHumanDuration(vocabStats?.todaySeconds || 0)} sub="active reading" accent="green" />
                  <MetricCard icon="ti-calendar"     label="This Week"  value={formatHumanDuration(vocabStats?.weekSeconds || 0)}  sub="last 7 days"    accent="blue" />
                  <MetricCard icon="ti-book-2"       label="All Time"   value={formatHumanDuration(vocabStats?.totalSeconds || 0)} sub="total reading"  accent="purple" />
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
                  <MetricCard icon="ti-flame"        label="Current Streak" value={`${vocabStats?.currentStreak || 0}d`}  sub="days in a row"     accent="orange" />
                  <MetricCard icon="ti-trophy"       label="Longest Streak" value={`${vocabStats?.longestStreak || 0}d`}  sub="personal best"     accent="purple" />
                  <MetricCard icon="ti-star"         label="Best Day"       value={formatHumanDuration(vocabStats?.bestDay?.seconds || 0)} sub={vocabStats?.bestDay?.date || 'no data yet'} accent="green" />
                  <MetricCard icon="ti-chart-line"   label="Daily Average"  value={formatHumanDuration(vocabStats?.avgSecondsPerActiveDay || 0)} sub="on active days"   accent="blue" />
                </div>
                <div className="mb-4">
                  <ChartCard title="Daily Vocab Reading Time" icon="ti-chart-bar" right={<span className="text-xs text-slate-600 font-medium">{vocabStats?.daysActiveThisWeek || 0}/7 days active</span>}>
                    <VocabDailyBars last7Days={vocabStats?.last7Days || []} />
                  </ChartCard>
                </div>
              </>
            )}
          </>
        )}

      </div>
    </div>
  );
}