// src/pages/Stats.jsx — Redesigned with fixed Invalid Date + premium UI
import { useState, useMemo, useEffect, useCallback } from 'react';
import {
  AreaChart, Area, BarChart as ReBarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import useStats from '@/hooks/useStats';
import { formatDuration, formatHumanDuration } from '@/utils/time';
import { getFocusHistory, getFocusStats } from '@/utils/focusHistory';
import { exportStatsPDF, exportStatsCSV } from '@/utils/export';

function getDateRange(period, customStart, customEnd) {
  const today = new Date().toISOString().split('T')[0];
  if (period === 'day')   return { startDate: today, endDate: today };
  if (period === 'week')  { const d=new Date(); d.setDate(d.getDate()-6); return { startDate: d.toISOString().split('T')[0], endDate: today }; }
  if (period === 'month') { const d=new Date(); d.setDate(d.getDate()-29); return { startDate: d.toISOString().split('T')[0], endDate: today }; }
  if (period === 'custom' && customStart && customEnd) return { startDate: customStart, endDate: customEnd };
  const d=new Date(); d.setDate(d.getDate()-6); return { startDate: d.toISOString().split('T')[0], endDate: today };
}

function MetricCard({ icon, label, value, sub, accent }) {
  const map = {
    orange: { ring:'ring-orange-500/20', iconBg:'bg-orange-500/10', tc:'text-orange-400', glow:'shadow-orange-500/10' },
    purple: { ring:'ring-purple-500/20', iconBg:'bg-purple-500/10', tc:'text-purple-400', glow:'shadow-purple-500/10' },
    blue:   { ring:'ring-blue-500/20',   iconBg:'bg-blue-500/10',   tc:'text-blue-400',   glow:'shadow-blue-500/10' },
    green:  { ring:'ring-green-500/20',  iconBg:'bg-green-500/10',  tc:'text-green-400',  glow:'shadow-green-500/10' },
  };
  const s = map[accent] || map.orange;
  return (
    <div className={`relative bg-gradient-to-br from-[#111827] to-[#0d1420] ring-1 ${s.ring} rounded-2xl p-4 shadow-lg overflow-hidden group hover:scale-[1.02] transition-all duration-200`}>
      <div className={`absolute -top-4 -right-4 w-16 h-16 rounded-full ${s.iconBg} blur-2xl opacity-40 group-hover:opacity-70 transition-opacity`} />
      <div className="relative">
        <div className={`inline-flex items-center justify-center w-9 h-9 rounded-xl ${s.iconBg} mb-3 ring-1 ${s.ring}`}>
          <i className={`ti ${icon} text-base ${s.tc}`} />
        </div>
        <p className="text-[9px] text-slate-500 mb-1 font-semibold tracking-[0.15em] uppercase">{label}</p>
        <p className={`text-2xl font-black font-mono tracking-tight ${s.tc} leading-none`}>{value}</p>
        {sub && <p className="text-[10px] text-slate-600 mt-1.5">{sub}</p>}
      </div>
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

function DonutChart({ data, total }) {
  const [hovered, setHovered] = useState(null);
  return (
    <div className="flex items-center gap-6">
      <div className="relative flex-shrink-0" style={{ width: 156, height: 156 }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} cx="50%" cy="50%" innerRadius={46} outerRadius={72} paddingAngle={3} dataKey="value" startAngle={90} endAngle={-270}
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

function DailyBarChart({ data }) {
  if (!data.length) return (
    <div className="flex flex-col items-center justify-center h-44 gap-2">
      <div className="w-12 h-12 rounded-2xl bg-slate-800/50 flex items-center justify-center"><i className="ti ti-chart-bar text-xl text-slate-600" /></div>
      <p className="text-slate-600 text-sm">No data this period</p>
    </div>
  );
  const subjects = [...new Set(data.flatMap(d => Object.keys(d).filter(k => k!=='date'&&k!=='label')))];
  const COLORS = ['#f97316','#a855f7','#3b82f6','#22c55e','#f59e0b','#ec4899','#06b6d4'];
  return (
    <ResponsiveContainer width="100%" height={200}>
      <ReBarChart data={data} barSize={18} barCategoryGap="30%">
        <defs>{COLORS.map((c,i)=><linearGradient key={i} id={`bg${i}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={c} stopOpacity={0.9}/><stop offset="100%" stopColor={c} stopOpacity={0.5}/></linearGradient>)}</defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
        <XAxis dataKey="label" tick={{fill:'#64748b',fontSize:10,fontWeight:600}} axisLine={false} tickLine={false} />
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

function CumulativeChart({ data }) {
  if (!data.length) return <div className="flex items-center justify-center h-36 text-slate-600 text-sm">No data</div>;
  return (
    <ResponsiveContainer width="100%" height={170}>
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

function HourlyHeatmap({ pattern }) {
  const max = Math.max(...pattern, 0.01);
  const LABELS = ['12a','1','2','3','4','5','6','7','8','9','10','11','12p','1','2','3','4','5','6','7','8','9','10','11'];
  return (
    <div>
      <div className="flex gap-0.5 mb-1">
        {pattern.map((v,i)=>{
          const pct=v/max;
          return <div key={i} className="flex-1 rounded-sm cursor-help transition-all duration-200 hover:scale-y-125"
            style={{height:24,backgroundColor:pct<0.01?'#1e293b':`rgba(168,85,247,${0.1+pct*0.85})`,boxShadow:pct>0.5?`0 0 8px rgba(168,85,247,${pct*0.5})`:'none'}}
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
        <div className="h-full rounded-full transition-all duration-700" style={{width:`${pct}%`,backgroundColor:color,boxShadow:`0 0 8px ${color}50`}} />
      </div>
    </div>
  );
}

const PERIODS = ['Day', 'Week', 'Month', 'Custom'];

export default function Stats() {
  const [activeTab,     setActiveTab]     = useState('Week');
  const [customStart,   setCustomStart]   = useState('');
  const [customEnd,     setCustomEnd]     = useState('');
  const [activeSection, setActiveSection] = useState('study');
  const [exporting,     setExporting]     = useState('');
  // ✅ FIX: refreshKey forces re-read of localStorage when page becomes visible
  const [refreshKey,    setRefreshKey]    = useState(0);

  // Re-read focus data whenever user switches back to this tab/window
  useEffect(() => {
    const refresh = () => setRefreshKey(k => k + 1);
    // Page visibility change (switching browser tabs)
    document.addEventListener('visibilitychange', refresh);
    // Window focus (switching apps/windows)
    window.addEventListener('focus', refresh);
    return () => {
      document.removeEventListener('visibilitychange', refresh);
      window.removeEventListener('focus', refresh);
    };
  }, []);

  const period = useMemo(() => ({
    period: activeTab.toLowerCase(),
    startDate: activeTab==='Custom' ? customStart : null,
    endDate:   activeTab==='Custom' ? customEnd   : null,
  }), [activeTab, customStart, customEnd]);

  const { donutData, barData, stepData, loading, totalSeconds, sessions } = useStats(period);

  // ✅ FIX: barData.date is "MM-DD" from aggregateByDay — prepend current year for valid Date parsing
  const processedBarData = useMemo(() => {
    if (!barData) return [];
    const yr = new Date().getFullYear();
    return barData.map(d => ({
      ...d,
      label: d.date
        ? (() => { const fd = new Date(`${yr}-${d.date}T00:00`); return isNaN(fd.getTime()) ? d.date : fd.toLocaleDateString('en-IN', { weekday: 'short' }); })()
        : d.label || d.date,
    }));
  }, [barData]);

  const processedStepData = useMemo(() => {
    if (!stepData) return [];
    return stepData.map(d => ({
      ...d,
      hours: parseFloat((d.hours||0).toFixed(2)),
      label: d.date ? new Date(d.date+'T00:00').toLocaleDateString('en-IN',{month:'short',day:'numeric'}) : d.date,
    }));
  }, [stepData]);

  const { startDate, endDate } = getDateRange(activeTab.toLowerCase(), customStart, customEnd);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const focusRecords = useMemo(() => getFocusHistory(startDate, endDate), [startDate, endDate, refreshKey]);
  const focusStats   = useMemo(() => getFocusStats(focusRecords), [focusRecords]);
  const daysInPeriod = activeTab==='Day'?1:activeTab==='Week'?7:30;
  const dailyAvg = ((totalSeconds||0)/daysInPeriod/3600).toFixed(1);

  async function handleExportPDF() {
    setExporting('pdf');
    try { await exportStatsPDF({sessions:sessions||[],focusRecords,period:activeTab,totalSeconds:totalSeconds||0,donutData:donutData||[],barData:processedBarData}); } finally { setExporting(''); }
  }
  function handleExportCSV() {
    setExporting('csv');
    try { exportStatsCSV({sessions:sessions||[],focusRecords,donutData:donutData||[],barData:processedBarData}); } finally { setExporting(''); }
  }

  return (
    <div className="min-h-screen bg-[#080d16] pb-24 lg:pb-8">
      <div className="max-w-3xl mx-auto px-4 pt-6">

        {/* Header */}
        <div className="flex flex-col gap-4 mb-6">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <div className="w-1 h-6 bg-orange-500 rounded-full" />
                <h1 className="text-xl font-black text-slate-100 tracking-tight">Statistics</h1>
              </div>
              <p className="text-slate-500 text-xs pl-3">Track your learning journey and progress</p>
            </div>
            <div className="flex items-center gap-1.5">
              <button onClick={handleExportCSV} disabled={!!exporting||loading}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#111827] ring-1 ring-slate-700/50 text-slate-400 hover:text-green-400 hover:ring-green-500/40 text-xs font-semibold transition-all disabled:opacity-40 hover:bg-green-500/5">
                <i className={`ti ${exporting==='csv'?'ti-loader-2 animate-spin':'ti-table-export'} text-sm`}/> Excel
              </button>
              <button onClick={handleExportPDF} disabled={!!exporting||loading}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#111827] ring-1 ring-slate-700/50 text-slate-400 hover:text-red-400 hover:ring-red-500/40 text-xs font-semibold transition-all disabled:opacity-40 hover:bg-red-500/5">
                <i className={`ti ${exporting==='pdf'?'ti-loader-2 animate-spin':'ti-file-type-pdf'} text-sm`}/> PDF
              </button>
            </div>
          </div>

          <div className="flex gap-1 p-1 bg-[#0d1117] rounded-xl w-fit ring-1 ring-slate-800/50">
            {PERIODS.map(t => (
              <button key={t} onClick={()=>setActiveTab(t)}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 ${activeTab===t?'bg-orange-500 text-white shadow-lg shadow-orange-500/30':'text-slate-500 hover:text-slate-300 hover:bg-slate-800/50'}`}>
                {t}
              </button>
            ))}
          </div>

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
        <div className="flex gap-1 p-1 bg-[#0d1117] rounded-xl w-fit ring-1 ring-slate-800/50 mb-6">
          <button onClick={()=>setActiveSection('study')}
            className={`px-5 py-2 rounded-lg text-xs font-bold transition-all duration-200 flex items-center gap-1.5 ${activeSection==='study'?'bg-orange-500 text-white shadow-lg shadow-orange-500/30':'text-slate-500 hover:text-slate-300 hover:bg-slate-800/50'}`}>
            <i className="ti ti-book-2 text-sm"/> Study Stats
          </button>
          <button onClick={()=>setActiveSection('focus')}
            className={`px-5 py-2 rounded-lg text-xs font-bold transition-all duration-200 flex items-center gap-1.5 ${activeSection==='focus'?'bg-purple-600 text-white shadow-lg shadow-purple-600/30':'text-slate-500 hover:text-slate-300 hover:bg-slate-800/50'}`}>
            <i className="ti ti-target text-sm"/> Focus Mode
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
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
                  <MetricCard icon="ti-clock"        label="Total Time"   value={formatDuration(totalSeconds||0)} accent="orange" />
                  <MetricCard icon="ti-trending-up"  label="Daily Avg"    value={`${dailyAvg}h`}  sub="per day"   accent="blue" />
                  <MetricCard icon="ti-books"         label="Subjects"     value={donutData?.length||0} sub="studied" accent="green" />
                  <MetricCard icon="ti-player-play"   label="Sessions"     value={sessions?.length||0} sub="completed" accent="purple" />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
                  <ChartCard title="Subject Split" icon="ti-chart-donut-3" badge={`${donutData?.length||0} subjects`}>
                    {donutData?.length>0
                      ? <DonutChart data={donutData} total={totalSeconds||0}/>
                      : <div className="flex flex-col items-center justify-center h-36 gap-2"><div className="w-10 h-10 rounded-xl bg-slate-800/50 flex items-center justify-center"><i className="ti ti-books text-lg text-slate-600"/></div><p className="text-slate-600 text-sm">No sessions this period</p></div>}
                  </ChartCard>
                  <ChartCard title="Daily Hours" icon="ti-chart-bar">
                    <DailyBarChart data={processedBarData}/>
                  </ChartCard>
                </div>

                {processedStepData.length>0 && (
                  <div className="mb-4">
                    <ChartCard title="Cumulative Progress" icon="ti-trending-up" badge="growth curve">
                      <CumulativeChart data={processedStepData}/>
                    </ChartCard>
                  </div>
                )}

                <ChartCard title="Study Breakdown" icon="ti-layout-grid">
                  <div className="grid grid-cols-3 gap-3 mb-5">
                    {[
                      {icon:'ti-clock',val:formatHumanDuration(totalSeconds||0),label:'Total Time',color:'text-orange-400',bg:'bg-orange-500/10',ring:'ring-orange-500/20'},
                      {icon:'ti-trending-up',val:`${dailyAvg}h`,label:'Avg/Day',color:'text-blue-400',bg:'bg-blue-500/10',ring:'ring-blue-500/20'},
                      {icon:'ti-player-play',val:sessions?.length||0,label:'Sessions',color:'text-purple-400',bg:'bg-purple-500/10',ring:'ring-purple-500/20'},
                    ].map((s,i)=>(
                      <div key={i} className={`${s.bg} ring-1 ${s.ring} rounded-xl p-3 text-center`}>
                        <i className={`ti ${s.icon} text-base ${s.color} block mb-1.5`}/>
                        <p className={`text-base font-black font-mono ${s.color}`}>{s.val}</p>
                        <p className="text-[10px] text-slate-500 mt-0.5 font-medium">{s.label}</p>
                      </div>
                    ))}
                  </div>
                  {sessions?.length>0 && (
                    <>
                      <p className="text-[10px] text-slate-500 mb-2.5 font-bold uppercase tracking-[0.12em]">Recent Sessions</p>
                      <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
                        {sessions.slice(0,12).map((s,i)=>(
                          <div key={i} className="flex items-center justify-between bg-[#0a0f1a] rounded-xl px-3 py-2.5 border border-slate-800/40 hover:border-slate-700/60 transition-colors group">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{backgroundColor:s.subjectColor||'#f97316'}}/>
                              <span className="text-xs text-slate-300 truncate font-medium group-hover:text-slate-100 transition-colors">{s.subjectName||'Unknown'}</span>
                            </div>
                            <div className="flex items-center gap-3 flex-shrink-0">
                              <span className="text-[10px] text-slate-600">{s.date}</span>
                              <span className="text-xs font-mono text-orange-400 font-bold">{formatHumanDuration(s.duration)}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </ChartCard>

                {!donutData?.length&&!loading&&(
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
            {/* Refresh button */}
            <div className="flex items-center justify-between mb-4">
              <p className="text-[10px] text-slate-600 font-medium">Data from localStorage · updates on tab switch</p>
              <button onClick={() => setRefreshKey(k => k + 1)}
                className="flex items-center gap-1.5 text-[10px] text-slate-500 hover:text-purple-400 transition-colors px-2 py-1 rounded-lg hover:bg-purple-500/5">
                <i className="ti ti-refresh text-xs"/> Refresh
              </button>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
              <MetricCard icon="ti-target"        label="Focus Sessions" value={focusStats.totalWorkSessions}                     sub="work sessions"  accent="purple"/>
              <MetricCard icon="ti-clock"          label="Focus Time"     value={formatHumanDuration(focusStats.totalFocusSeconds)} sub="total focused"  accent="purple"/>
              <MetricCard icon="ti-check"          label="Completion"     value={`${focusStats.completionRate}%`}                  sub="sessions done"  accent="green"/>
              <MetricCard icon="ti-clock-hour-3"   label="Avg Session"    value={`${focusStats.avgFocusMinutes}m`}                 sub="per session"    accent="orange"/>
            </div>

            <div className="mb-4">
              <ChartCard title="Daily Focus Hours" icon="ti-chart-bar" right={<span className="text-xs text-slate-600 font-medium">{focusStats.totalWorkSessions} sessions</span>}>
                <FocusDailyBars byDay={focusStats.byDay}/>
              </ChartCard>
            </div>

            <div className="mb-4">
              <ChartCard title="When Do You Focus?" icon="ti-sun" badge="by hour">
                <p className="text-[10px] text-slate-500 mb-3 font-semibold uppercase tracking-[0.12em]">Activity by hour of day</p>
                <HourlyHeatmap pattern={focusStats.hourlyPattern}/>
                <div className="flex items-center justify-between mt-3">
                  <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm bg-slate-800"/><span className="text-[9px] text-slate-600 font-medium">Inactive</span></div>
                  <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm bg-purple-500" style={{boxShadow:'0 0 6px rgba(168,85,247,0.5)'}}/><span className="text-[9px] text-slate-600 font-medium">Peak focus</span></div>
                </div>
              </ChartCard>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
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
                  <div className={`text-xs rounded-xl px-3 py-2.5 font-medium mt-2 ${
                    focusStats.completionRate>=80?'bg-green-500/10 text-green-400 ring-1 ring-green-500/20':
                    focusStats.completionRate>=50?'bg-blue-500/10 text-blue-400 ring-1 ring-blue-500/20':
                    focusStats.totalWorkSessions===0?'bg-slate-800/50 text-slate-500':
                    'bg-orange-500/10 text-orange-400 ring-1 ring-orange-500/20'}`}>
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

      </div>
    </div>
  );
}