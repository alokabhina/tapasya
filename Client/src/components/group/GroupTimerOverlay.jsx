// src/components/group/GroupTimerOverlay.jsx
// Redesigned to match Image 1 reference — desktop/tablet group timer view

import { useState, useEffect, useRef } from 'react';
import useTimerStore from '../../store/timerStore';
import useUserStore from '../../store/userStore';
import useSubjectStore from '../../store/subjectStore';
import { useTimer } from '../../hooks/useTimer';
import { fetchGroupMembers, fetchMyGroups } from '../../api/groups';
import { formatDuration, formatHours } from '../../utils/time';
import { useNavigate } from 'react-router-dom';

// ── Circular ring timer ───────────────────────────────────────────────────────
function CircularTimer({ elapsed, color = '#f97316', size = 220 }) {
  const cx = size / 2;
  const cy = size / 2;
  const radius = size * 0.42;
  const circumference = 2 * Math.PI * radius;
  const THIRTY_MIN = 30 * 60;
  const progress = (elapsed % THIRTY_MIN) / THIRTY_MIN;
  const dashOffset = circumference * (1 - progress);

  const angle = progress * 360 - 90;
  const dotX = cx + radius * Math.cos((angle * Math.PI) / 180);
  const dotY = cy + radius * Math.sin((angle * Math.PI) / 180);

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="block">
        {/* Track */}
        <circle cx={cx} cy={cy} r={radius} fill="none" stroke="#1a2535" strokeWidth={9} />
        {/* Progress */}
        {elapsed > 0 && (
          <circle
            cx={cx} cy={cy} r={radius}
            fill="none" stroke={color} strokeWidth={9}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            transform={`rotate(-90 ${cx} ${cy})`}
            style={{ transition: 'stroke-dashoffset 1s linear', filter: `drop-shadow(0 0 8px ${color}99)` }}
          />
        )}
        {/* Tip dot */}
        {elapsed > 2 && (
          <circle cx={dotX} cy={dotY} r={6} fill="white"
            style={{ filter: `drop-shadow(0 0 5px ${color})` }} />
        )}
      </svg>

      {/* Center content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center select-none gap-0.5">
        {/* Plant */}
        <svg viewBox="0 0 80 80" width="54" height="54">
          <ellipse cx="40" cy="66" rx="20" ry="6" fill="#5c3a1e" opacity="0.8" />
          <ellipse cx="40" cy="64" rx="16" ry="4" fill="#7c4a2a" />
          <path d="M40 64 Q40 50 40 38" stroke="#5a7a2a" strokeWidth="3" fill="none" strokeLinecap="round" />
          <path d="M40 52 Q28 44 24 32 Q32 34 40 46" fill="#4a7c2a" opacity="0.9" />
          <path d="M40 48 Q52 40 56 28 Q48 30 40 42" fill="#5a9034" opacity="0.85" />
          <path d="M40 38 Q34 30 36 22 Q42 28 40 38" fill="#6aaa3a" opacity="0.9" />
          <circle cx="22" cy="46" r="2" fill="#7bc946" opacity="0.7" />
          <circle cx="58" cy="42" r="1.5" fill="#7bc946" opacity="0.6" />
        </svg>

        {/* Timer */}
        <p className="font-bold text-white leading-none"
          style={{ fontSize: '2rem', fontFamily: 'ui-monospace, monospace', textShadow: `0 0 20px ${color}40` }}>
          {formatDuration(elapsed)}
        </p>

        {/* Keep going label */}
        <div className="flex items-center gap-1 text-slate-400 text-[11px] mt-0.5">
          <i className="ti ti-clock text-[10px]" />
          <span>Keep going!</span>
        </div>
      </div>
    </div>
  );
}

