// src/pages/Calendar.jsx
import { useState, useEffect } from 'react';
import MonthGrid from '@/components/calendar/MonthGrid';
import DayDetail from '@/components/calendar/DayDetail';
import { getSessions } from '@/api/sessions';
import { formatHours, getDateString } from '@/utils/time';

const QUARTER_LABELS = ['Jan – Mar', 'Apr – Jun', 'Jul – Sep', 'Oct – Dec'];
const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

function pad(n) { return String(n).padStart(2, '0'); }
function dateKey(d) { return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; }

export default function Calendar() {
  const today = new Date();
  const currentQ0 = Math.floor(today.getMonth() / 3);

  const [quarter, setQuarter] = useState({
    year: today.getFullYear(),
    quarter: currentQ0,
  });

  const [monthOffset, setMonthOffset] = useState(
    Math.min(today.getMonth() - currentQ0 * 3, 2)
  );

  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedSessions, setSelectedSessions] = useState([]);

  const qStart = new Date(quarter.year, quarter.quarter * 3, 1);
  const qEnd = new Date(quarter.year, quarter.quarter * 3 + 3, 0);

  const activeMonth = quarter.quarter * 3 + monthOffset;
  const activeYear = quarter.year;

  useEffect(() => {
    fetchSessions();
  }, [quarter]);

  async function fetchSessions() {
    setLoading(true);
    try {
      const data = await getSessions(getDateString(qStart), getDateString(qEnd));
      setSessions(data);
    } catch (err) {
      console.error('Calendar fetch error:', err);
    } finally {
      setLoading(false);
    }
  }

  // heatmapData & sessionsByDate (unchanged)
  const heatmapData = {};
  sessions.forEach((s) => {
    if (s.date) {
      heatmapData[s.date] = (heatmapData[s.date] || 0) + (s.duration || 0);
    }
  });

  const sessionsByDate = {};
  sessions.forEach((s) => {
    if (!s.date) return;
    if (!sessionsByDate[s.date]) sessionsByDate[s.date] = [];
    sessionsByDate[s.date].push(s);
  });

  // Summary stats
  const totalSeconds = Object.values(heatmapData).reduce((a, b) => a + b, 0);
  const activeDays = Object.values(heatmapData).filter((s) => s > 0).length;
  const avgSeconds = activeDays > 0 ? totalSeconds / activeDays : 0;

  let bestDate = null;
  let bestSec = 0;
  Object.entries(heatmapData).forEach(([d, s]) => {
    if (s > bestSec) { bestSec = s; bestDate = d; }
  });

  const streak = (() => {
    let count = 0;
    const d = new Date(today);
    while (true) {
      if (heatmapData[dateKey(d)]) count++;
      else break;
      d.setDate(d.getDate() - 1);
    }
    return count;
  })();

  function handleDayClick(dateStr) {
    setSelectedDate(dateStr);
    setSelectedSessions(sessions.filter((s) => s.date === dateStr));
  }

  function prevQuarter() {
    if (quarter.quarter === 0) {
      setQuarter({ quarter: 3, year: quarter.year - 1 });
    } else {
      setQuarter({ quarter: quarter.quarter - 1, year: quarter.year });
    }
    setMonthOffset(0);
  }

  function nextQuarter() {
    const nowY = new Date().getFullYear();
    const nowQ = Math.floor(new Date().getMonth() / 3);
    if (quarter.year === nowY && quarter.quarter >= nowQ) return;

    if (quarter.quarter === 3) {
      setQuarter({ quarter: 0, year: quarter.year + 1 });
    } else {
      setQuarter({ quarter: quarter.quarter + 1, year: quarter.year });
    }
    setMonthOffset(0);
  }

  const atLatest = quarter.year === new Date().getFullYear() &&
                   quarter.quarter >= Math.floor(new Date().getMonth() / 3);

  const monthTabs = [0, 1, 2].map((i) => quarter.quarter * 3 + i);

  return (
    <div className="min-h-screen bg-[#0a0f1c] text-white pb-20">
      {/* Header */}
      <div className="px-5 pt-8 pb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tighter">Study Calendar</h1>
            <p className="text-slate-400 mt-1 text-sm">Your consistency, visualized.</p>
          </div>
          <div className="flex items-center gap-3">
            {/* Jump to Today */}
            <button
              onClick={() => {
                const nowQ = Math.floor(new Date().getMonth() / 3);
                setQuarter({ year: new Date().getFullYear(), quarter: nowQ });
                setMonthOffset(Math.min(new Date().getMonth() - nowQ * 3, 2));
                setSelectedDate(new Date().toISOString().split('T')[0]);
                setSelectedSessions(sessions.filter(s => s.date === new Date().toISOString().split('T')[0]));
              }}
              title="Jump to Today"
              className="w-10 h-10 rounded-2xl bg-white/5 hover:bg-purple-500/20 hover:border-purple-500/30 transition-all flex items-center justify-center border border-white/10"
            >
              <i className="ti ti-calendar text-xl text-slate-300" />
            </button>
            {/* Summary stats toggle */}
            <button
              onClick={() => document.getElementById('calendar-stats')?.scrollIntoView({ behavior: 'smooth' })}
              title="View Stats"
              className="w-10 h-10 rounded-2xl bg-white/5 hover:bg-white/10 transition-all flex items-center justify-center border border-white/10"
            >
              <i className="ti ti-chart-bar text-xl text-slate-300" />
            </button>
          </div>
        </div>
      </div>

      {/* Quarter Navigation */}
      <div className="px-5 mb-6">
        <div className="flex items-center justify-between bg-[#111827] rounded-3xl p-1.5 border border-white/5">
          <button
            onClick={prevQuarter}
            className="w-11 h-11 rounded-2xl hover:bg-white/5 transition-all flex items-center justify-center"
          >
            <i className="ti ti-chevron-left text-xl" />
          </button>

          <div className="text-center">
            <p className="font-semibold text-lg tracking-tight">
              {QUARTER_LABELS[quarter.quarter]}
            </p>
            <p className="text-xs text-slate-500">{quarter.year}</p>
          </div>

          <button
            onClick={nextQuarter}
            disabled={atLatest}
            className="w-11 h-11 rounded-2xl hover:bg-white/5 transition-all flex items-center justify-center disabled:opacity-40"
          >
            <i className="ti ti-chevron-right text-xl" />
          </button>
        </div>

        {/* Month Tabs */}
        <div className="flex gap-2 mt-4">
          {monthTabs.map((m, i) => (
            <button
              key={m}
              onClick={() => setMonthOffset(i)}
              className={`flex-1 py-3 rounded-2xl text-sm font-medium transition-all duration-200 ${
                monthOffset === i
                  ? 'bg-violet-600 text-white shadow-lg shadow-violet-500/30'
                  : 'bg-[#1f2937] text-slate-400 hover:bg-[#374151]'
              }`}
            >
              {MONTH_NAMES[m].slice(0, 3)}
            </button>
          ))}
        </div>
      </div>

      {/* Month Grid */}
      <div className="px-4">
        {loading ? (
          <div className="h-[380px] flex items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 rounded-full border-2 border-violet-500 border-t-transparent animate-spin" />
              <p className="text-slate-500 text-sm">Loading your progress...</p>
            </div>
          </div>
        ) : (
          <MonthGrid
            month={activeMonth}
            year={activeYear}
            sessionsByDate={sessionsByDate}
            heatmapData={heatmapData}
            onDayClick={handleDayClick}
            selectedDate={selectedDate}
          />
        )}
      </div>

      {/* Legend */}
      <div className="px-5 mt-6">
        <p className="text-xs text-slate-500 mb-3 font-medium">INTENSITY</p>
        <div className="flex items-center justify-between bg-[#111827] rounded-2xl p-4 border border-white/5">
          {[
            { color: '#1f2937', label: 'None' },
            { color: '#3b82f6', label: '<1h' },
            { color: '#8b5cf6', label: '1–3h' },
            { color: '#22c55e', label: '3h+' },
          ].map(({ color, label }) => (
            <div key={label} className="flex items-center gap-2">
              <div
                className="w-5 h-5 rounded-lg ring-1 ring-white/10"
                style={{ backgroundColor: color }}
              />
              <span className="text-xs text-slate-400">{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="px-5 mt-8" id="calendar-stats">
        <div className="grid grid-cols-2 gap-4">
          {/* Streak */}
          <div className="bg-gradient-to-br from-orange-500/10 to-amber-500/10 border border-orange-500/20 rounded-3xl p-5">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-orange-500/10 rounded-2xl flex items-center justify-center">
                <i className="ti ti-flame text-3xl text-orange-400" />
              </div>
              <div>
                <p className="text-orange-400 text-sm font-medium">Current Streak</p>
                <p className="text-4xl font-bold mt-1 tracking-tighter">{streak}</p>
                <p className="text-slate-400 text-sm">days</p>
              </div>
            </div>
          </div>

          {/* Total Time */}
          <div className="bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border border-blue-500/20 rounded-3xl p-5">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-500/10 rounded-2xl flex items-center justify-center">
                <i className="ti ti-clock text-3xl text-blue-400" />
              </div>
              <div>
                <p className="text-blue-400 text-sm font-medium">Total Time</p>
                <p className="text-4xl font-bold mt-1 tracking-tighter">
                  {loading ? '—' : formatHours(totalSeconds)}
                </p>
                <p className="text-slate-400 text-sm">this quarter</p>
              </div>
            </div>
          </div>

          {/* Average */}
          <div className="bg-gradient-to-br from-violet-500/10 to-purple-500/10 border border-violet-500/20 rounded-3xl p-5">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-violet-500/10 rounded-2xl flex items-center justify-center">
                <i className="ti ti-chart-bar text-3xl text-violet-400" />
              </div>
              <div>
                <p className="text-violet-400 text-sm font-medium">Daily Avg</p>
                <p className="text-4xl font-bold mt-1 tracking-tighter">
                  {loading ? '—' : formatHours(avgSeconds)}
                </p>
                <p className="text-slate-400 text-sm">{activeDays} active days</p>
              </div>
            </div>
          </div>

          {/* Best Day */}
          <div className="bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border border-emerald-500/20 rounded-3xl p-5">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-emerald-500/10 rounded-2xl flex items-center justify-center">
                <i className="ti ti-trophy text-3xl text-emerald-400" />
              </div>
              <div>
                <p className="text-emerald-400 text-sm font-medium">Best Day</p>
                <p className="text-4xl font-bold mt-1 tracking-tighter">
                  {bestSec ? formatHours(bestSec) : '—'}
                </p>
                <p className="text-slate-400 text-sm truncate">
                  {bestDate || 'No data yet'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Hint */}
      <div className="px-5 mt-6 text-center">
        <p className="text-xs text-slate-500 flex items-center justify-center gap-2">
          <i className="ti ti-info-circle" />
          Tap any date to see session details
        </p>
      </div>

      {/* Day Detail Bottom Sheet */}
      {selectedDate && (
        <DayDetail
          date={selectedDate}
          sessions={selectedSessions}
          onClose={() => {
            setSelectedDate(null);
            setSelectedSessions([]);
          }}
        />
      )}
    </div>
  );
}