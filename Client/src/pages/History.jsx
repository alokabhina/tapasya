// src/pages/History.jsx
// Redesigned: Premium dark editorial layout
// — Glowing stat cards at top
// — Inline search + filter bar
// — Table-style session rows (Subject | Duration | Date & Time | Actions)
// — Motivational quote footer
// — All existing logic preserved

import { useState, useEffect, useCallback } from 'react';
import { getSessions, deleteSession } from '../api/sessions';
import { useUserStore } from '../store/userStore';
import HistoryFilters from '../components/history/HistoryFilters';
import SessionCard from '../components/history/SessionCard';
import SessionEditModal from '../components/history/SessionEditModal';

const PAGE_SIZE = 20;

const QUOTES = [
  'Consistency today, success tomorrow.',
  'Every session brings you closer to mastery.',
  'Small steps every day, giant leaps over time.',
  'Your future self is watching. Study hard.',
];

function fmtHours(sec) {
  const h = sec / 3600;
  if (h < 1) return `${Math.round(sec / 60)}m`;
  return `${Math.floor(h)}h ${Math.round((h % 1) * 60)}m`;
}

function longestSession(sessions) {
  if (!sessions.length) return 0;
  return Math.max(...sessions.map((s) => s.durationSeconds || s.duration || 0));
}

function dailyAvg(sessions) {
  if (!sessions.length) return 0;
  const days = new Set(sessions.map((s) => (s.date || '').slice(0, 10))).size || 1;
  const total = sessions.reduce((sum, s) => sum + (s.durationSeconds || s.duration || 0), 0);
  return total / days;
}

