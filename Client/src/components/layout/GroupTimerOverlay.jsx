// src/components/group/GroupTimerOverlay.jsx
// Fully responsive — mobile/tablet/desktop
// Group data (members, leaderboard) shown prominently; personal stats secondary

import { useState, useEffect, useRef } from 'react';
import useTimerStore from '../../store/timerStore';
import useUserStore from '../../store/userStore';
import useSubjectStore from '../../store/subjectStore';
import { useTimer } from '../../hooks/useTimer';
import { fetchGroupMembers, fetchMyGroups } from '../../api/groups';
import { formatDuration, formatHours, formatHumanDuration } from '../../utils/time';
import { useNavigate } from 'react-router-dom';
import { useLiveTicker } from '../../hooks/useLiveTicker';

// ── Circular ring ─────────────────────────────────────────────────────────────
function CircularTimer({ elapsed, color = '#f97316', size = 180 }) {
  const cx = size / 2, cy = size / 2;
  const radius = size * 0.41;
  const circumference = 2 * Math.PI * radius;
  const THIRTY_MIN = 30 * 60;
  const progress = (elapsed % THIRTY_MIN) / THIRTY_MIN;
  const dashOffset = circumference * (1 - progress);
  const angle = progress * 360 - 90;
  const dotX = cx + radius * Math.cos((angle * Math.PI) / 180);
  const dotY = cy + radius * Math.sin((angle * Math.PI) / 180);

  return (
    <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="block">
        <circle cx={cx} cy={cy} r={radius} fill="none" stroke="#1a2535" strokeWidth={8} />
        {elapsed > 0 && (
          <circle cx={cx} cy={cy} r={radius} fill="none" stroke={color} strokeWidth={8}
            strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={dashOffset}
            transform={`rotate(-90 ${cx} ${cy})`}
            style={{ transition: 'stroke-dashoffset 1s linear', filter: `drop-shadow(0 0 8px ${color}99)` }} />
        )}
        {elapsed > 2 && (
          <circle cx={dotX} cy={dotY} r={5} fill="white"
            style={{ filter: `drop-shadow(0 0 5px ${color})` }} />
        )}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center select-none gap-1">
        <svg viewBox="0 0 80 80" width="44" height="44">
          <ellipse cx="40" cy="66" rx="20" ry="6" fill="#5c3a1e" opacity="0.8" />
          <ellipse cx="40" cy="64" rx="16" ry="4" fill="#7c4a2a" />
          <path d="M40 64 Q40 50 40 38" stroke="#5a7a2a" strokeWidth="3" fill="none" strokeLinecap="round" />
          <path d="M40 52 Q28 44 24 32 Q32 34 40 46" fill="#4a7c2a" opacity="0.9" />
          <path d="M40 48 Q52 40 56 28 Q48 30 40 42" fill="#5a9034" opacity="0.85" />
          <path d="M40 38 Q34 30 36 22 Q42 28 40 38" fill="#6aaa3a" opacity="0.9" />
        </svg>
        <p className="font-bold text-white leading-none"
          style={{ fontSize: size < 160 ? '1.5rem' : '1.85rem', fontFamily: 'ui-monospace,monospace', textShadow: `0 0 20px ${color}40` }}>
          {formatDuration(elapsed)}
        </p>
        <p className="text-slate-500 text-[10px] tracking-wide">Keep going!</p>
      </div>
    </div>
  );
}

