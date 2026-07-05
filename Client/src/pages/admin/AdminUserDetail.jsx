// src/pages/admin/AdminUserDetail.jsx
// Full profile view of a single member — stats, sessions, todos, badges,
// game profile, vocab progress, groups + admin controls (ban/timeout/delete/rename)

import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getUserDetail, banUser, timeoutUser, deleteUser, updateUser } from '@/api/admin';
import { formatHours, formatDuration } from '@/utils/time';

function Section({ title, icon, children }) {
  return (
    <div className="bg-[#0d1420] border border-slate-800/70 rounded-2xl p-4 mb-4">
      <div className="flex items-center gap-2 mb-3">
        <i className={`ti ${icon} text-orange-400 text-base`} />
        <span className="text-[13px] font-semibold text-slate-300">{title}</span>
      </div>
      {children}
    </div>
  );
}

export default function AdminUserDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [reason, setReason] = useState('');
  const [timeoutHours, setTimeoutHours] = useState(24);

  const load = useCallback(() => {
    setLoading(true);
    getUserDetail(id).then(setData).finally(() => setLoading(false));
  }, [id]);

  useEffect(() => { load(); }, [load]);

  async function handleBanToggle() {
    if (!data) return;
    const nextBanned = !data.user.isBanned;
    if (nextBanned && !window.confirm('Ban this user? They will not be able to log in.')) return;
    setBusy(true);
    try {
      await banUser(id, nextBanned, reason);
      setReason('');
      load();
    } finally { setBusy(false); }
  }

  async function handleTimeout() {
    setBusy(true);
    try {
      await timeoutUser(id, Number(timeoutHours), reason);
      setReason('');
      load();
    } finally { setBusy(false); }
  }

  async function handleClearTimeout() {
    setBusy(true);
    try { await timeoutUser(id, null); load(); } finally { setBusy(false); }
  }

  async function handleDelete() {
    if (!window.confirm('Permanently delete this user and all their data? This cannot be undone.')) return;
    if (!window.confirm('Are you absolutely sure? Type OK in the next popup to confirm again.')) return;
    setBusy(true);
    try {
      await deleteUser(id);
      navigate('/admin/users');
    } catch (e) {
      alert(e?.response?.data?.error || 'Failed to delete user');
      setBusy(false);
    }
  }

  async function handleRename() {
    const name = window.prompt('New display name:', data.user.displayName);
    if (!name || !name.trim()) return;
    setBusy(true);
    try { await updateUser(id, { displayName: name.trim() }); load(); } finally { setBusy(false); }
  }

  if (loading) return <div className="text-slate-500 text-sm py-10 text-center">Loading profile...</div>;
  if (!data) return <div className="text-slate-500 text-sm py-10 text-center">User not found.</div>;

  const { user, stats, recentSessions, recentTodos, badges, exams, gameProfile, vocabStreak, groups } = data;
  const isTimedOut = user.timeoutUntil && new Date(user.timeoutUntil) > new Date();

  return (
    <div className="min-h-screen bg-[#07090f] text-white pb-28" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      <div className="px-5 pt-6 pb-2">
        <button onClick={() => navigate('/admin/users')} className="flex items-center gap-1 text-sm text-slate-400 hover:text-white mb-4">
          <i className="ti ti-arrow-left" /> Back to members
        </button>

        {/* Profile header */}
        <div className="flex items-center gap-4 mb-5">
          <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center overflow-hidden shrink-0">
            {user.photoURL ? (
              <img src={user.photoURL} alt="" className="w-full h-full object-cover" />
            ) : (
              <span className="text-xl font-bold text-slate-300">{(user.displayName || 'A')[0].toUpperCase()}</span>
            )}
          </div>
          <div className="min-w-0">
            <h1 className="text-xl font-bold text-white truncate" style={{ fontFamily: "'Sora', sans-serif" }}>
              {user.displayName || 'Aspirant'}
            </h1>
            <p className="text-sm text-slate-500 truncate">{user.email || 'No email · Guest account'}</p>
            <p className="text-[11px] text-slate-600 mt-0.5">Joined {new Date(user.createdAt).toLocaleDateString()}</p>
          </div>
        </div>

        {/* Status badges */}
        <div className="flex gap-2 mb-5 flex-wrap">
          {user.isBanned && <span className="text-xs px-2.5 py-1 rounded-full bg-red-500/15 text-red-400 border border-red-500/30">🚫 Banned{user.banReason ? `: ${user.banReason}` : ''}</span>}
          {isTimedOut && <span className="text-xs px-2.5 py-1 rounded-full bg-yellow-500/15 text-yellow-400 border border-yellow-500/30">⏱ Timeout until {new Date(user.timeoutUntil).toLocaleString()}</span>}
          {!user.isBanned && !isTimedOut && <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">✓ Active, no restrictions</span>}
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-3 gap-3 mb-5">
          <div className="bg-[#0d1420] border border-slate-800/70 rounded-xl p-3 text-center">
            <p className="text-lg font-bold text-orange-400" style={{ fontFamily: "'Sora', sans-serif" }}>{formatHours(stats.totalStudySeconds)}</p>
            <p className="text-[10px] text-slate-500">Total Study Time</p>
          </div>
          <div className="bg-[#0d1420] border border-slate-800/70 rounded-xl p-3 text-center">
            <p className="text-lg font-bold text-blue-400" style={{ fontFamily: "'Sora', sans-serif" }}>{stats.totalSessions}</p>
            <p className="text-[10px] text-slate-500">Study Sessions</p>
          </div>
          <div className="bg-[#0d1420] border border-slate-800/70 rounded-xl p-3 text-center">
            <p className="text-lg font-bold text-purple-400" style={{ fontFamily: "'Sora', sans-serif" }}>{stats.todosDone}/{stats.todosTotal}</p>
            <p className="text-[10px] text-slate-500">Todos Done</p>
          </div>
        </div>

        {/* Admin controls */}
        <Section title="Admin Controls" icon="ti-shield-lock">
          <input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Reason (optional, shown to user)"
            className="w-full bg-[#07090f] border border-slate-800 rounded-lg px-3 py-2 text-sm text-white placeholder:text-slate-600 outline-none mb-3 focus:border-orange-500/50"
          />

          <div className="flex flex-wrap gap-2 mb-3">
            <button disabled={busy} onClick={handleBanToggle}
              className={`text-xs font-semibold px-3 py-2 rounded-lg border transition-colors disabled:opacity-50 ${
                user.isBanned ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-red-500/10 border-red-500/30 text-red-400'
              }`}>
              {user.isBanned ? 'Unban User' : 'Ban User'}
            </button>

            <button disabled={busy} onClick={handleRename}
              className="text-xs font-semibold px-3 py-2 rounded-lg border border-slate-700 text-slate-300 hover:border-slate-500">
              Rename
            </button>

            {isTimedOut && (
              <button disabled={busy} onClick={handleClearTimeout}
                className="text-xs font-semibold px-3 py-2 rounded-lg border border-yellow-500/30 bg-yellow-500/10 text-yellow-400">
                Clear Timeout
              </button>
            )}

            <button disabled={busy} onClick={handleDelete}
              className="text-xs font-semibold px-3 py-2 rounded-lg border border-red-500/40 bg-red-500/20 text-red-300 ml-auto">
              Delete User
            </button>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={timeoutHours}
              onChange={(e) => setTimeoutHours(e.target.value)}
              className="bg-[#07090f] border border-slate-800 rounded-lg px-2 py-2 text-xs text-white outline-none"
            >
              <option value={1}>1 hour</option>
              <option value={6}>6 hours</option>
              <option value={24}>24 hours</option>
              <option value={72}>3 days</option>
              <option value={168}>7 days</option>
            </select>
            <button disabled={busy} onClick={handleTimeout}
              className="text-xs font-semibold px-3 py-2 rounded-lg border border-orange-500/30 bg-orange-500/10 text-orange-400">
              Apply Timeout
            </button>
          </div>
        </Section>

        {/* Groups */}
        <Section title={`Groups (${groups.length})`} icon="ti-users-group">
          {groups.length === 0 ? (
            <p className="text-xs text-slate-600">Not part of any group.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {groups.map((g) => (
                <div key={g._id} className="flex items-center justify-between text-sm bg-[#07090f] rounded-lg px-3 py-2">
                  <span className="text-slate-300">{g.name}</span>
                  <span className="text-[11px] text-slate-500">{g.memberCount} members · {g.inviteCode}</span>
                </div>
              ))}
            </div>
          )}
        </Section>

        {/* Game profile */}
        {gameProfile && (
          <Section title="Practice Arena Progress" icon="ti-sword">
            <div className="grid grid-cols-2 gap-2 text-sm">
              <p className="text-slate-400">Level: <span className="text-white font-semibold">{gameProfile.level}</span></p>
              <p className="text-slate-400">Total XP: <span className="text-white font-semibold">{gameProfile.totalXP}</span></p>
              <p className="text-slate-400">Daily Streak: <span className="text-white font-semibold">{gameProfile.dailyStreak}</span></p>
            </div>
          </Section>
        )}

        {/* Vocab */}
        <Section title="Vocab Master" icon="ti-book-2">
          <div className="grid grid-cols-2 gap-2 text-sm">
            <p className="text-slate-400">Words tracked: <span className="text-white font-semibold">{stats.vocabWordsTracked}</span></p>
            {vocabStreak && <p className="text-slate-400">Current streak: <span className="text-white font-semibold">{vocabStreak.currentStreak}</span></p>}
          </div>
        </Section>

        {/* Badges */}
        <Section title={`Badges (${badges.length})`} icon="ti-trophy">
          {badges.length === 0 ? (
            <p className="text-xs text-slate-600">No badges unlocked yet.</p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {badges.map((b) => (
                <span key={b._id} className="text-[11px] px-2 py-1 rounded-lg bg-orange-500/10 border border-orange-500/25 text-orange-400">{b.badgeId}</span>
              ))}
            </div>
          )}
        </Section>

        {/* Recent sessions */}
        <Section title="Recent Study Sessions" icon="ti-history">
          {recentSessions.length === 0 ? (
            <p className="text-xs text-slate-600">No sessions logged yet.</p>
          ) : (
            <div className="flex flex-col gap-1.5 max-h-64 overflow-y-auto">
              {recentSessions.map((s) => (
                <div key={s._id} className="flex items-center justify-between text-xs bg-[#07090f] rounded-lg px-3 py-2">
                  <span className="text-slate-300">{s.subjectName || 'Study'}</span>
                  <span className="text-slate-500">{formatDuration(s.duration)}</span>
                  <span className="text-slate-600">{s.date}</span>
                </div>
              ))}
            </div>
          )}
        </Section>

        {/* Recent todos */}
        <Section title="Recent Todos" icon="ti-checkbox">
          {recentTodos.length === 0 ? (
            <p className="text-xs text-slate-600">No todos yet.</p>
          ) : (
            <div className="flex flex-col gap-1.5 max-h-64 overflow-y-auto">
              {recentTodos.map((t) => (
                <div key={t._id} className="flex items-center justify-between text-xs bg-[#07090f] rounded-lg px-3 py-2">
                  <span className={`truncate ${t.done ? 'text-slate-600 line-through' : 'text-slate-300'}`}>{t.text}</span>
                  <span className="text-slate-600 shrink-0 ml-2">{t.date}</span>
                </div>
              ))}
            </div>
          )}
        </Section>

        {/* Exams */}
        {exams.length > 0 && (
          <Section title="Exams Added" icon="ti-calendar-event">
            <div className="flex flex-col gap-1.5">
              {exams.map((ex) => (
                <div key={ex._id} className="flex items-center justify-between text-xs bg-[#07090f] rounded-lg px-3 py-2">
                  <span className="text-slate-300">{ex.name}</span>
                  <span className="text-slate-500">{ex.examDate}</span>
                </div>
              ))}
            </div>
          </Section>
        )}
      </div>
    </div>
  );
}