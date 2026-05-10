// src/pages/Wellbeing.jsx
// FIX 1: Fake hardcoded Mon-Sat chart data hataaya — real 7-day localStorage history use karta hai
// FIX 2: Study time auto-calculate from today's sessions — manual nahi
// FIX 3: Sirf screen time manual input rakha

import { useState, useEffect } from 'react';
import { getSessions } from '@/api/sessions';
import { getTodayString, getDateString, formatHours } from '@/utils/time';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from 'recharts';

const STORAGE_KEY = 'tapasya_wellbeing_history'; // {[YYYY-MM-DD]: {screen: number}}

// Save/load per-day screen time history
function saveScreenTime(dateStr, hours) {
  try {
    const history = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    history[dateStr] = { ...(history[dateStr] || {}), screen: hours };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
  } catch {}
}

function loadHistory() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
  } catch { return {}; }
}

function getLast7Days() {
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push({
      dateStr: getDateString(d),
      label: i === 0 ? 'Today' : d.toLocaleDateString(undefined, { weekday: 'short' }),
    });
  }
  return days;
}

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-slate-800 border border-slate-700 rounded-lg p-3 text-xs shadow-lg">
        <p className="text-slate-300 mb-1 font-medium">{label}</p>
        {payload.map((entry, i) => (
          <p key={i} style={{ color: entry.color }} className="font-medium">
            {entry.name}: {entry.value}h
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export default function Wellbeing() {
  const [screenTimeToday, setScreenTimeToday] = useState('');
  const [studyTimeToday, setStudyTimeToday]   = useState(0); // auto from sessions
  const [chartData, setChartData]             = useState([]);
  const [manualInput, setManualInput]         = useState('');
  const [saved, setSaved]                     = useState(false);
  const [loading, setLoading]                 = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    const today   = getTodayString();
    const history = loadHistory();

    // Restore today's screen time if saved earlier
    if (history[today]?.screen !== undefined) {
      setScreenTimeToday(String(history[today].screen));
      setManualInput(String(history[today].screen));
    }

    // FIX: Study time auto-fetch from today's real sessions
    try {
      const todaySessions = await getSessions(today, today);
      const totalSec = todaySessions.reduce((sum, s) => sum + (s.duration || 0), 0);
      setStudyTimeToday(parseFloat((totalSec / 3600).toFixed(1)));

      // Save study time into history too
      history[today] = { ...(history[today] || {}), study: parseFloat((totalSec / 3600).toFixed(1)) };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
    } catch (err) {
      console.error('Wellbeing session fetch error:', err);
    }

    // Build 7-day chart from history (real data only)
    const days = getLast7Days();
    const chart = days.map(({ dateStr, label }) => ({
      day: label,
      screen: history[dateStr]?.screen ?? 0,
      study:  history[dateStr]?.study  ?? 0,
    }));
    setChartData(chart);
    setLoading(false);
  }

  function handleSaveScreen() {
    const val = parseFloat(manualInput);
    if (isNaN(val) || val < 0) return;
    const today = getTodayString();
    saveScreenTime(today, val);
    setScreenTimeToday(String(val));

    // Update chart's Today bar
    setChartData((prev) =>
      prev.map((d) => d.day === 'Today' ? { ...d, screen: val } : d)
    );
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  const ratio = studyTimeToday && parseFloat(screenTimeToday)
    ? ((studyTimeToday / parseFloat(screenTimeToday)) * 100).toFixed(0)
    : null;

  return (
    <div className="min-h-screen bg-[#0f172a] text-white p-4 md:p-6 pb-24 md:pb-6">

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-white mb-1">Wellbeing</h1>
        <p className="text-sm text-slate-400">Screen time vs study time balance</p>
      </div>

      {/* Today cards */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        {/* Screen time — manual */}
        <div className="bg-[#1e293b] rounded-xl p-4 border border-slate-700/50">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-7 h-7 rounded-lg bg-red-500/20 flex items-center justify-center">
              <i className="ti ti-device-mobile text-red-400 text-sm" />
            </div>
            <span className="text-xs text-slate-400">Screen Time</span>
          </div>
          <p className="text-2xl font-bold text-red-400">
            {screenTimeToday || '—'}
            <span className="text-sm font-normal text-slate-500 ml-1">h</span>
          </p>
          <p className="text-xs text-slate-500 mt-1">Manual (neeche daalo)</p>
        </div>

        {/* Study time — auto from sessions */}
        <div className="bg-[#1e293b] rounded-xl p-4 border border-slate-700/50">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-7 h-7 rounded-lg bg-orange-500/20 flex items-center justify-center">
              <i className="ti ti-book text-orange-400 text-sm" />
            </div>
            <span className="text-xs text-slate-400">Study Time</span>
          </div>
          <p className="text-2xl font-bold text-orange-400">
            {loading ? '...' : studyTimeToday || '0'}
            <span className="text-sm font-normal text-slate-500 ml-1">h</span>
          </p>
          <p className="text-xs text-slate-500 mt-1">Auto (sessions se)</p>
        </div>
      </div>

      {/* Ratio insight */}
      {ratio && (
        <div className={`rounded-xl p-4 mb-6 border ${
          parseInt(ratio) >= 80
            ? 'bg-green-500/10 border-green-500/30'
            : parseInt(ratio) >= 50
            ? 'bg-orange-500/10 border-orange-500/30'
            : 'bg-red-500/10 border-red-500/30'
        }`}>
          <div className="flex items-center gap-3">
            <i className={`ti text-xl ${
              parseInt(ratio) >= 80
                ? 'ti-mood-happy text-green-400'
                : parseInt(ratio) >= 50
                ? 'ti-mood-neutral text-orange-400'
                : 'ti-mood-sad text-red-400'
            }`} />
            <div>
              <p className="text-sm font-medium text-white">
                {parseInt(ratio) >= 80
                  ? 'Excellent balance!'
                  : parseInt(ratio) >= 50
                  ? 'Theek hai, improve karo'
                  : 'Screen time zyada hai'}
              </p>
              <p className="text-xs text-slate-400 mt-0.5">
                Study: <span className="text-orange-400 font-medium">{ratio}%</span> of screen time
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Real 7-day chart */}
      <div className="bg-[#1e293b] rounded-xl p-4 mb-6 border border-slate-700/50">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-medium text-white">Last 7 Days</h2>
          <span className="text-xs text-slate-500">Real data</span>
        </div>
        {loading ? (
          <div className="h-[200px] flex items-center justify-center">
            <div className="w-5 h-5 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }} barCategoryGap="30%" barGap={2}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
              <XAxis dataKey="day" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} unit="h" />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: '#0f172a40' }} />
              <Legend iconType="circle" iconSize={6} wrapperStyle={{ fontSize: '11px', color: '#94a3b8', paddingTop: '8px' }} />
              <Bar dataKey="screen" name="Screen Time" fill="#ef4444" radius={[3, 3, 0, 0]} fillOpacity={0.8} />
              <Bar dataKey="study"  name="Study Time"  fill="#f97316" radius={[3, 3, 0, 0]} fillOpacity={0.9} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Screen time manual input */}
      <div className="bg-[#1e293b] rounded-xl p-4 border border-slate-700/50 mb-6">
        <h2 className="text-sm font-medium text-white mb-1">Aaj ka screen time daalo</h2>
        <p className="text-xs text-slate-500 mb-4">
          Phone Settings → Digital Wellbeing se dekh ke daalo (hours mein)
        </p>
        <div className="flex gap-3">
          <input
            type="number"
            min="0"
            max="24"
            step="0.5"
            value={manualInput}
            onChange={(e) => setManualInput(e.target.value)}
            placeholder="e.g. 4.5"
            className="flex-1 bg-[#0f172a] border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-orange-500 transition-colors"
          />
          <button
            onClick={handleSaveScreen}
            className={`px-5 py-2.5 rounded-lg text-sm font-medium transition-all ${
              saved ? 'bg-green-500 text-white' : 'bg-orange-500 hover:bg-orange-400 text-white'
            }`}
          >
            {saved ? <span className="flex items-center gap-1"><i className="ti ti-check" />Saved</span> : 'Save'}
          </button>
        </div>
        <p className="text-xs text-slate-600 mt-2">Study time apne aap sessions se calculate hota hai</p>
      </div>

      {/* Tips */}
      <div className="bg-[#1e293b] rounded-xl p-4 border border-slate-700/50">
        <h3 className="text-sm font-medium text-white mb-3 flex items-center gap-2">
          <i className="ti ti-bulb text-orange-400" />
          Wellbeing Tips
        </h3>
        <div className="space-y-3">
          {[
            { icon: 'ti-clock',   tip: 'Pomodoro technique use karo — 25 min study, 5 min break' },
            { icon: 'ti-sun',     tip: 'Natural light mein padhna eye strain kam karta hai' },
            { icon: 'ti-moon',    tip: 'Raat 10 baje ke baad screen time avoid karo' },
          ].map((t, i) => (
            <div key={i} className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-lg bg-orange-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <i className={`ti ${t.icon} text-orange-400 text-xs`} />
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">{t.tip}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
