// src/pages/Home.jsx — Full redesign with connected Focus Mode, real notifications,
// aesthetic card backgrounds, compact subject grid

import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import useSubjectStore from '@/store/subjectStore';
import useUserStore from '@/store/userStore';
import useTimerStore from '@/store/timerStore';
import { useTimer } from '@/hooks/useTimer';
import { formatDuration, formatHours, getStudyDayString } from '@/utils/time';
import { getSubjects, addSubject, updateSubject, deleteSubject } from '@/api/subjects';
import { getTodos, updateTodo } from '@/api/todos';
import { getSessions } from '@/api/sessions';
import ColorPicker from '@/components/ui/ColorPicker';
import { saveFocusSession } from '@/utils/focusHistory';
import { checkCrossDeviceConflict } from '@/hooks/useCrossDeviceGuard';
import { useSmartNotifications } from '@/hooks/useSmartNotifications';
import ExamCountdown, { ExamCountdownMobile, useExams } from '@/components/home/ExamCountdown';
import BreakReminderChip from '@/components/home/BreakReminderChip';
import BreakLogButton from '@/components/home/BreakLogButton';
import GoalRing from '@/components/home/GoalRing';
import TodoRing from '@/components/home/TodoRing';
import { fetchWordOfDay } from '@/api/Vocab';
import { useBadges } from '@/hooks/useBadges';
import { getBadgeProgress, getBadgeById } from '@/utils/badges';

// ── Aesthetic background styles for cards ─────────────────────────────────────
const CARD_BACKGROUNDS = [
  'linear-gradient(135deg, #1a0533 0%, #0d1a35 50%, #0a1628 100%)',
  'linear-gradient(135deg, #071a2e 0%, #0f2744 50%, #071a2e 100%)',
  'linear-gradient(135deg, #0a1a0a 0%, #0d2b1a 50%, #091509 100%)',
  'linear-gradient(135deg, #1a100a 0%, #2b1a0d 50%, #150d09 100%)',
];

// Study time card - deep space gradient
const TIMER_BG = `
  radial-gradient(ellipse at 80% 20%, rgba(124,58,237,0.25) 0%, transparent 50%),
  radial-gradient(ellipse at 20% 80%, rgba(249,115,22,0.15) 0%, transparent 50%),
  linear-gradient(135deg, #0f0c29 0%, #0d1a35 50%, #0a1628 100%)
`;

// ── Motivational quotes ───────────────────────────────────────────────────────
const QUOTES = [
  { text: 'Discipline today, success tomorrow.', author: 'Your future self' },
  { text: 'Small step every day lead to big results.', author: 'Your future self' },
  { text: 'The expert was once a beginner who never quit.', author: 'Your future self' },
  { text: 'Every hour invested is an hour closer to your goal.', author: 'Your future self' },
  { text: 'Success is the sum of small efforts repeated daily.', author: 'Your future self' },
];

function getTodayQuote() {
  return QUOTES[new Date().getDate() % QUOTES.length];
}

