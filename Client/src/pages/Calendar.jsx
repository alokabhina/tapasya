// src/pages/Calendar.jsx
// FIX 1: useStats() — object → positional args
// FIX 2: quarter 1-indexed → 0-indexed (HeatmapGrid uses 0-indexed)
// FIX 3: heatmapData mein hours the, ab seconds hain (cellColor seconds expect karta hai)
// FIX 4: DayDetail ko sessions pass karo with proper fetch

import { useState, useEffect } from 'react';
import QuarterSelector from '@/components/calendar/QuarterSelector';
import HeatmapGrid from '@/components/calendar/HeatmapGrid';
import DayDetail from '@/components/calendar/DayDetail';
import { getSessions } from '@/api/sessions';
import { formatHours, getDateString } from '@/utils/time';

export default function Calendar() {
  const today = new Date();
  const currentQ0 = Math.floor(today.getMonth() / 3); // 0-indexed

  const [quarter, setQuarter] = useState({
    year: today.getFullYear(),
    quarter: currentQ0, // 0-indexed — HeatmapGrid expects this
  });

  const [sessions, setSessions] = useState([]);
  const [loading, setLoading]   = useState(true);

  const [selectedDate, setSelectedDate]       = useState(null);
  const [selectedSessions, setSelectedSessions] = useState([]);

  // Compute date range from 0-indexed quarter
  const qStart = new Date(quarter.year, quarter.quarter * 3, 1);
  const qEnd   = new Date(quarter.year, quarter.quarter * 3 + 3, 0);

  useEffect(() => {
    fetchSessions();
  }, [quarter]);

  async function fetchSessions() {
    setLoading(true);
    try {
      // FIX: direct getSessions call with positional args — no useStats needed here
      const data = await getSessions(getDateString(qStart), getDateString(qEnd));
      setSessions(data);
    } catch (err) {
      console.error('Calendar fetch error:', err);
    } finally {
      setLoading(false);
    }
  }

  // FIX: heatmapData mein SECONDS store karo (hours nahi) — cellColor() seconds expect karta hai
  const heatmapData = {};
  sessions.forEach((s) => {
    if (s.date) {
      heatmapData[s.date] = (heatmapData[s.date] || 0) + (s.duration || 0);
    }
  });

  // Summary stats (seconds se calculate karo)
  const totalSeconds  = Object.values(heatmapData).reduce((a, b) => a + b, 0);
  const activeDays    = Object.values(heatmapData).filter((s) => s > 0).length;
  const avgSeconds    = activeDays > 0 ? totalSeconds / activeDays : 0;
  const maxSeconds    = Object.values(heatmapData).reduce((best, s) => (s > best ? s : best), 0);

  function handleDayClick(dateStr) {
    setSelectedDate(dateStr);
    // Filter sessions for clicked day
    const daySessions = sessions.filter((s) => s.date === dateStr);
    setSelectedSessions(daySessions);
  }

  // QuarterSelector display ke liye 1-indexed label chahiye
  const quarterForSelector = {
    year: quarter.year,
    quarter: quarter.quarter, // QuarterSelector bhi 0-indexed use karta hai
  };

  return (
    <div className="min-h-screen bg-[#0f172a] text-white">

      {/* Header */}
      <div className="px-4 pt-6 pb-4">
        <h1 className="text-xl font-semibold text-white tracking-tight">Study Calendar</h1>
        <p className="text-sm text-slate-400 mt-0.5">Your consistency at a glance</p>
      </div>

      {/* Summary stats */}
      <div className="px-4 mb-5">
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-[#1e293b] rounded-xl p-3 text-center">
            <div className="text-lg font-semibold text-orange-400">
              {loading ? '—' : formatHours(totalSeconds)}
            </div>
            <div className="text-xs text-slate-500 mt-0.5">Quarter total</div>
          </div>
          <div className="bg-[#1e293b] rounded-xl p-3 text-center">
            <div className="text-lg font-semibold text-orange-400">
              {loading ? '—' : activeDays}
            </div>
            <div className="text-xs text-slate-500 mt-0.5">Active days</div>
          </div>
          <div className="bg-[#1e293b] rounded-xl p-3 text-center">
            <div className="text-lg font-semibold text-orange-400">
              {loading ? '—' : formatHours(avgSeconds)}
            </div>
            <div className="text-xs text-slate-500 mt-0.5">Daily avg</div>
          </div>
        </div>
      </div>

      {/* Quarter selector */}
      <div className="px-4 mb-4">
        <QuarterSelector
          quarter={quarterForSelector.quarter}
          year={quarterForSelector.year}
          onChange={(q) => setQuarter(q)}
        />
      </div>

      {/* Heatmap legend */}
      <div className="px-4 mb-3 flex items-center justify-between">
        <span className="text-xs text-slate-500">Less</span>
        <div className="flex items-center gap-1.5">
          {['#1e293b', '#431407', '#7c2d12', '#c2410c', '#f97316'].map((c) => (
            <div key={c} className="w-4 h-4 rounded-sm" style={{ backgroundColor: c }} />
          ))}
        </div>
        <span className="text-xs text-slate-500">More</span>
      </div>

      {/* Heatmap */}
      <div className="px-4">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-6 h-6 rounded-full border-2 border-orange-500 border-t-transparent animate-spin" />
          </div>
        ) : (
          // FIX: quarter already 0-indexed — no need to subtract 1
          <HeatmapGrid
            data={heatmapData}
            quarter={quarter.quarter}
            year={quarter.year}
            onDayClick={handleDayClick}
          />
        )}
      </div>

      {/* Best day */}
      {maxSeconds > 0 && !loading && (
        <div className="mx-4 mt-4 bg-[#431407]/40 border border-orange-900/40 rounded-xl px-4 py-3 flex items-center gap-3">
          <div className="text-xl">🔥</div>
          <div>
            <div className="text-sm font-medium text-orange-300">Best day this quarter</div>
            <div className="text-xs text-slate-400">{formatHours(maxSeconds)} in a single day</div>
          </div>
        </div>
      )}

      <div className="h-24" />

      {/* Day detail bottom sheet */}
      {selectedDate && (
        <DayDetail
          date={selectedDate}
          sessions={selectedSessions}
          onClose={() => { setSelectedDate(null); setSelectedSessions([]); }}
        />
      )}
    </div>
  );
}