// ── Member card — desk SVG preserved exactly ─────────────────────────────────
function MemberCard({ member, isCurrentUser, currentElapsed }) {
  const isStudying = isCurrentUser || member.isStudying || false;
  const displayTime = isCurrentUser
    ? formatDuration(currentElapsed)
    : formatDuration(member.liveElapsed || 0);
  const name = isCurrentUser ? 'You' : (member.displayName?.split(' ')[0] || 'Member');

  return (
    <div
      className={`flex flex-col items-center gap-1.5 p-3 rounded-2xl border transition-all`}
      style={{
        minWidth: 90,
        borderColor: isStudying ? '#f9731655' : '#334155',
        backgroundColor: isStudying ? '#f9731610' : '#0f1c2e',
      }}
    >
      <div className="relative">
        {isStudying ? (
          <div className="w-14 h-14 flex items-center justify-center">
            {/* Studying desk SVG — kept exactly as original */}
            <svg viewBox="0 0 60 48" className="w-14 h-12" fill="none">
              <circle cx="20" cy="8" r="6" stroke="#f97316" strokeWidth="2.5" fill="none" />
              <path d="M20 14 L20 26" stroke="#f97316" strokeWidth="2.5" strokeLinecap="round" />
              <path d="M12 20 L20 20 L28 20" stroke="#f97316" strokeWidth="2.5" strokeLinecap="round" />
              <rect x="6" y="28" width="36" height="3" rx="1.5" stroke="#f97316" strokeWidth="2" fill="none" />
              <line x1="10" y1="31" x2="10" y2="44" stroke="#f97316" strokeWidth="2" strokeLinecap="round" />
              <line x1="38" y1="31" x2="38" y2="44" stroke="#f97316" strokeWidth="2" strokeLinecap="round" />
              <line x1="42" y1="28" x2="42" y2="16" stroke="#f97316" strokeWidth="2" strokeLinecap="round" />
              <line x1="36" y1="16" x2="48" y2="16" stroke="#f97316" strokeWidth="2" strokeLinecap="round" />
              <line x1="38" y1="16" x2="34" y2="22" stroke="#f97316" strokeWidth="1.5" strokeLinecap="round" />
              <line x1="46" y1="16" x2="50" y2="22" stroke="#f97316" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </div>
        ) : (
          <div className="w-14 h-14 flex items-center justify-center opacity-30">
            {/* Idle desk SVG — kept exactly as original */}
            <svg viewBox="0 0 60 48" className="w-14 h-12" fill="none">
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
          <span className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-green-400 rounded-full border-2 border-[#0a1628] animate-pulse" />
        )}
      </div>

      <p className={`text-xs font-semibold truncate text-center w-full`}
        style={{ color: isStudying ? '#fb923c' : '#64748b', maxWidth: 80 }}>
        {name}
      </p>
      <p className={`text-xs font-mono font-bold`}
        style={{ color: isStudying ? 'white' : '#475569' }}>
        {displayTime}
      </p>
    </div>
  );
}

// ── Main GroupTimerOverlay ────────────────────────────────────────────────────
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

  const [groups, setGroups]   = useState([]);
  const [activeGroup, setActiveGroup] = useState(null);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [studyingCount, setStudyingCount] = useState(0);
  const pollRef = useRef(null);

  useEffect(() => {
    loadGroups();
    return () => clearInterval(pollRef.current);
  }, []);

  useEffect(() => {
    clearInterval(pollRef.current);
    if (!activeGroup?._id) return;
    pollMembers();
    pollRef.current = setInterval(pollMembers, 5000);
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
      const now = Date.now();
      const enriched = data.map((m) => ({
        ...m,
        isStudying: m.isStudying || (m.lastActiveAt && (now - new Date(m.lastActiveAt).getTime()) < 10 * 60 * 1000),
        liveElapsed: m.liveElapsed || m.todaySeconds || 0,
      }));
      setMembers(enriched);
      setStudyingCount(enriched.filter(m => m.userId?.toString() !== uid?.toString() && m.isStudying).length);
    } catch (e) { console.error(e); }
  }

  const todayBase  = subjects.reduce((sum, s) => sum + (s.todaySeconds || 0), 0);
  const todayTotal = todayBase + elapsed;
  const color      = subjectColor || '#f97316';
  const pct        = dailyGoalSeconds > 0 ? Math.min((todayTotal / dailyGoalSeconds) * 100, 100) : 0;
  const statusText = isPaused ? 'Paused' : isRunning ? 'Focusing' : 'Ready';

  async function handleStop() { await stop(); navigate('/'); }

  return (
    <div className="fixed inset-0 z-[200] flex flex-col overflow-hidden"
      style={{ background: 'linear-gradient(160deg, #0d1b2e 0%, #080d16 55%, #090e1c 100%)' }}
    >
      {/* Ambient glow */}
      <div className="absolute inset-0 pointer-events-none"
        style={{ background: `radial-gradient(ellipse 70% 55% at 50% 35%, ${color}0d 0%, transparent 65%)` }} />

      {/* ── Top bar ── */}
      <div className="relative z-10 flex items-center justify-between px-5 pt-5 pb-3 flex-shrink-0">
        {/* Back */}
        <button
          onClick={onClose}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-slate-800/60 border border-slate-700/40 text-slate-300 hover:text-white text-sm font-medium transition-all"
        >
          <i className="ti ti-arrow-left text-sm" />
          Back
        </button>

        {/* Subject + status */}
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full animate-pulse"
            style={{ backgroundColor: isPaused ? '#94a3b8' : color }} />
          <span className="text-white font-bold text-sm">{subjectName || 'Study Session'}</span>
          <span className="text-slate-500 text-xs">{statusText}</span>
        </div>

        {/* Group button */}
        <div className="relative flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-[#1a2540]/80 border border-[#2a3a5a] text-sm font-semibold text-[#60a5fa]">
          <i className="ti ti-users text-sm" />
          Group
          <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-green-400 rounded-full border-2 border-[#080d16] animate-pulse" />
        </div>
      </div>

      {/* ── Subject pills ── */}
      {groups.length > 1 && (
        <div className="relative z-10 flex gap-2 px-5 pb-3 overflow-x-auto scrollbar-none flex-shrink-0">
          {groups.map((g) => (
            <button
              key={g._id}
              onClick={() => setActiveGroup(g)}
              className={`flex-shrink-0 flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-semibold transition-all`}
              style={
                activeGroup?._id === g._id
                  ? { backgroundColor: color, color: 'white' }
                  : { backgroundColor: '#1a2535', color: '#94a3b8', border: '1px solid #2a3a55' }
              }
            >
              <i className="ti ti-bolt text-[10px]" />
              {g.name}
            </button>
          ))}
        </div>
      )}

      {/* ── Main content ── */}
      <div className="relative z-10 flex-1 overflow-y-auto px-5 flex flex-col items-center">

        {/* ── Three-column layout: left stats | ring | right goal ── */}
        <div className="w-full flex items-center justify-center gap-4 mb-4">

          {/* Left stats */}
          <div className="flex flex-col gap-3 min-w-[110px]">
            <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-0.5">Total Time Today</p>
              <p className="font-bold text-lg font-mono leading-none" style={{ color }}>
                {formatDuration(todayTotal)}
              </p>
            </div>
            <div>
              <p className="text-[10px] text-slate-600 uppercase tracking-widest mb-0.5">Focusing Time</p>
              <p className="font-bold text-base font-mono" style={{ color }}>
                {formatDuration(elapsed)}
              </p>
            </div>
          </div>

          {/* Center ring */}
          <CircularTimer elapsed={elapsed} color={color} size={220} />

          {/* Right goal */}
          <div className="flex flex-col gap-2 min-w-[110px]">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Daily Goal</p>
            {dailyGoalSeconds > 0 ? (
              <>
                <div className="flex items-baseline gap-1">
                  <span className="text-lg font-bold" style={{ color }}>{formatHours(todayTotal)}</span>
                  <span className="text-slate-400 text-sm">of {formatHours(dailyGoalSeconds)}</span>
                </div>
                <div className="relative h-2 bg-slate-800 rounded-full w-full">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${Math.max(pct, 0.5)}%`, backgroundColor: color,
                      boxShadow: `0 0 6px ${color}60` }}
                  />
                  <div
                    className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full border-2 border-[#0a1220]"
                    style={{ left: `calc(${Math.max(pct, 0.5)}% - 6px)`, backgroundColor: color }}
                  />
                </div>
                <p className="text-[11px] text-slate-600">{Math.round(pct)}%</p>
              </>
            ) : (
              <p className="text-xs text-slate-600">Set in Settings</p>
            )}
          </div>
        </div>

        {/* ── Members section ── */}
        {loading ? (
          <div className="flex flex-col items-center py-8 gap-3">
            <div className="w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-slate-600 text-xs">Loading group...</p>
          </div>
        ) : groups.length === 0 ? (
          <div className="flex flex-col items-center py-8 gap-3 text-center">
            <i className="ti ti-users text-3xl text-slate-700" />
            <p className="text-slate-500 text-sm">No group joined yet</p>
            <p className="text-slate-600 text-xs">Join a Study Group to study together</p>
          </div>
        ) : (
          <div className="w-full">
            {/* Divider with count */}
            <div className="flex items-center gap-3 mb-3">
              <div className="flex-1 h-px bg-slate-800" />
              <div className="flex items-center gap-1.5 text-xs text-slate-400">
                <span className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-pulse" />
                <span className="font-semibold">{studyingCount + 1} member{studyingCount + 1 !== 1 ? 's' : ''} studying</span>
                <span className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-pulse" />
              </div>
              <div className="flex-1 h-px bg-slate-800" />
            </div>

            {/* Member cards */}
            <div className="flex flex-wrap gap-3 justify-center">
              {/* Other members first (non-studying) */}
              {members
                .filter((m) => m.userId?.toString() !== uid?.toString() && !m.isStudying)
                .map((m) => (
                  <MemberCard key={m.userId} member={m} isCurrentUser={false} currentElapsed={0} />
                ))
              }

              {/* Studying other members */}
              {members
                .filter((m) => m.userId?.toString() !== uid?.toString() && m.isStudying)
                .map((m) => (
                  <MemberCard key={m.userId} member={m} isCurrentUser={false} currentElapsed={0} />
                ))
              }

              {/* Current user always last */}
              <MemberCard
                key="self"
                member={{ userId: uid, displayName, isStudying: true }}
                isCurrentUser={true}
                currentElapsed={elapsed}
              />
            </div>
          </div>
        )}

        <div className="h-4" />
      </div>

      {/* ── Bottom action buttons (pill style like Image 1) ── */}
      <div className="relative z-10 flex-shrink-0 px-5 pb-6 pt-2 flex flex-col items-center gap-3">
        <div className="flex items-stretch gap-3 w-full max-w-md">

          {/* Stop */}
          <button
            onClick={handleStop}
            className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl transition-all active:scale-95"
            style={{ backgroundColor: '#1e0f18', border: '1.5px solid #6b1c3844' }}
          >
            <div className="w-8 h-8 rounded-full bg-red-900/50 border border-red-700/40 flex items-center justify-center">
              <i className="ti ti-square-filled text-sm text-red-400" />
            </div>
            <span className="text-sm font-semibold text-red-400">Stop</span>
          </button>

          {/* Pause — wide center */}
          <button
            onClick={isPaused ? resume : pause}
            className="flex-[1.4] flex items-center justify-center gap-2 py-3.5 rounded-2xl transition-all active:scale-95"
            style={{ backgroundColor: color + '22', border: `1.5px solid ${color}55` }}
          >
            <div className="w-9 h-9 rounded-full flex items-center justify-center"
              style={{ backgroundColor: color, boxShadow: `0 3px 14px ${color}55` }}>
              <i className={`ti ${isPaused ? 'ti-player-play-filled' : 'ti-player-pause-filled'} text-lg text-white`} />
            </div>
            <span className="text-sm font-bold" style={{ color }}>{isPaused ? 'Resume' : 'Pause'}</span>
          </button>

          {/* Switch */}
          <button
            onClick={() => navigate('/')}
            className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-[#111d30]/60 border border-[#2a3a55]/50 transition-all active:scale-95"
          >
            <div className="w-8 h-8 rounded-full bg-[#1a2d4a]/60 border border-[#2a3a55]/40 flex items-center justify-center">
              <i className="ti ti-switch-horizontal text-sm text-[#60a5fa]" />
            </div>
            <span className="text-sm font-semibold text-[#60a5fa]">Switch</span>
          </button>
        </div>

        {/* Footer */}
        <div className="flex items-center gap-2 text-slate-600 text-[11px]">
          <span>🌿</span>
          <span>Stay focused. Great things takes time.</span>
        </div>
      </div>
    </div>
  );
}