// ── Notification Panel ────────────────────────────────────────────────────────
function NotificationPanel({ onClose, streakDays, todayTotal, dailyGoalSeconds, subjects, todos }) {
  const goalPct = dailyGoalSeconds > 0 ? (todayTotal / dailyGoalSeconds) * 100 : 0;

  // Build a rich pool of varied notifications (priority-ordered)
  const pool = [];

  // Goal / streak
  if (streakDays >= 7)
    pool.push({ icon: 'ti-flame', color: 'text-orange-400', bg: 'bg-orange-500/10', text: `🔥 ${streakDays}-day streak! You're on fire — keep it up!` });
  else if (streakDays > 0)
    pool.push({ icon: 'ti-flame', color: 'text-orange-400', bg: 'bg-orange-500/10', text: `${streakDays}-day streak active. Don't break it today!` });

  if (goalPct >= 100)
    pool.push({ icon: 'ti-trophy', color: 'text-yellow-400', bg: 'bg-yellow-500/10', text: '🏆 Daily goal completed! Amazing work today.' });
  else if (goalPct >= 75)
    pool.push({ icon: 'ti-target', color: 'text-green-400', bg: 'bg-green-500/10', text: `Almost there! ${Math.round(goalPct)}% of your daily goal done.` });
  else if (goalPct >= 50)
    pool.push({ icon: 'ti-target', color: 'text-green-400', bg: 'bg-green-500/10', text: `Halfway there! ${Math.round(goalPct)}% of daily goal done.` });
  else if (goalPct > 0)
    pool.push({ icon: 'ti-clock', color: 'text-blue-400', bg: 'bg-blue-500/10', text: `${Math.round(goalPct)}% of goal done. Keep the momentum!` });
  else
    pool.push({ icon: 'ti-alarm', color: 'text-purple-400', bg: 'bg-purple-500/10', text: "You haven't studied yet today. Start now!" });

  // Todo reminders
  const pendingTodos = (todos || []).filter(t => !t.done);
  if (pendingTodos.length > 0)
    pool.push({ icon: 'ti-checkbox', color: 'text-purple-400', bg: 'bg-purple-500/10', text: `📋 ${pendingTodos.length} pending task${pendingTodos.length > 1 ? 's' : ''} for today. Stay on track!` });
  if (pendingTodos.length > 0 && pendingTodos[0]?.text)
    pool.push({ icon: 'ti-point', color: 'text-slate-300', bg: 'bg-slate-700/30', text: `Next: "${pendingTodos[0].text}"` });

  // Subject reminders
  if (subjects.length === 0)
    pool.push({ icon: 'ti-books', color: 'text-blue-400', bg: 'bg-blue-500/10', text: 'Add your first subject to start tracking study time.' });
  else {
    const untouched = subjects.filter(s => (s.todaySeconds || 0) === 0);
    if (untouched.length > 0)
      pool.push({ icon: 'ti-books', color: 'text-blue-400', bg: 'bg-blue-500/10', text: `${untouched.length} subject${untouched.length > 1 ? 's' : ''} not started today. Begin with "${untouched[0].name}"!` });
  }

  // Rotating motivational quote (changes every hour)
  const motivational = [
    { icon: 'ti-bulb', color: 'text-yellow-400', bg: 'bg-yellow-500/10', text: '"Discipline is doing what needs to be done, even when you don\'t feel like it."' },
    { icon: 'ti-rocket', color: 'text-purple-400', bg: 'bg-purple-500/10', text: '"Every expert was once a beginner. Keep going!"' },
    { icon: 'ti-heart', color: 'text-pink-400', bg: 'bg-pink-500/10', text: '"Small daily improvements over time lead to stunning results."' },
    { icon: 'ti-star', color: 'text-yellow-400', bg: 'bg-yellow-500/10', text: '"The secret of getting ahead is getting started."' },
    { icon: 'ti-brain', color: 'text-green-400', bg: 'bg-green-500/10', text: '"Focused deep work is your superpower in a distracted world."' },
  ];
  pool.push(motivational[new Date().getHours() % motivational.length]);

  const shown = pool.slice(0, 3);

  return (
    <div className="absolute top-full right-0 mt-2 w-80 bg-[#141d2e] border border-slate-700 rounded-2xl shadow-2xl z-50 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
        <h3 className="text-white font-semibold text-sm">Notifications</h3>
        <button onClick={onClose} className="text-slate-500 hover:text-white">
          <i className="ti ti-x text-sm" />
        </button>
      </div>
      <div className="p-2 space-y-1 max-h-72 overflow-y-auto">
        {shown.map((n, i) => (
          <div key={i} className={`flex items-start gap-3 p-3 rounded-xl ${n.bg}`}>
            <i className={`ti ${n.icon} ${n.color} text-base flex-shrink-0 mt-0.5`} />
            <p className="text-slate-300 text-xs leading-relaxed">{n.text}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Mini Calendar ─────────────────────────────────────────────────────────────
function MiniCalendar() {
  const today = new Date();
  const year  = today.getFullYear();
  const month = today.getMonth();
  const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  const dayNames   = ['S','M','T','W','T','F','S'];
  const firstDay   = new Date(year, month, 1).getDay();
  const daysInMonth= new Date(year, month + 1, 0).getDate();
  const cells      = Array.from({ length: firstDay + daysInMonth }, (_, i) => i < firstDay ? null : i - firstDay + 1);

  return (
    <div className="bg-[#141d2e] rounded-2xl p-4 border border-slate-800">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-white font-semibold text-sm">{monthNames[month]} {year}</h3>
      </div>
      <div className="grid grid-cols-7 mb-1">
        {dayNames.map((d, i) => (
          <div key={i} className="text-center text-[10px] text-slate-500 font-medium py-1">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-y-0.5">
        {cells.map((day, i) => (
          <div key={i} className="flex items-center justify-center h-7">
            {day && (
              <span className={`w-6 h-6 flex items-center justify-center rounded-full text-[11px] font-medium
                ${day === today.getDate() ? 'bg-purple-500 text-white font-bold' : 'text-slate-400 hover:text-white hover:bg-slate-700'}`}>
                {day}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Focus Mode (Pomodoro — connected to study context) ────────────────────────
const POMO_WORK  = 25 * 60;
const POMO_SHORT =  5 * 60;
const POMO_LONG  = 15 * 60;
const POMO_KEY   = "tapasya_pomo_today";

function loadPomoState() {
  try {
    const raw = localStorage.getItem(POMO_KEY);
    if (!raw) return { date: '', sessions: 0 };
    return JSON.parse(raw);
  } catch { return { date: '', sessions: 0 }; }
}

// ── Fullscreen Focus Overlay ──────────────────────────────────────────────────
function FocusFullscreen({ phase, remaining, duration, sessions, onStop }) {
  const mins = Math.floor(remaining / 60).toString().padStart(2, '0');
  const secs = (remaining % 60).toString().padStart(2, '0');
  const pct  = ((duration - remaining) / duration) * 100;
  const r    = 90; const circ = 2 * Math.PI * r;

  const phaseLabel = phase === 'work' ? 'Focus Time' : phase === 'short' ? 'Short Break' : 'Long Break';
  const phaseColor = phase === 'work' ? '#a855f7' : phase === 'short' ? '#22c55e' : '#3b82f6';
  const phaseEmoji = phase === 'work' ? '🎯' : phase === 'short' ? '☕' : '🌙';

  // Motivational reading-mode messages
  const messages = phase === 'work'
    ? ["Stay focused. You're doing great.", "Deep work happening. Keep going!", "Every minute counts. Stay in the zone."]
    : ["Take a breath. You've earned it.", "Rest your eyes. Stretch a little.", "Recharge — the next session awaits."];
  const msg = messages[sessions % messages.length];

  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[#080f1a]"
      style={{ background: 'radial-gradient(ellipse at 50% 30%, rgba(124,58,237,0.15) 0%, transparent 60%), #080f1a' }}>

      {/* Ambient glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full opacity-10 blur-3xl"
          style={{ backgroundColor: phaseColor }} />
      </div>

      {/* Header bar */}
      <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="w-2 h-2 rounded-full transition-all" style={{ backgroundColor: i < (sessions % 4) ? phaseColor : '#1e293b' }} />
            ))}
          </div>
          <span className="text-slate-500 text-xs">{sessions} session{sessions !== 1 ? 's' : ''} completed</span>
        </div>
        <button onClick={onStop}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition-colors text-sm font-medium">
          <i className="ti ti-square text-xs" /> Stop Session
        </button>
      </div>

      {/* Main circle timer */}
      <div className="relative flex items-center justify-center mb-8">
        <svg className="-rotate-90" width="240" height="240" viewBox="0 0 240 240">
          <circle cx="120" cy="120" r={r} fill="none" stroke="#1e293b" strokeWidth="12" />
          <circle cx="120" cy="120" r={r} fill="none"
            stroke={phaseColor} strokeWidth="12" strokeLinecap="round"
            strokeDasharray={circ} strokeDashoffset={circ - (pct / 100) * circ}
            style={{ transition: 'stroke-dashoffset 1s linear', filter: `drop-shadow(0 0 12px ${phaseColor}66)` }} />
        </svg>
        <div className="absolute flex flex-col items-center">
          <span className="text-6xl font-bold text-white font-mono tracking-tight">{mins}:{secs}</span>
          <span className="text-sm mt-1 font-medium" style={{ color: phaseColor }}>{phaseLabel}</span>
          <span className="text-2xl mt-1">{phaseEmoji}</span>
        </div>
      </div>

      {/* Message */}
      <p className="text-slate-400 text-base text-center max-w-xs leading-relaxed mb-2">{msg}</p>
      <p className="text-slate-600 text-xs text-center">Back button = session stops and is counted</p>
    </div>
  );
}

function FocusMode({ subjects }) {
  const today = getStudyDayString();
  const pomoState = loadPomoState();
  const [sessions, setSessions] = useState(pomoState.date === today ? pomoState.sessions : 0);

  const [phase,      setPhase]      = useState('work');
  const [remaining,  setRemaining]  = useState(POMO_WORK);
  const [running,    setRunning]    = useState(false);
  const [customMin,  setCustomMin]  = useState(25);
  const [showCustom, setShowCustom] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  // ✅ FIX: use a trigger state instead of calling handler inside setState updater
  const [phaseEnded, setPhaseEnded] = useState(false);

  const intervalRef     = useRef(null);
  const sessionStartRef = useRef(null);
  // ✅ FIX: keep always-fresh refs for values used inside setInterval closure
  const phaseRef      = useRef(phase);
  const sessionsRef   = useRef(sessions);
  const showCustomRef = useRef(showCustom);
  const customMinRef  = useRef(customMin);

  // Keep refs in sync with state
  useEffect(() => { phaseRef.current    = phase;     }, [phase]);
  useEffect(() => { sessionsRef.current = sessions;  }, [sessions]);
  useEffect(() => { showCustomRef.current = showCustom; }, [showCustom]);
  useEffect(() => { customMinRef.current  = customMin;  }, [customMin]);

  const duration = phase === 'work' ? (showCustom ? customMin * 60 : POMO_WORK) : phase === 'short' ? POMO_SHORT : POMO_LONG;
  const pct  = ((duration - remaining) / duration) * 100;
  const r    = 40; const circ = 2 * Math.PI * r;

  // ✅ FIX: timer only sets remaining and fires trigger — no stale closures
  useEffect(() => {
    if (!running) { clearInterval(intervalRef.current); return; }
    intervalRef.current = setInterval(() => {
      setRemaining((r) => {
        if (r <= 1) {
          clearInterval(intervalRef.current);
          setRunning(false);
          setPhaseEnded(true); // trigger phase-end effect
          return 0;
        }
        return r - 1;
      });
    }, 1000);
    return () => clearInterval(intervalRef.current);
  }, [running, phase]);

  // ✅ FIX: handle phase end via effect — reads always-fresh refs, not stale closure values
  useEffect(() => {
    if (!phaseEnded) return;
    setPhaseEnded(false);

    const currentPhase    = phaseRef.current;
    const currentSessions = sessionsRef.current;
    const dur = currentPhase === 'work'
      ? (showCustomRef.current ? customMinRef.current * 60 : POMO_WORK)
      : currentPhase === 'short' ? POMO_SHORT : POMO_LONG;

    saveFocusSession({ type: currentPhase, durationSeconds: dur, completed: true, startTime: sessionStartRef.current });

    if (currentPhase === 'work') {
      const newSessions = currentSessions + 1;
      setSessions(newSessions);
      localStorage.setItem(POMO_KEY, JSON.stringify({ date: today, sessions: newSessions }));
      const next = newSessions % 4 === 0 ? 'long' : 'short';
      setPhase(next);
      sessionStartRef.current = new Date().toISOString();
      setRemaining(next === 'long' ? POMO_LONG : POMO_SHORT);
    } else {
      setPhase('work');
      sessionStartRef.current = new Date().toISOString();
      setRemaining(showCustomRef.current ? customMinRef.current * 60 : POMO_WORK);
    }
  }, [phaseEnded]);

  // Back button: stop and count session
  useEffect(() => {
    if (!fullscreen) return;
    const handleBack = (e) => { e.preventDefault(); handleStop(); };
    window.addEventListener('popstate', handleBack);
    window.history.pushState({ focus: true }, '');
    return () => window.removeEventListener('popstate', handleBack);
  }, [fullscreen]);

  function handleStop() {
    const currentPhase    = phaseRef.current;
    const currentSessions = sessionsRef.current;
    const dur = currentPhase === 'work'
      ? (showCustomRef.current ? customMinRef.current * 60 : POMO_WORK)
      : currentPhase === 'short' ? POMO_SHORT : POMO_LONG;

    // Save partial session if time has elapsed (>30s min enforced in saveFocusSession)
    if (currentPhase === 'work' && remaining < dur) {
      const elapsed = dur - remaining;
      saveFocusSession({ type: 'work', durationSeconds: elapsed, completed: false, startTime: sessionStartRef.current });
      const newSessions = currentSessions + 1;
      setSessions(newSessions);
      localStorage.setItem(POMO_KEY, JSON.stringify({ date: today, sessions: newSessions }));
    } else if (currentPhase !== 'work' && remaining < dur) {
      saveFocusSession({ type: currentPhase, durationSeconds: dur - remaining, completed: false, startTime: sessionStartRef.current });
    }

    clearInterval(intervalRef.current);
    setRunning(false);
    setFullscreen(false);
    setPhase('work');
    sessionStartRef.current = null;
    setRemaining(showCustomRef.current ? customMinRef.current * 60 : POMO_WORK);
  }

  function handleStart() {
    sessionStartRef.current = new Date().toISOString();
    setRunning(true);
    setFullscreen(true);
  }

  function applyCustom() {
    setShowCustom(true);
    setPhase('work');
    setRemaining(customMin * 60);
  }

  const mins = Math.floor(remaining / 60).toString().padStart(2, '0');
  const secs = (remaining % 60).toString().padStart(2, '0');
  const phaseLabel = phase === 'work' ? 'Focus' : phase === 'short' ? 'Short Break' : 'Long Break';
  const phaseColor = phase === 'work' ? '#a855f7' : phase === 'short' ? '#22c55e' : '#3b82f6';

  return (
    <>
      {/* Fullscreen overlay */}
      {fullscreen && running && (
        <FocusFullscreen phase={phase} remaining={remaining} duration={duration} sessions={sessions} onStop={handleStop} />
      )}

      <div className="bg-[#141d2e] rounded-2xl p-4 border border-slate-800">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-md bg-purple-500 flex items-center justify-center">
              <i className="ti ti-clock text-white text-[10px]" />
            </div>
            <h3 className="text-white font-semibold text-sm">Focus Mode</h3>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className={`w-2 h-2 rounded-full ${i < (sessions % 4) ? 'bg-purple-500' : 'bg-slate-700'}`} />
              ))}
            </div>
          </div>
        </div>

        <p className="text-xs text-slate-500 mb-3">
          {phase === 'work' ? `Session ${sessions + 1} · ${sessions} completed today` : `${phaseLabel} — then back to work!`}
        </p>

        {/* Phase selector */}
        <div className="flex gap-1 mb-3">
          {[
            { id: 'work',  label: `Focus (${showCustom ? customMin : 25}m)` },
            { id: 'short', label: 'Short (5m)' },
            { id: 'long',  label: 'Long (15m)' },
          ].map(({ id, label }) => (
            <button key={id}
              onClick={() => { if (!running) { setPhase(id); setRemaining(id === 'work' ? (showCustom ? customMin * 60 : POMO_WORK) : id === 'short' ? POMO_SHORT : POMO_LONG); } }}
              className={`flex-1 text-[10px] py-1 rounded-lg transition-colors ${phase === id ? 'bg-purple-500/30 text-purple-300 border border-purple-500/30' : 'text-slate-500 hover:text-slate-400'}`}>
              {label}
            </button>
          ))}
        </div>

        <div className="flex flex-col items-center py-1">
          <div className="relative w-20 h-20">
            <svg className="w-20 h-20 -rotate-90" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r={r} fill="none" stroke="#1e293b" strokeWidth="10" />
              <circle cx="50" cy="50" r={r} fill="none" stroke={phaseColor} strokeWidth="10" strokeLinecap="round"
                strokeDasharray={circ} strokeDashoffset={circ - (pct / 100) * circ}
                style={{ transition: 'stroke-dashoffset 1s linear' }} />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-white font-bold text-base font-mono">{mins}:{secs}</span>
              <span className="text-[9px]" style={{ color: phaseColor }}>{phaseLabel}</span>
            </div>
          </div>

          <div className="flex gap-2 mt-2">
            {/* Start/Fullscreen — no pause, only start and stop */}
            {!running ? (
              <button onClick={handleStart}
                className="flex items-center gap-1.5 px-3 h-8 rounded-full text-white text-xs font-medium transition-colors"
                style={{ backgroundColor: phaseColor }}>
                <i className="ti ti-player-play text-sm" /> Start
              </button>
            ) : (
              <button onClick={handleStop}
                className="flex items-center gap-1.5 px-3 h-8 rounded-full bg-red-500/20 border border-red-500/30 text-red-400 text-xs font-medium hover:bg-red-500/30 transition-colors">
                <i className="ti ti-square text-xs" /> Stop
              </button>
            )}
            {running && (
              <button onClick={() => setFullscreen(true)}
                className="w-8 h-8 rounded-full bg-slate-700 hover:bg-slate-600 flex items-center justify-center">
                <i className="ti ti-maximize text-slate-300 text-sm" />
              </button>
            )}
          </div>

          {/* Custom duration — only when not running */}
          {!running && (
            <div className="flex items-center gap-2 mt-2 w-full">
              <input type="number" value={customMin} min={1} max={120}
                onChange={(e) => setCustomMin(Math.max(1, Math.min(120, parseInt(e.target.value) || 25)))}
                className="w-14 bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-xs text-white text-center focus:outline-none focus:border-purple-500" />
              <span className="text-slate-500 text-xs">min</span>
              <button onClick={applyCustom} className="text-xs text-purple-400 hover:text-purple-300 transition-colors">Set custom</button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

// ── Subject Modal ─────────────────────────────────────────────────────────────
function SubjectModal({ subject, onClose, onSave }) {
  const [name,   setName]   = useState(subject?.name || '');
  const [color,  setColor]  = useState(subject?.color || '#f97316');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      if (subject?.id || subject?._id)
        await updateSubject(subject.id || subject._id, { name: name.trim(), color });
      else
        await addSubject({ name: name.trim(), color, todaySeconds: 0 });
      onSave();
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end md:items-center justify-center p-4">
      <div className="bg-[#1e293b] rounded-2xl w-full max-w-sm border border-slate-700 shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b border-slate-700">
          <h3 className="font-semibold text-white">{subject?.id || subject?._id ? 'Edit Subject' : 'New Subject'}</h3>
          <button onClick={onClose} className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center hover:bg-slate-700">
            <i className="ti ti-x text-slate-400 text-sm" />
          </button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="text-xs text-slate-400 mb-1.5 block">Subject Name</label>
            <input
              value={name} onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSave()}
              placeholder="e.g. Mathematics, Physics..."
              autoFocus
              className="w-full bg-[#0f172a] border border-slate-700 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-purple-500"
            />
          </div>
          <div>
            <label className="text-xs text-slate-400 mb-2 block">Color</label>
            <ColorPicker value={color} onChange={setColor} />
          </div>
        </div>
        <div className="flex gap-3 p-5 pt-0">
          <button onClick={onClose} className="flex-1 py-3 rounded-xl border border-slate-700 text-sm text-slate-300 hover:bg-slate-700">Cancel</button>
          <button
            onClick={handleSave} disabled={saving || !name.trim()}
            className="flex-1 py-3 rounded-xl bg-purple-500 hover:bg-purple-400 disabled:opacity-50 text-sm font-medium text-white"
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Compact Subject Card ──────────────────────────────────────────────────────
function SubjectCard({ subject, index, onEdit, onDelete, onStart }) {
  const isRunning = useTimerStore((s) => s.isRunning);
  const activeId  = useTimerStore((s) => s.subjectId);
  const isActive  = isRunning && activeId === (subject.id || subject._id);
  const [showMenu, setShowMenu] = useState(false);
  const longPressTimer = useRef(null);

  function handlePressStart() { longPressTimer.current = setTimeout(() => setShowMenu(true), 500); }
  function handlePressEnd()   { clearTimeout(longPressTimer.current); }

  const bg = CARD_BACKGROUNDS[index % CARD_BACKGROUNDS.length];
  const accentColor = subject.color || '#f97316';

  return (
    <div className="relative group">
      <div
        className="rounded-2xl p-3.5 border border-white/10 relative overflow-hidden cursor-pointer transition-all active:scale-95 hover:border-white/20"
        style={{ background: bg }}
        onPointerDown={handlePressStart}
        onPointerUp={handlePressEnd}
        onPointerLeave={handlePressEnd}
        onClick={() => !showMenu && onStart(subject)}
      >
        {/* Glow accent from subject color */}
        <div className="absolute inset-0 opacity-20 rounded-2xl" style={{ background: `radial-gradient(ellipse at 80% 20%, ${accentColor}66 0%, transparent 60%)` }} />

        {/* Active indicator */}
        {isActive && (
          <span className="absolute top-2.5 right-2.5 flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ backgroundColor: accentColor }} />
            <span className="relative inline-flex rounded-full h-2 w-2" style={{ backgroundColor: accentColor }} />
          </span>
        )}

        {/* Three dot menu */}
        {!isActive && (
          <button
            onClick={(e) => { e.stopPropagation(); setShowMenu((v) => !v); }}
            className="absolute top-2.5 right-2.5 w-5 h-5 rounded flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/20"
          >
            <i className="ti ti-dots-vertical text-white/70 text-[10px]" />
          </button>
        )}

        {/* Icon */}
        <div className="w-7 h-7 rounded-lg flex items-center justify-center mb-2.5" style={{ backgroundColor: accentColor + '33', border: `1px solid ${accentColor}44` }}>
          <i className="ti ti-book text-xs" style={{ color: accentColor }} />
        </div>

        <p className="text-white font-semibold text-sm truncate leading-tight">{subject.name}</p>
        <p className="text-white/50 text-xs mt-0.5">{formatHours(subject.todaySeconds || 0)} today</p>

        {/* Thin progress line */}
        <div className="mt-2.5 h-0.5 bg-white/10 rounded-full overflow-hidden">
          <div className="h-full rounded-full" style={{ width: `${Math.min((subject.todaySeconds || 0) / 3600 * 16.67, 100)}%`, backgroundColor: accentColor }} />
        </div>

        <button
          onClick={(e) => { e.stopPropagation(); onStart(subject); }}
          className="mt-2.5 inline-flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-lg border border-white/20 bg-white/5 hover:bg-white/15 transition-colors text-white/80"
        >
          <i className={`ti ${isActive ? 'ti-player-pause' : 'ti-player-play'} text-[10px]`} />
          {isActive ? 'Running' : 'Start Study'}
        </button>
      </div>

      {/* Context menu */}
      {showMenu && (
        <div className="absolute inset-0 z-20 rounded-2xl bg-black/80 flex items-center justify-center gap-3">
          <button onClick={() => { setShowMenu(false); onEdit(subject); }} className="flex flex-col items-center gap-1">
            <div className="w-9 h-9 rounded-full bg-slate-700 flex items-center justify-center"><i className="ti ti-pencil text-white text-sm" /></div>
            <span className="text-[10px] text-white">Edit</span>
          </button>
          <button onClick={() => { setShowMenu(false); onDelete(subject); }} className="flex flex-col items-center gap-1">
            <div className="w-9 h-9 rounded-full bg-red-900/80 flex items-center justify-center"><i className="ti ti-trash text-red-400 text-sm" /></div>
            <span className="text-[10px] text-red-400">Delete</span>
          </button>
          <button onClick={() => setShowMenu(false)} className="flex flex-col items-center gap-1">
            <div className="w-9 h-9 rounded-full bg-slate-600 flex items-center justify-center"><i className="ti ti-x text-white text-sm" /></div>
            <span className="text-[10px] text-white">Cancel</span>
          </button>
        </div>
      )}
    </div>
  );
}

// ── Quick Stats ───────────────────────────────────────────────────────────────
function QuickStatCard({ icon, label, value, iconBg, iconColor }) {
  return (
    <div className="bg-[#141d2e] rounded-2xl p-3.5 border border-slate-800 flex items-center gap-3">
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${iconBg}`}>
        <i className={`ti ${icon} text-base ${iconColor}`} />
      </div>
      <div className="min-w-0">
        <p className="text-white font-semibold text-sm truncate">{value}</p>
        <p className="text-slate-500 text-xs">{label}</p>
      </div>
    </div>
  );
}

// ── Main Home Page ────────────────────────────────────────────────────────────
export default function Home() {
  const { subjects, setSubjects } = useSubjectStore();
  const displayName      = useUserStore((s) => s.displayName);
  const dailyGoalSeconds = useUserStore((s) => s.dailyGoalSeconds);
  const streakDays       = useUserStore((s) => s.streakDays);
  const maxStreakDays    = useUserStore((s) => s.maxStreakDays);
  const totalHoursAllTime = useUserStore((s) => s.totalHoursAllTime);
  const { start, stop }  = useTimer();
  const navigate         = useNavigate();
  const { badges: earnedBadges, getBadgesWithStatus, refetch: refetchBadges } = useBadges();

  // ── Badge teaser: latest earned badge + nearest badge to unlock ──────────
  const latestEarnedBadge = earnedBadges.length
    ? getBadgeById(
        [...earnedBadges].sort(
          (a, b) => new Date(b.unlockedAt || b.createdAt || 0) - new Date(a.unlockedAt || a.createdAt || 0)
        )[0].badgeId
      )
    : null;

  const nextBadgeTeaser = (() => {
    const locked = getBadgesWithStatus().filter((b) => !b.isUnlocked);
    if (!locked.length) return null;
    const userStatsForProgress = { streak: streakDays, maxStreak: maxStreakDays, totalHours: totalHoursAllTime };
    const withProgress = locked.map((b) => ({
      ...b,
      progress: getBadgeProgress(b.id, [], userStatsForProgress),
    }));
    withProgress.sort((a, b) => {
      const pa = a.progress ? a.progress.current / a.progress.target : 0;
      const pb = b.progress ? b.progress.current / b.progress.target : 0;
      return pb - pa; // sabse zyada progress wala (unlock ke sabse paas) sabse pehle
    });
    return withProgress[0];
  })();

  const exams = useExams();
  const [showExamPanel, setShowExamPanel] = useState(false);
  const [modal,         setModal]         = useState(null);
  const [switchWarning, setSwitchWarning] = useState(null);
  const [crossDeviceWarning, setCrossDeviceWarning] = useState(null); // { subjectName, elapsed, isPaused }
  const pendingSubjectRef = useRef(null); // subject waiting after cross-device confirm
  const [todayTodos, setTodayTodos] = useState([]);
  const [showNotif, setShowNotif] = useState(false);
  const [notifRead, setNotifRead] = useState(() => {
    // Read state resets each day
    try {
      const saved = JSON.parse(localStorage.getItem('tapasya_notif_read') || '{}');
      return saved.date === new Date().toDateString() ? saved.read : false;
    } catch { return false; }
  });
  const [refreshing, setRefreshing] = useState(false);
  const notifRef = useRef(null);
  const quote = getTodayQuote();
  const [wordOfDay, setWordOfDay] = useState(null);

  // ── Responsive ring size for the Study Time card (mobile-first) ──────────
  const [ringSize, setRingSize] = useState(() =>
    typeof window !== 'undefined' && window.innerWidth < 380 ? 68
      : typeof window !== 'undefined' && window.innerWidth < 640 ? 78
      : 96
  );
  useEffect(() => {
    const updateRingSize = () => {
      const w = window.innerWidth;
      setRingSize(w < 380 ? 68 : w < 640 ? 78 : 96);
    };
    updateRingSize();
    window.addEventListener('resize', updateRingSize);
    return () => window.removeEventListener('resize', updateRingSize);
  }, []);

  useEffect(() => {
    fetchWordOfDay().then((d) => setWordOfDay(d.word)).catch(() => {});
  }, []);

  const todayTotal = subjects.reduce((sum, s) => sum + (s.todaySeconds || 0), 0);
  const goalPct    = dailyGoalSeconds > 0 ? Math.min((todayTotal / dailyGoalSeconds) * 100, 100) : 0;

  // ── Smart push notifications ──────────────────────────────────────────────
  const pendingTodos = todayTodos.filter((t) => !t.done && !t.completed);
  useSmartNotifications({
    todaySeconds: todayTotal,
    goalSeconds:  dailyGoalSeconds,
    streakDays:   streakDays,
    pendingTodos,
  });

  // Load today's todos
  useEffect(() => {
    const today = getStudyDayString();
    getTodos(today, today)
      .then((data) => setTodayTodos(data))
      .catch(() => {});
  }, []);

  // Re-fetch whenever a todo is added/updated/deleted anywhere in the app —
  // fixes todos added on /todo not showing up here without a full reload.
  useEffect(() => {
    function onTodosChanged() {
      const today = getStudyDayString();
      getTodos(today, today).then(setTodayTodos).catch(() => {});
    }
    window.addEventListener('tapasya:todos-changed', onTodosChanged);
    return () => window.removeEventListener('tapasya:todos-changed', onTodosChanged);
  }, []);

  // Auto-refresh home stats when a timer session is saved
  useEffect(() => {
    function onSessionSaved() {
      // Small delay so DB write completes before we read
      setTimeout(() => reloadSubjects(), 400);
      // Badge unlocking itself happens globally in useBootstrap; here we just
      // re-pull the latest unlocked list so the Home teaser stays current.
      setTimeout(() => refetchBadges(), 1200);
    }
    window.addEventListener('tapasya:session-saved', onSessionSaved);
    return () => window.removeEventListener('tapasya:session-saved', onSessionSaved);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Close notification panel on outside click
  useEffect(() => {
    function handleClick(e) { if (notifRef.current && !notifRef.current.contains(e.target)) setShowNotif(false); }
    if (showNotif) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showNotif]);

  async function reloadSubjects() {
    try {
      setRefreshing(true);
      // getSubjects() and getSessions() are already offline-first —
      // they hit IndexedDB automatically when network is unavailable.
      const [rawSubjects, todaySessions] = await Promise.all([
        getSubjects(),
        getSessions(getStudyDayString(), getStudyDayString()),
      ]);
      const todayMap = {};
      todaySessions.forEach((sess) => {
        const sid = String(sess.subjectId || sess.subject);
        todayMap[sid] = (todayMap[sid] || 0) + (sess.duration || 0);
      });
      const enriched = rawSubjects.map((s) => {
        const sid = String(s._id || s.id);
        return { ...s, id: sid, todaySeconds: todayMap[sid] || 0 };
      });
      setSubjects(enriched);
    } catch (e) {
      // Last resort: load raw subjects from offline store
      try {
        const { getSubjectsOffline, getSessionsOffline } = await import('@/utils/offlineDB');
        const [cachedSubjects, cachedSessions] = await Promise.all([
          getSubjectsOffline(),
          getSessionsOffline(getStudyDayString(), getStudyDayString()),
        ]);
        const todayMap = {};
        cachedSessions.forEach((s) => {
          const sid = String(s.subjectId || s.subject);
          todayMap[sid] = (todayMap[sid] || 0) + (s.duration || 0);
        });
        setSubjects(cachedSubjects.map((s) => ({
          ...s, id: String(s.id), todaySeconds: todayMap[String(s.id)] || s.todaySeconds || 0,
        })));
      } catch (_) { console.error('Reload failed (online + offline):', e); }
    } finally { setRefreshing(false); }
  }

  async function handleStart(subject) {
    const isRunning = useTimerStore.getState().isRunning;
    const isPaused  = useTimerStore.getState().isPaused;
    const activeId  = useTimerStore.getState().subjectId;
    const sid = subject.id || subject._id;

    // Same subject already running/paused → go to timer
    if ((isRunning || isPaused) && activeId === sid) { navigate('/timer'); return; }

    // Different subject running/paused locally → show warning
    if ((isRunning || isPaused) && activeId && activeId !== sid) {
      setSwitchWarning(subject);
      return;
    }

    // Cross-device conflict check — is timer running on another device?
    const conflict = await checkCrossDeviceConflict();
    if (conflict) {
      pendingSubjectRef.current = subject;
      setCrossDeviceWarning(conflict);
      return;
    }

    await start(subject);
    navigate('/timer');
  }

  async function handleConfirmSwitch() {
    const subject = switchWarning;
    setSwitchWarning(null);
    await stop(); // saves current session (elapsed-based, pauses excluded)
    await start(subject);
    navigate('/timer');
  }

  async function handleConfirmCrossDevice() {
    const subject = pendingSubjectRef.current;
    pendingSubjectRef.current = null;
    setCrossDeviceWarning(null);
    if (!subject) return;
    await start(subject);
    navigate('/timer');
  }

  async function handleDelete(subject) {
    const id = subject.id || subject._id;
    if (!confirm(`Delete subject "${subject.name}"?`)) return;
    try { await deleteSubject(id); await reloadSubjects(); } catch (e) { console.error(e); }
  }

  async function toggleTodo(todo) {
    try {
      await updateTodo(todo.id || todo._id, { done: !todo.done });
      setTodayTodos((prev) => prev.map((t) => (t.id || t._id) === (todo.id || todo._id) ? { ...t, done: !t.done } : t));
    } catch (e) { console.error(e); }
  }

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const firstName = displayName?.split(' ')[0] || 'Aspirant';

  // Notification dot: only show when user hasn't opened it today
  const hasAlert = !notifRead && (goalPct < 100 || streakDays > 0 || todayTodos.filter(t => !t.done).length > 0);

  return (
    <div className="min-h-full bg-[#0f172a] flex flex-col xl:flex-row xl:overflow-hidden xl:h-screen">
      {/* ── Main content ── */}
      <div className="flex-1 min-w-0 xl:overflow-y-auto scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
        <div className="p-4 md:p-5 max-w-4xl pb-2 md:pb-5">

          {/* Header */}
          <div className="flex flex-col-reverse sm:flex-row sm:items-start sm:justify-between gap-3 mb-3 sm:mb-4">
            <div className="min-w-0 pl-1.5 pr-1">
              <h1 className="text-[1.7rem] sm:text-3xl font-bold text-white leading-tight tracking-tight">
                {greeting}, {firstName} <span className="inline-block">👋</span>
              </h1>
              <p className="text-slate-400 text-[13px] sm:text-sm mt-1.5 leading-snug tracking-wide">Small steps today, big results tomorrow.</p>
              {/* Mobile Exam Countdown Strip — right below greeting */}
              <div className="xl:hidden mt-2.5">
                <ExamCountdownMobile exams={exams} onOpenPanel={() => setShowExamPanel(true)} />
              </div>
            </div>
            <div className="flex items-center justify-center sm:justify-end gap-3">
            <BreakLogButton />
            <button
              onClick={async () => { await reloadSubjects(); }}
              disabled={refreshing}
              title="Refresh data"
              className="w-9 h-9 rounded-xl bg-[#141d2e] border border-slate-800 flex items-center justify-center text-slate-400 hover:text-white transition-colors disabled:opacity-50"
            >
              <i className={`ti ti-refresh text-base ${refreshing ? 'animate-spin' : ''}`} />
            </button>
            <div className="relative" ref={notifRef}>
              <button
                onClick={() => {
                  setShowNotif((v) => !v);
                  // Mark as read
                  const readState = { date: new Date().toDateString(), read: true };
                  localStorage.setItem('tapasya_notif_read', JSON.stringify(readState));
                  setNotifRead(true);
                }}
                className="relative w-9 h-9 rounded-xl bg-[#141d2e] border border-slate-800 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
              >
                <i className="ti ti-bell text-base" />
                {hasAlert && <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-purple-500 rounded-full border-2 border-[#0f172a]" />}
              </button>
              {showNotif && (
                <NotificationPanel
                  onClose={() => setShowNotif(false)}
                  streakDays={streakDays}
                  todayTotal={todayTotal}
                  dailyGoalSeconds={dailyGoalSeconds}
                  subjects={subjects}
                  todos={todayTodos}
                />
              )}
            </div>
            </div>
          </div>

          {/* Study Time Card — aesthetic background */}
          <div className="relative rounded-2xl mb-5 border border-slate-800/50" style={{ isolation: 'isolate' }}>
            <div className="absolute inset-0 rounded-2xl overflow-hidden" style={{ background: TIMER_BG }} />
            {/* Subtle star-like dots */}
            <div className="absolute inset-0 overflow-hidden">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="absolute w-0.5 h-0.5 bg-white/20 rounded-full"
                  style={{ top: `${10 + i * 11}%`, left: `${5 + i * 12}%` }} />
              ))}
            </div>
            <div className="relative p-4 sm:p-5">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 sm:gap-3">
                <div className="min-w-0 text-center sm:text-left">
                  <p className="text-xs text-slate-400 font-medium uppercase tracking-widest mb-2">Total Study Time Today</p>
                  <p className="text-4xl sm:text-5xl font-bold text-orange-400 font-mono tracking-tight break-all sm:break-normal">{formatDuration(todayTotal)}</p>
                  <p className="text-[11px] text-slate-500 mt-2">
                    Goal: <span className="text-orange-400 font-medium">{formatHours(todayTotal)} / {formatHours(dailyGoalSeconds)}</span>
                  </p>
                </div>
                <div className="flex flex-wrap items-center justify-center sm:justify-end gap-3 sm:gap-3 shrink-0">
                  <BreakReminderChip size={ringSize} />
                  <TodoRing todos={todayTodos} size={ringSize} />
                  <GoalRing todayTotal={todayTotal} dailyGoalSeconds={dailyGoalSeconds} goalPct={goalPct} size={ringSize} />
                </div>
              </div>
            </div>
          </div>

          {/* Subjects */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <i className="ti ti-book text-purple-400" />
              <h2 className="text-white font-semibold">Your Subjects</h2>
            </div>
            <button
              onClick={() => setModal('new')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-500/20 border border-purple-500/30 text-purple-400 hover:bg-purple-500/30 text-xs font-medium transition-colors"
            >
              <i className="ti ti-plus text-xs" /> Add Subject
            </button>
          </div>

          {/* Compact 3-column grid for many subjects */}
          <div className={`grid gap-2.5 mb-5 ${subjects.length > 4 ? 'grid-cols-3' : 'grid-cols-2'}`}>
            {subjects.map((subject, i) => (
              <SubjectCard
                key={subject.id || subject._id}
                subject={subject}
                index={i}
                onStart={handleStart}
                onEdit={(s) => setModal(s)}
                onDelete={handleDelete}
              />
            ))}
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <QuickStatCard icon="ti-clock"    label="Study Time" value={formatDuration(todayTotal)} iconBg="bg-purple-500/15" iconColor="text-purple-400" />
            <QuickStatCard icon="ti-flame"    label="Streak"     value={`${streakDays} day${streakDays !== 1 ? 's' : ''}`} iconBg="bg-orange-500/15" iconColor="text-orange-400" />
            <QuickStatCard icon="ti-target"   label="Goal"       value={`${Math.round(goalPct)}% done`} iconBg="bg-green-500/15" iconColor="text-green-400" />
            <QuickStatCard icon="ti-books"    label="Subjects"   value={`${subjects.length} active`} iconBg="bg-blue-500/15" iconColor="text-blue-400" />
          </div>
        </div>
      </div>

      {/* ── Right panel ── */}
      <div className="flex flex-col w-full xl:w-[290px] xl:flex-shrink-0 border-t xl:border-t-0 xl:border-l border-slate-800 p-4 gap-4 xl:overflow-y-auto xl:h-screen xl:sticky xl:top-0 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent pb-24 xl:pb-4">

        {/* Focus Mode - Pomodoro (FIRST) */}
        <FocusMode subjects={subjects} />

        {/* Exam Countdown */}
        <ExamCountdown />

        {/* Quote */}
        <div className="bg-[#141d2e] rounded-2xl p-4 border border-slate-800">
          <div className="flex gap-2">
            <span className="text-purple-400 text-2xl font-serif leading-none">"</span>
            <div>
              <p className="text-slate-300 text-sm leading-relaxed italic">{quote.text}</p>
              <p className="text-slate-500 text-xs mt-2">— {quote.author}</p>
            </div>
          </div>
        </div>

        {/* Word of the Day */}
        {wordOfDay && (
          <button
            onClick={() => navigate('/vocab')}
            className="text-left bg-[#141d2e] rounded-2xl p-4 border border-slate-800 hover:border-orange-500/30 transition-colors"
          >
            <div className="flex items-center gap-1.5 mb-1.5">
              <i className="ti ti-book-2 text-orange-400 text-sm" />
              <span className="text-[10px] uppercase tracking-wide text-slate-500 font-medium">Word of the Day</span>
            </div>
            <p className="font-serif text-white text-base">{wordOfDay.word}</p>
            <p className="text-slate-400 text-xs mt-1 leading-relaxed">{wordOfDay.meaning}</p>
          </button>
        )}

        {/* Today's Plan */}
        <div className="bg-[#141d2e] rounded-2xl p-4 border border-slate-800">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-md bg-purple-500 flex items-center justify-center">
                <i className="ti ti-check text-white text-[10px]" />
              </div>
              <h3 className="text-white font-semibold text-sm">Today's Plan</h3>
            </div>
            {todayTodos.length > 0 && <span className="text-xs text-slate-500">{todayTodos.filter(t=>t.done).length}/{todayTodos.length}</span>}
          </div>
          {todayTodos.length === 0 ? (
            <div className="text-center py-3">
              <i className="ti ti-clipboard-list text-2xl text-slate-700 block mb-1.5" />
              <p className="text-slate-500 text-xs">No tasks for today</p>
              <button onClick={() => navigate('/todo')} className="mt-1.5 text-xs text-purple-400 hover:text-purple-300">Add tasks →</button>
            </div>
          ) : (
            <div className="space-y-2">
              {todayTodos.slice(0, 6).map((todo) => (
                <button key={todo.id || todo._id} onClick={() => toggleTodo(todo)} className="flex items-center gap-2.5 w-full text-left group">
                  <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors
                    ${todo.done ? 'bg-purple-500 border-purple-500' : 'border-slate-600 group-hover:border-purple-400'}`}>
                    {todo.done && <i className="ti ti-check text-white text-[8px]" />}
                  </div>
                  <span className={`text-xs transition-colors ${todo.done ? 'line-through text-slate-500' : 'text-slate-300'}`}>{todo.text}</span>
                </button>
              ))}
              <button onClick={() => navigate('/todo')} className="flex items-center gap-1 text-xs text-purple-400 hover:text-purple-300 mt-2">
                See All Tasks <i className="ti ti-arrow-right text-[10px]" />
              </button>
            </div>
          )}
        </div>

        {/* Mini Calendar (LAST) */}
        <MiniCalendar />

        {/* Streak */}
        {streakDays > 0 && (
          <div
            className="rounded-2xl p-3.5 border border-orange-500/30 cursor-pointer hover:border-orange-500/50 transition-colors"
            style={{ background: 'linear-gradient(135deg, #7c2d1240, #92400e30)' }}
            onClick={() => navigate('/achievements')}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-orange-500/20 flex items-center justify-center text-xl">🔥</div>
              <div>
                <p className="text-orange-400 font-bold text-lg">{streakDays}</p>
                <p className="text-orange-300/70 text-xs">Current Streak</p>
              </div>
              <i className="ti ti-chevron-right text-orange-400/50 ml-auto" />
            </div>
          </div>
        )}

        {/* Badges teaser — latest earned + next to unlock */}
        {(latestEarnedBadge || nextBadgeTeaser) && (
          <div
            className="rounded-2xl p-3.5 border border-slate-800 bg-[#141d2e] space-y-3 cursor-pointer hover:border-slate-700 transition-colors"
            onClick={() => navigate('/achievements')}
          >
            {latestEarnedBadge && (
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-500/15 flex items-center justify-center text-xl shrink-0">
                  {latestEarnedBadge.icon}
                </div>
                <div className="min-w-0">
                  <p className="text-purple-300 text-[11px] font-medium">Latest Badge</p>
                  <p className="text-white text-sm font-semibold truncate">{latestEarnedBadge.name}</p>
                </div>
                <i className="ti ti-chevron-right text-slate-500 ml-auto shrink-0" />
              </div>
            )}

            {nextBadgeTeaser && (
              <div className={latestEarnedBadge ? 'pt-3 border-t border-slate-800/70' : ''}>
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-xl opacity-50 shrink-0">
                    {nextBadgeTeaser.icon}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-slate-400 text-[11px] font-medium">Next Badge to Unlock</p>
                    <p className="text-white text-sm font-semibold truncate">{nextBadgeTeaser.name}</p>
                  </div>
                </div>
                {nextBadgeTeaser.progress ? (
                  <>
                    <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-orange-600 to-orange-400 rounded-full transition-all duration-500"
                        style={{
                          width: `${Math.min(100, (nextBadgeTeaser.progress.current / nextBadgeTeaser.progress.target) * 100)}%`,
                        }}
                      />
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1.5">
                      {Math.round(nextBadgeTeaser.progress.current * 10) / 10}/{nextBadgeTeaser.progress.target}{' '}
                      {nextBadgeTeaser.progress.unit} · {nextBadgeTeaser.description}
                    </p>
                  </>
                ) : (
                  <p className="text-[11px] text-slate-500">{nextBadgeTeaser.description}</p>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Mobile Exam Panel — slides up on mobile when user taps exam strip */}
      {showExamPanel && (
        <div className="fixed inset-0 z-50 flex items-end xl:hidden">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowExamPanel(false)} />
          <div className="relative bg-[#0f172a] rounded-t-3xl border-t border-slate-700 w-full max-h-[70vh] overflow-y-auto p-4 pb-8">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-bold">Exam Countdown</h3>
              <button onClick={() => setShowExamPanel(false)} className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center">
                <i className="ti ti-x text-slate-400 text-sm" />
              </button>
            </div>
            <ExamCountdown />
          </div>
        </div>
      )}

      {/* Subject Modal */}
      {modal && (
        <SubjectModal
          subject={modal === 'new' ? null : modal}
          onClose={() => setModal(null)}
          onSave={async () => { await reloadSubjects(); setModal(null); }}
        />
      )}

      {/* Switch Subject Warning */}
      {switchWarning && (() => {
        const activeSubject = subjects.find(s => (s.id || s._id) === useTimerStore.getState().subjectId);
        const isPaused = useTimerStore.getState().isPaused;
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setSwitchWarning(null)} />
            <div className="relative bg-[#151f2e] rounded-2xl border border-slate-700 shadow-2xl w-full max-w-sm overflow-hidden">
              <div className="h-0.5 w-full bg-gradient-to-r from-orange-500 to-red-500" />
              <div className="p-5">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-orange-500/20 flex items-center justify-center flex-shrink-0">
                    <i className="ti ti-alert-triangle text-orange-400 text-xl" />
                  </div>
                  <div>
                    <h3 className="text-white font-bold">Timer already running!</h3>
                    <p className="text-slate-400 text-xs mt-0.5">
                      {isPaused ? 'Timer is paused on' : 'Currently studying'}
                    </p>
                  </div>
                </div>

                {activeSubject && (
                  <div className="flex items-center gap-2.5 bg-[#0f172a] rounded-xl px-3 py-2.5 mb-4 border border-slate-800">
                    <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: activeSubject.color || '#f97316' }} />
                    <span className="text-sm text-slate-200 font-medium">{activeSubject.name}</span>
                    <span className="text-xs text-slate-500 ml-auto">{isPaused ? 'Paused' : 'Running'}</span>
                  </div>
                )}

                <p className="text-slate-400 text-sm mb-5">
                  Stop current session and switch to{' '}
                  <span className="text-white font-semibold">{switchWarning.name}</span>?
                  <br />
                  <span className="text-xs text-slate-500">Current session will be saved automatically.</span>
                </p>

                <div className="flex gap-2.5">
                  <button onClick={() => setSwitchWarning(null)}
                    className="flex-1 py-2.5 rounded-xl border border-slate-700 text-sm text-slate-300 hover:bg-slate-800 transition-colors">
                    Keep studying
                  </button>
                  <button onClick={handleConfirmSwitch}
                    className="flex-1 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-400 text-sm font-semibold text-white transition-colors flex items-center justify-center gap-2">
                    <i className="ti ti-switch-horizontal text-sm" />
                    Switch
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Cross-Device Timer Conflict Warning */}
      {crossDeviceWarning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setCrossDeviceWarning(null)} />
          <div className="relative bg-[#151f2e] rounded-2xl border border-slate-700 shadow-2xl w-full max-w-sm overflow-hidden">
            <div className="h-0.5 w-full bg-gradient-to-r from-blue-500 to-purple-500" />
            <div className="p-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                  <i className="ti ti-device-mobile text-blue-400 text-xl" />
                </div>
                <div>
                  <h3 className="text-white font-bold">Timer running on another device!</h3>
                  <p className="text-slate-400 text-xs mt-0.5">Same account, different device</p>
                </div>
              </div>
              <div className="flex items-center gap-2.5 bg-[#0f172a] rounded-xl px-3 py-2.5 mb-4 border border-slate-800">
                <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: crossDeviceWarning.subjectColor || '#f97316' }} />
                <span className="text-sm text-slate-200 font-medium">{crossDeviceWarning.subjectName}</span>
                <span className="text-xs text-slate-500 ml-auto">
                  {crossDeviceWarning.isPaused ? 'Paused' : 'Running'}
                </span>
              </div>
              <p className="text-slate-400 text-sm mb-5">
                Starting here will create a <span className="text-white font-semibold">separate session</span>. The other device's timer will keep running.
                <br />
                <span className="text-xs text-slate-500 mt-1 block">Stop the timer on the other device first to avoid duplicate sessions.</span>
              </p>
              <div className="flex gap-2.5">
                <button onClick={() => setCrossDeviceWarning(null)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-700 text-sm text-slate-300 hover:bg-slate-800 transition-colors">
                  Cancel
                </button>
                <button onClick={handleConfirmCrossDevice}
                  className="flex-1 py-2.5 rounded-xl bg-blue-500 hover:bg-blue-400 text-sm font-semibold text-white transition-colors flex items-center justify-center gap-2">
                  <i className="ti ti-player-play text-sm" />
                  Start Anyway
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}