// ── Member card ───────────────────────────────────────────────────────────────
function MemberCard({ member, isCurrentUser, currentElapsed, rank }) {
  const isStudying = isCurrentUser || member.isStudying || false;
  const displayTime = isCurrentUser
    ? formatDuration(currentElapsed)
    : formatDuration(member.liveElapsed || 0);
  const name = isCurrentUser ? 'You' : (member.displayName?.split(' ')[0] || 'Member');
  const rankColors = ['#FFD700', '#C0C0C0', '#CD7F32'];
  const rankColor  = rank <= 3 ? rankColors[rank - 1] : null;

  return (
    <div className={`flex flex-col items-center gap-1.5 p-3 rounded-2xl border transition-all`}
      style={{
        minWidth: 80,
        borderColor: isStudying ? '#f9731655' : '#334155',
        backgroundColor: isStudying ? '#f9731610' : '#0f1c2e',
      }}>
      <div className="relative">
        {/* Rank badge */}
        {rankColor && (
          <span className="absolute -top-2 -left-2 z-10 text-[10px] font-bold w-4 h-4 rounded-full
                           flex items-center justify-center border border-slate-800"
            style={{ backgroundColor: rankColor + '33', color: rankColor }}>
            {rank}
          </span>
        )}
        {isStudying ? (
          <div className="w-12 h-12 flex items-center justify-center">
            <svg viewBox="0 0 60 48" className="w-12 h-10" fill="none">
              <circle cx="20" cy="8" r="6" stroke="#f97316" strokeWidth="2.5" fill="none" />
              <path d="M20 14 L20 26" stroke="#f97316" strokeWidth="2.5" strokeLinecap="round" />
              <path d="M12 20 L20 20 L28 20" stroke="#f97316" strokeWidth="2.5" strokeLinecap="round" />
              <rect x="6" y="28" width="36" height="3" rx="1.5" stroke="#f97316" strokeWidth="2" fill="none" />
              <line x1="10" y1="31" x2="10" y2="44" stroke="#f97316" strokeWidth="2" strokeLinecap="round" />
              <line x1="38" y1="31" x2="38" y2="44" stroke="#f97316" strokeWidth="2" strokeLinecap="round" />
              <line x1="42" y1="28" x2="42" y2="16" stroke="#f97316" strokeWidth="2" strokeLinecap="round" />
              <line x1="36" y1="16" x2="48" y2="16" stroke="#f97316" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </div>
        ) : (
          <div className="w-12 h-12 flex items-center justify-center opacity-25">
            <svg viewBox="0 0 60 48" className="w-12 h-10" fill="none">
              <circle cx="20" cy="8" r="6" stroke="#64748b" strokeWidth="2.5" fill="none" />
              <rect x="6" y="28" width="36" height="3" rx="1.5" stroke="#64748b" strokeWidth="2" fill="none" />
              <line x1="10" y1="31" x2="10" y2="44" stroke="#64748b" strokeWidth="2" strokeLinecap="round" />
              <line x1="38" y1="31" x2="38" y2="44" stroke="#64748b" strokeWidth="2" strokeLinecap="round" />
              <line x1="42" y1="28" x2="42" y2="16" stroke="#64748b" strokeWidth="2" strokeLinecap="round" />
              <line x1="36" y1="16" x2="48" y2="16" stroke="#64748b" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </div>
        )}
        {isStudying && (
          <span className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-green-400 rounded-full
                           border-2 border-[#0a1628] animate-pulse" />
        )}
      </div>
      <p className="text-xs font-semibold truncate text-center w-full"
        style={{ color: isStudying ? '#fb923c' : '#64748b', maxWidth: 76 }}>
        {name}
      </p>
      <p className="text-xs font-mono font-bold"
        style={{ color: isStudying ? 'white' : '#475569' }}>
        {displayTime}
      </p>
    </div>
  );
}

// ── Leaderboard row ───────────────────────────────────────────────────────────
function LeaderboardRow({ member, rank, isCurrentUser, currentElapsed }) {
  const rankColors = ['#FFD700', '#C0C0C0', '#CD7F32'];
  const rankColor  = rank <= 3 ? rankColors[rank - 1] : '#475569';
  const name       = isCurrentUser ? 'You' : (member.displayName?.split(' ')[0] || 'Member');
  const weekSec    = member.weeklySeconds || 0;
  const liveElapsed = isCurrentUser ? (currentElapsed || 0) : (member.liveElapsed || 0);
  const isStudying = isCurrentUser || Boolean(member.isStudying);
  const maxSec     = 8 * 3600;
  const barPct     = Math.min((weekSec / maxSec) * 100, 100);

  return (
    <div className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all
      ${isCurrentUser ? 'border border-orange-500/30 bg-orange-500/5' : 'border border-transparent'}`}>
      {/* Rank */}
      <span className="w-5 text-center text-xs font-bold flex-shrink-0"
        style={{ color: rankColor }}>
        {rank <= 3 ? ['🥇','🥈','🥉'][rank-1] : rank}
      </span>

      {/* Status dot */}
      <span className={`w-2 h-2 rounded-full flex-shrink-0 ${isStudying ? 'bg-green-400 animate-pulse' : 'bg-slate-700'}`} />

      {/* Name + live session time */}
      <div className="flex-1 min-w-0">
        <span className="text-xs font-semibold truncate block"
          style={{ color: isStudying ? '#e2e8f0' : '#64748b' }}>
          {name}
        </span>
        {isStudying && liveElapsed > 0 && (
          <span className="text-[10px] text-green-400 font-mono">{formatDuration(liveElapsed)} session</span>
        )}
      </div>

      {/* Weekly bar + time */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <div className="w-16 sm:w-20 h-1.5 bg-slate-800 rounded-full overflow-hidden">
          <div className="h-full rounded-full transition-all duration-500"
            style={{ width: `${Math.max(barPct, weekSec > 0 ? 3 : 0)}%`,
              backgroundColor: isStudying ? '#f97316' : '#334155',
              boxShadow: isStudying ? '0 0 4px #f9731660' : 'none' }} />
        </div>
        <span className="text-[11px] font-mono w-14 text-right"
          style={{ color: isStudying ? 'white' : '#475569' }}>
          {weekSec > 0 ? formatHours(weekSec) : '—'}
        </span>
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function GroupTimerOverlay({ onClose }) {
  const elapsed      = useTimerStore((s) => s.elapsed);
  const subjectName  = useTimerStore((s) => s.subjectName);
  const subjectColor = useTimerStore((s) => s.subjectColor);
  const isRunning    = useTimerStore((s) => s.isRunning);
  const isPaused     = useTimerStore((s) => s.isPaused);
  const { uid, displayName } = useUserStore();
  const dailyGoalSeconds = useUserStore((s) => s.dailyGoalSeconds);
  const subjects = useSubjectStore((s) => s.subjects);
  const { stop, pause, resume } = useTimer();
  const navigate = useNavigate();

  const [groups,      setGroups]      = useState([]);
  const [activeGroup, setActiveGroup] = useState(null);
  const [members,     setMembers]     = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [activeTab,   setActiveTab]   = useState('members'); // 'members' | 'leaderboard'
  const pollRef = useRef(null);

  useEffect(() => { loadGroups(); return () => clearInterval(pollRef.current); }, []);
  useEffect(() => {
    clearInterval(pollRef.current);
    if (!activeGroup?._id) return;
    pollMembers();
    pollRef.current = setInterval(pollMembers, 20000); // was 8000 — reduced to cut Vercel function invocations
    return () => clearInterval(pollRef.current);
  }, [activeGroup]);

  async function loadGroups() {
    setLoading(true);
    try {
      const data = await fetchMyGroups();
      setGroups(data);
      if (data.length > 0) setActiveGroup(data[0]);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }

  async function pollMembers() {
    if (!activeGroup?._id) return;
    try {
      const data = await fetchGroupMembers(activeGroup._id);
      setMembers(data);
    } catch (e) { console.error(e); }
  }

  const todayBase  = subjects.reduce((sum, s) => sum + (s.todaySeconds || 0), 0);
  const todayTotal = todayBase + elapsed;
  const color      = subjectColor || '#f97316';
  const pct        = dailyGoalSeconds > 0 ? Math.min((todayTotal / dailyGoalSeconds) * 100, 100) : 0;
  const statusText = isPaused ? 'Paused' : isRunning ? 'Focusing' : 'Ready';

  // FIX: sec-by-sec smooth ticking instead of jumping every 8s poll
  const tickedMembers = useLiveTicker(members);

  // Build leaderboard sorted by weeklySeconds (with live elapsed for current user)
  const myMemberData = tickedMembers.find(m => m.userId?.toString() === uid?.toString());
  const allMembers = [
    ...tickedMembers.filter(m => m.userId?.toString() !== uid?.toString()),
    { ...(myMemberData || {}), userId: uid, displayName, isStudying: true, liveElapsed: elapsed },
  ].sort((a, b) => (b.weeklySeconds || 0) - (a.weeklySeconds || 0));

  const studyingCount = tickedMembers.filter(m =>
    m.userId?.toString() !== uid?.toString() && m.isStudying
  ).length + 1; // +1 for self

  async function handleStop() { await stop(); navigate('/'); }

  return (
    <div className="fixed inset-0 z-[200] flex flex-col overflow-hidden"
      style={{ background: 'linear-gradient(160deg, #0d1b2e 0%, #080d16 55%, #090e1c 100%)' }}>

      {/* Ambient glow */}
      <div className="absolute inset-0 pointer-events-none"
        style={{ background: `radial-gradient(ellipse 70% 45% at 50% 25%, ${color}0d 0%, transparent 65%)` }} />

      {/* ── Top bar ── */}
      <div className="relative z-10 flex items-center justify-between px-4 pt-4 pb-3 flex-shrink-0 gap-2">
        <button onClick={onClose}
          className="flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-slate-800/60
                     border border-slate-700/40 text-slate-300 hover:text-white text-sm font-medium transition-all">
          <i className="ti ti-arrow-left text-sm" />
          <span className="hidden sm:inline">Back</span>
        </button>

        <div className="flex items-center gap-2 min-w-0">
          <div className="w-2 h-2 rounded-full animate-pulse flex-shrink-0"
            style={{ backgroundColor: isPaused ? '#94a3b8' : color }} />
          <span className="text-white font-bold text-sm truncate">{subjectName || 'Study Session'}</span>
          <span className="text-slate-500 text-xs hidden sm:inline">{statusText}</span>
        </div>

        {/* Group pill */}
        <div className="flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-[#1a2540]/80
                        border border-[#2a3a5a] text-sm font-semibold text-[#60a5fa] relative flex-shrink-0">
          <i className="ti ti-users text-sm" />
          <span className="hidden sm:inline">Group</span>
          <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-green-400 rounded-full
                           border-2 border-[#080d16] animate-pulse" />
        </div>
      </div>

      {/* ── Group tabs (if multiple groups) ── */}
      {groups.length > 1 && (
        <div className="relative z-10 flex gap-2 px-4 pb-2 overflow-x-auto scrollbar-none flex-shrink-0">
          {groups.map((g) => (
            <button key={g._id} onClick={() => setActiveGroup(g)}
              className="flex-shrink-0 flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all"
              style={activeGroup?._id === g._id
                ? { backgroundColor: color, color: 'white' }
                : { backgroundColor: '#1a2535', color: '#94a3b8', border: '1px solid #2a3a55' }}>
              {g.name}
            </button>
          ))}
        </div>
      )}

      {/* ── Main content area ── */}
      <div className="relative z-10 flex-1 overflow-y-auto">

        {/* ── Responsive layout: stacked on mobile, side-by-side on lg ── */}
        <div className="flex flex-col lg:flex-row gap-4 px-4 py-2 lg:items-start lg:justify-center lg:max-w-5xl lg:mx-auto">

          {/* ── Left: Timer ring + personal quick stats ── */}
          <div className="flex flex-col items-center gap-3 flex-shrink-0">
            {/* Timer ring — smaller on mobile */}
            <div className="flex items-center justify-center gap-4 sm:gap-6 w-full">
              {/* Left stat */}
              <div className="text-right hidden sm:block">
                <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-0.5">Today</p>
                <p className="font-bold text-base font-mono leading-none" style={{ color }}>
                  {formatDuration(todayTotal)}
                </p>
              </div>

              {/* Ring — responsive size */}
              <div className="sm:hidden">
                <CircularTimer elapsed={elapsed} color={color} size={150} />
              </div>
              <div className="hidden sm:block">
                <CircularTimer elapsed={elapsed} color={color} size={180} />
              </div>

              {/* Right stat */}
              <div className="hidden sm:block">
                <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-0.5">Goal</p>
                {dailyGoalSeconds > 0 ? (
                  <>
                    <p className="font-bold text-base font-mono leading-none" style={{ color }}>
                      {Math.round(pct)}%
                    </p>
                    <div className="w-16 h-1.5 bg-slate-800 rounded-full mt-1 overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: color }} />
                    </div>
                  </>
                ) : (
                  <p className="text-xs text-slate-600">—</p>
                )}
              </div>
            </div>

            {/* Mobile: today + goal in a row below ring */}
            <div className="flex items-center gap-4 sm:hidden w-full justify-center">
              <div className="text-center">
                <p className="text-[9px] text-slate-500 uppercase tracking-widest mb-0.5">Today</p>
                <p className="font-bold text-sm font-mono" style={{ color }}>{formatDuration(todayTotal)}</p>
              </div>
              {dailyGoalSeconds > 0 && (
                <div className="text-center">
                  <p className="text-[9px] text-slate-500 uppercase tracking-widest mb-0.5">Goal</p>
                  <p className="font-bold text-sm font-mono" style={{ color }}>{Math.round(pct)}%</p>
                </div>
              )}
              <div className="text-center">
                <p className="text-[9px] text-slate-500 uppercase tracking-widest mb-0.5">Session</p>
                <p className="font-bold text-sm font-mono" style={{ color }}>{formatDuration(elapsed)}</p>
              </div>
            </div>
          </div>

          {/* ── Right: Group data — Members + Leaderboard ── */}
          <div className="flex-1 min-w-0 flex flex-col gap-3 pb-2">
            {/* Group name + active count */}
            {activeGroup && (
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-bold text-white text-base">{activeGroup.name}</h2>
                  <p className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse inline-block" />
                    {studyingCount} studying now · {(members.length + 1)} total members
                  </p>
                </div>
              </div>
            )}

            {/* Tab switcher: Members | Leaderboard */}
            <div className="flex bg-slate-800/60 rounded-xl p-0.5 gap-0.5 flex-shrink-0">
              {['members', 'leaderboard'].map((tab) => (
                <button key={tab} onClick={() => setActiveTab(tab)}
                  className={`flex-1 py-1.5 rounded-[10px] text-xs font-semibold capitalize transition-all
                    ${activeTab === tab
                      ? 'bg-slate-700 text-white shadow'
                      : 'text-slate-500 hover:text-slate-300'}`}>
                  <i className={`ti ${tab === 'members' ? 'ti-users' : 'ti-trophy'} mr-1.5`} />
                  {tab}
                </button>
              ))}
            </div>

            {loading ? (
              <div className="flex flex-col items-center py-8 gap-3">
                <div className="w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
                <p className="text-slate-600 text-xs">Loading group…</p>
              </div>
            ) : groups.length === 0 ? (
              <div className="flex flex-col items-center py-8 gap-3 text-center">
                <i className="ti ti-users text-3xl text-slate-700" />
                <p className="text-slate-500 text-sm">No group joined yet</p>
                <p className="text-slate-600 text-xs">Join a Study Group to study together</p>
              </div>
            ) : activeTab === 'members' ? (
              /* ── Members grid ── */
              <div className="flex flex-wrap gap-2.5 justify-start">
                {/* Studying members first */}
                {tickedMembers
                  .filter(m => m.userId?.toString() !== uid?.toString() && m.isStudying)
                  .map(m => <MemberCard key={m.userId} member={m} isCurrentUser={false} currentElapsed={0} />)}
                {/* You */}
                <MemberCard member={{ userId: uid, displayName, isStudying: true }}
                  isCurrentUser={true} currentElapsed={elapsed} />
                {/* Idle members */}
                {tickedMembers
                  .filter(m => m.userId?.toString() !== uid?.toString() && !m.isStudying)
                  .map(m => <MemberCard key={m.userId} member={m} isCurrentUser={false} currentElapsed={0} />)}
              </div>
            ) : (
              /* ── Leaderboard list ── */
              <div className="flex flex-col gap-1">
                {allMembers.map((m, i) => {
                  const isSelf = m.userId?.toString() === uid?.toString();
                  return (
                    <LeaderboardRow key={m.userId || i}
                      member={m} rank={i + 1}
                      isCurrentUser={isSelf}
                      currentElapsed={isSelf ? elapsed : 0} />
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Bottom controls ── */}
      <div className="relative z-10 flex-shrink-0 px-4 pb-5 pt-2">
        <div className="flex items-stretch gap-2.5 w-full max-w-md mx-auto">
          {/* Stop */}
          <button onClick={handleStop}
            className="flex-1 flex items-center justify-center gap-1.5 py-3 rounded-2xl transition-all active:scale-95"
            style={{ backgroundColor: '#1e0f18', border: '1.5px solid #6b1c3844' }}>
            <div className="w-7 h-7 rounded-full bg-red-900/50 border border-red-700/40
                            flex items-center justify-center">
              <i className="ti ti-square-filled text-xs text-red-400" />
            </div>
            <span className="text-sm font-semibold text-red-400">Stop</span>
          </button>

          {/* Pause/Resume — widest */}
          <button onClick={isPaused ? resume : pause}
            className="flex-[1.4] flex items-center justify-center gap-2 py-3 rounded-2xl transition-all active:scale-95"
            style={{ backgroundColor: color + '22', border: `1.5px solid ${color}55` }}>
            <div className="w-8 h-8 rounded-full flex items-center justify-center"
              style={{ backgroundColor: color, boxShadow: `0 3px 14px ${color}55` }}>
              <i className={`ti ${isPaused ? 'ti-player-play-filled' : 'ti-player-pause-filled'} text-base text-white`} />
            </div>
            <span className="text-sm font-bold" style={{ color }}>
              {isPaused ? 'Resume' : 'Pause'}
            </span>
          </button>

          {/* Switch */}
          <button onClick={() => navigate('/')}
            className="flex-1 flex items-center justify-center gap-1.5 py-3 rounded-2xl
                       bg-[#111d30]/60 border border-[#2a3a55]/50 transition-all active:scale-95">
            <div className="w-7 h-7 rounded-full bg-[#1a2d4a]/60 border border-[#2a3a55]/40
                            flex items-center justify-center">
              <i className="ti ti-switch-horizontal text-xs text-[#60a5fa]" />
            </div>
            <span className="text-sm font-semibold text-[#60a5fa]">Switch</span>
          </button>
        </div>

        <p className="text-center text-slate-700 text-[10px] mt-2">
          🌿 Stay focused. Great things take time.
        </p>
      </div>
    </div>
  );
}