export default function History() {
  const uid = useUserStore((s) => s.uid);
  const [allSessions, setAllSessions] = useState([]);
  const [filtered, setFiltered]       = useState([]);
  const [search, setSearch]           = useState('');
  const [page, setPage]               = useState(1);
  const [loading, setLoading]         = useState(true);
  const [editSession, setEditSession] = useState(null);
  const [filters, setFilters]         = useState({ subjects: [], dateRange: null });
  const [timeRange, setTimeRange]     = useState('all'); // 'all' | 'week' | 'month'

  const quote = QUOTES[new Date().getDay() % QUOTES.length];

  const fetchSessions = useCallback(async () => {
    if (!uid) return;
    setLoading(true);
    try {
      const data = await getSessions();
      data.sort((a, b) => new Date(b.startTime) - new Date(a.startTime));
      setAllSessions(data);
      setFiltered(data);
    } catch (e) {
      console.error('History fetch error:', e);
    } finally {
      setLoading(false);
    }
  }, [uid]);

  useEffect(() => { fetchSessions(); }, [fetchSessions]);

  useEffect(() => {
    let result = [...allSessions];

    // Time range preset
    if (timeRange !== 'all') {
      const cutoff = new Date();
      if (timeRange === 'week')  cutoff.setDate(cutoff.getDate() - 7);
      if (timeRange === 'month') cutoff.setMonth(cutoff.getMonth() - 1);
      result = result.filter((s) => new Date(s.startTime) >= cutoff);
    }

    // Subject filter
    if (filters.subjects?.length > 0) {
      result = result.filter((s) => filters.subjects.includes(s.subjectId));
    }

    // Date range
    if (filters.dateRange?.start) {
      result = result.filter((s) => new Date(s.startTime) >= new Date(filters.dateRange.start));
    }
    if (filters.dateRange?.end) {
      const end = new Date(filters.dateRange.end);
      end.setHours(23, 59, 59, 999);
      result = result.filter((s) => new Date(s.startTime) <= end);
    }

    // Search
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (s) =>
          (s.subjectName || '').toLowerCase().includes(q) ||
          (s.notes || '').toLowerCase().includes(q)
      );
    }

    setFiltered(result);
    setPage(1);
  }, [filters, allSessions, search, timeRange]);

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this session?')) return;
    try {
      await deleteSession(id);
      setAllSessions((prev) => prev.filter((s) => (s.id || s._id) !== id));
    } catch (e) {
      console.error('Delete error:', e);
    }
  };

  const paginated   = filtered.slice(0, page * PAGE_SIZE);
  const hasMore     = paginated.length < filtered.length;
  const totalSec    = filtered.reduce((sum, s) => sum + (s.durationSeconds || s.duration || 0), 0);
  const avgSec      = dailyAvg(filtered);
  const maxSec      = longestSession(filtered);

  return (
    <div className="min-h-screen bg-[#080d16] text-white" style={{ fontFamily: "'DM Sans', sans-serif" }}>

      {/* ── Top header ── */}
      <div className="px-5 pt-7 pb-2 flex items-start justify-between">
        <div>
          <h1
            className="text-2xl font-bold tracking-tight text-white"
            style={{ fontFamily: "'Sora', sans-serif", letterSpacing: '-0.03em' }}
          >
            Session History
          </h1>
          <p className="text-[13px] text-slate-500 mt-0.5">
            Review your study sessions and progress over time.
          </p>
        </div>

        {/* Time range pills */}
        <div className="flex items-center gap-1.5 bg-[#0f1923] border border-slate-800 rounded-xl p-1">
          {[['all', 'All'], ['week', 'Week'], ['month', 'Month']].map(([v, label]) => (
            <button
              key={v}
              onClick={() => setTimeRange(v)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                timeRange === v
                  ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/30'
                  : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Stat cards ── */}
      <div className="px-5 py-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          {
            icon: 'ti-layers-subtract',
            iconBg: 'bg-orange-500/15',
            iconColor: 'text-orange-400',
            glow: 'shadow-orange-500/20',
            label: 'Total Sessions',
            value: loading ? '—' : filtered.length,
            sub: 'Sessions',
          },
          {
            icon: 'ti-clock',
            iconBg: 'bg-violet-500/15',
            iconColor: 'text-violet-400',
            glow: 'shadow-violet-500/20',
            label: 'Total Time',
            value: loading ? '—' : fmtHours(totalSec),
            sub: 'Hours',
          },
          {
            icon: 'ti-trending-up',
            iconBg: 'bg-blue-500/15',
            iconColor: 'text-blue-400',
            glow: 'shadow-blue-500/20',
            label: 'Daily Average',
            value: loading ? '—' : fmtHours(avgSec),
            sub: 'Per day',
          },
          {
            icon: 'ti-flame',
            iconBg: 'bg-green-500/15',
            iconColor: 'text-green-400',
            glow: 'shadow-green-500/20',
            label: 'Longest Session',
            value: loading ? '—' : fmtHours(maxSec),
            sub: 'Best single session',
          },
        ].map((c) => (
          <div
            key={c.label}
            className={`bg-[#0d1520] border border-slate-800/80 rounded-2xl p-4 flex items-center gap-3 shadow-lg ${c.glow}`}
          >
            <div className={`w-10 h-10 rounded-xl ${c.iconBg} flex items-center justify-center flex-shrink-0`}>
              <i className={`ti ${c.icon} ${c.iconColor} text-lg`} />
            </div>
            <div>
              <p className="text-[10px] text-slate-500 uppercase tracking-widest">{c.label}</p>
              <p className="text-xl font-bold text-white leading-tight" style={{ fontFamily: "'Sora', sans-serif" }}>
                {c.value}
              </p>
              <p className="text-[10px] text-slate-600">{c.sub}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Search + Filter bar ── */}
      <div className="px-5 mb-4 flex items-center gap-3">
        {/* Search */}
        <div className="flex-1 relative">
          <i className="ti ti-search absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 text-sm" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search sessions..."
            className="w-full bg-[#0d1520] border border-slate-800 text-slate-200 text-sm rounded-xl pl-9 pr-4 py-2.5 focus:outline-none focus:border-orange-500/60 placeholder-slate-600 transition-colors"
          />
        </div>

        {/* Filters */}
        <HistoryFilters onFilter={setFilters} />
      </div>

      {/* ── Table header (desktop) ── */}
      <div className="hidden md:grid grid-cols-[2fr_1fr_2fr_auto] gap-4 px-5 pb-2 border-b border-slate-800/60">
        {['Subject', 'Duration', 'Date & Time', ''].map((h) => (
          <p key={h} className="text-[10px] uppercase tracking-widest text-slate-600 font-semibold">{h}</p>
        ))}
      </div>

      {/* ── Session list ── */}
      <div className="px-5 mt-1">
        {loading ? (
          <div className="flex items-center justify-center py-28">
            <div className="w-7 h-7 rounded-full border-2 border-orange-500 border-t-transparent animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-28 gap-3">
            <div className="w-16 h-16 rounded-2xl bg-slate-800/50 flex items-center justify-center">
              <i className="ti ti-inbox text-3xl text-slate-600" />
            </div>
            <p className="text-slate-400 text-sm font-medium">No sessions found</p>
            <p className="text-slate-600 text-xs">Try adjusting your filters or search</p>
          </div>
        ) : (
          <div className="flex flex-col divide-y divide-slate-800/50">
            {paginated.map((session, idx) => (
              <SessionCard
                key={session._id || session.id}
                session={session}
                index={idx}
                onEdit={() => setEditSession(session)}
                onDelete={() => handleDelete(session._id || session.id)}
              />
            ))}
          </div>
        )}

        {hasMore && (
          <button
            onClick={() => setPage((p) => p + 1)}
            className="w-full mt-4 py-3 text-sm text-orange-400 bg-[#0d1520] border border-slate-800 rounded-2xl hover:border-orange-500/40 hover:bg-[#111a28] transition-all"
          >
            Load more
            <span className="ml-1.5 text-slate-600 text-xs">
              ({filtered.length - paginated.length} remaining)
            </span>
          </button>
        )}
      </div>

      {/* ── Quote footer ── */}
      {!loading && filtered.length > 0 && (
        <div className="mx-5 mt-8 mb-4 flex items-center justify-center gap-2">
          <i className="ti ti-quote text-orange-500/50 text-xl" aria-hidden />
          <p className="text-sm text-slate-500 italic">{quote}</p>
          <i className="ti ti-quote text-orange-500/50 text-xl rotate-180" aria-hidden />
        </div>
      )}

      <div className="h-24" />

      {editSession && (
        <SessionEditModal
          session={editSession}
          onSave={() => { setEditSession(null); fetchSessions(); }}
          onClose={() => setEditSession(null)}
        />
      )}
    </div>
  );
}