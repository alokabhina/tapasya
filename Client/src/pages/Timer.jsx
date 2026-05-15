import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useTimerStore from '@/store/timerStore';
import useUserStore from '@/store/userStore';
import useSubjectStore from '@/store/subjectStore';
import { useTimer } from '@/hooks/useTimer';
import { formatDuration, formatHours } from '@/utils/time';
import GroupTimerOverlay from '@/components/group/GroupTimerOverlay';

// ── Single clean ring (Image 2 style) ────────────────────────────────────────
function TimerRing({ elapsed, color = '#f97316', size = 300 }) {
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

  const ticks = Array.from({ length: 60 }, (_, i) => {
    const a = (i / 60) * 2 * Math.PI - Math.PI / 2;
    const isMajor = i % 5 === 0;
    const innerR = radius + 6;
    const outerR = radius + (isMajor ? 14 : 9);
    return {
      x1: cx + innerR * Math.cos(a),
      y1: cy + innerR * Math.sin(a),
      x2: cx + outerR * Math.cos(a),
      y2: cy + outerR * Math.sin(a),
      major: isMajor,
    };
  });

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="block">
      {/* Tick marks */}
      {ticks.map((t, i) => (
        <line key={i} x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2}
          stroke={t.major ? '#2a3a55' : '#1a2535'}
          strokeWidth={t.major ? 1.5 : 1} strokeLinecap="round" />
      ))}

      {/* Track */}
      <circle cx={cx} cy={cy} r={radius} fill="none" stroke="#1a2535" strokeWidth={8} />

      {/* Progress arc */}
      {elapsed > 0 && (
        <circle
          cx={cx} cy={cy} r={radius}
          fill="none" stroke={color} strokeWidth={8}
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
  );
}

// ── Plant illustration ────────────────────────────────────────────────────────
function PlantIllustration({ elapsed, color = '#f97316' }) {
  const THIRTY_MIN = 30 * 60;
  const t = (elapsed % THIRTY_MIN) / THIRTY_MIN;

  const stage =
    t < 0.05 ? '🌱 Planting...' :
    t < 0.3  ? 'Growing 🌿' :
    t < 0.6  ? '🌲 Sapling' :
    t < 0.85 ? '🌳 Flourishing' :
               '✨ Full Bloom!';

  return (
    <div className="flex flex-col items-center gap-1 select-none">
      <svg viewBox="0 0 80 80" width="68" height="68">
        <ellipse cx="40" cy="66" rx="22" ry="7" fill="#5c3a1e" opacity="0.9" />
        <ellipse cx="40" cy="64" rx="18" ry="5" fill="#7c4a2a" />
        <path d="M40 64 Q40 50 40 36" stroke="#5a7a2a" strokeWidth="3.5" fill="none" strokeLinecap="round" />
        <path d="M40 50 Q28 42 24 30 Q32 32 40 44" fill="#4a7c2a" opacity={Math.min(1, t * 4 + 0.3)} />
        <path d="M40 50 Q32 40 26 31" stroke="#5a8a34" strokeWidth="0.8" fill="none" opacity={0.6} />
        <path d="M40 46 Q52 38 56 26 Q48 28 40 40" fill="#5a9034" opacity={Math.min(1, t * 4 + 0.2)} />
        <path d="M40 46 Q48 36 54 27" stroke="#6aa040" strokeWidth="0.8" fill="none" opacity={0.6} />
        {t > 0.08 && (
          <path d="M40 36 Q34 28 36 20 Q42 26 40 36" fill="#6aaa3a" opacity={Math.min(1, (t - 0.08) * 5)} />
        )}
        {t > 0.2 && (
          <>
            <circle cx="22" cy="44" r="2" fill="#7bc946" opacity={Math.min(0.8, (t - 0.2) * 3)} />
            <circle cx="58" cy="40" r="1.5" fill="#7bc946" opacity={Math.min(0.7, (t - 0.2) * 3)} />
            <circle cx="26" cy="32" r="1.5" fill="#9fdf60" opacity={Math.min(0.6, (t - 0.2) * 2)} />
          </>
        )}
      </svg>
      <p className="text-xs font-semibold" style={{ color: color + 'cc' }}>{stage}</p>
    </div>
  );
}

// ── Goal bar ─────────────────────────────────────────────────────────────────
function GoalBar({ current = 0, goal = 0, color = '#f97316' }) {
  const pct = goal > 0 ? Math.min((current / goal) * 100, 100) : 0;
  const done = goal > 0 && current >= goal;
  const barColor = done ? '#22c55e' : color;

  return (
    <div className="w-full space-y-1.5">
      <div className="flex items-baseline gap-1.5 justify-center">
        <span className="font-bold text-xl" style={{ color: barColor }}>{formatHours(current)}</span>
        <span className="text-slate-400 text-base">/ {formatHours(goal)} today</span>
      </div>
      <div className="relative h-2 bg-slate-800 rounded-full">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${Math.max(pct, 0.5)}%`, backgroundColor: barColor,
            boxShadow: `0 0 8px ${barColor}60` }}
        />
        <div
          className="absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full border-2 border-[#0a1220]"
          style={{ left: `calc(${Math.max(pct, 0.5)}% - 7px)`, backgroundColor: barColor }}
        />
      </div>
      <p className="text-center text-[11px] text-slate-600">{Math.round(pct)}%</p>
    </div>
  );
}

// ── Main Timer Page ───────────────────────────────────────────────────────────
export default function Timer() {
  const navigate = useNavigate();
  const { isRunning, isPaused, elapsed, subjectId, subjectColor, subjectName } = useTimerStore();
  const dailyGoalSeconds = useUserStore((s) => s.dailyGoalSeconds);
  const bgImageUrl       = useUserStore((s) => s.bgImageUrl);
  const subjects         = useSubjectStore((s) => s.subjects);
  const { stop, pause, resume } = useTimer();
  const [showGroup, setShowGroup] = useState(false);

  useEffect(() => {
    if (!isRunning && !isPaused && !subjectId) navigate('/', { replace: true });
  }, [isRunning, isPaused, subjectId, navigate]);

  const todayBase  = subjects.reduce((sum, s) => sum + (s.todaySeconds || 0), 0);
  const todayTotal = todayBase + elapsed;
  const color      = subjectColor || '#f97316';

  async function handleStop() { await stop(); navigate('/'); }

  return (
    <div
      className="relative min-h-screen flex flex-col items-center justify-between overflow-hidden"
      style={{ background: 'linear-gradient(160deg, #0d1b2e 0%, #080d16 50%, #090e1c 100%)' }}
    >
      {/* Background image */}
      {bgImageUrl && (
        <>
          <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${bgImageUrl})` }} />
          <div className="absolute inset-0 bg-[#080d16]/75 backdrop-blur-sm" />
        </>
      )}

      {/* Ambient glow */}
      <div className="absolute inset-0 pointer-events-none"
        style={{ background: `radial-gradient(ellipse 70% 55% at 50% 40%, ${color}10 0%, transparent 65%)` }} />

      {/* ── Top bar ── */}
      <div className="relative z-10 w-full flex justify-between items-center px-5 pt-5 pb-2">
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-slate-800/60 border border-slate-700/40 text-slate-300 hover:text-white text-sm font-medium transition-all"
        >
          <i className="ti ti-arrow-left text-sm" />
          Back
        </button>

        <button
          onClick={() => setShowGroup(true)}
          className="relative flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-[#1a2540]/80 border border-[#2a3a5a] text-sm font-semibold text-[#60a5fa] transition-all"
        >
          <i className="ti ti-users text-sm" />
          Group
          <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-green-400 rounded-full border-2 border-[#080d16] animate-pulse" />
        </button>
      </div>

      {/* ── Ring + center content ── */}
      <div className="relative z-10 flex flex-col items-center flex-1 justify-center w-full px-4 gap-0">
        <div className="relative" style={{ width: 300, height: 300 }}>
          <TimerRing elapsed={elapsed} color={color} size={300} />

          {/* Center content */}
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-0.5 select-none">
            <PlantIllustration elapsed={elapsed} color={color} />

            <p
              className="font-bold tracking-widest leading-none mt-1"
              style={{
                color: 'white', fontSize: '2.75rem',
                fontFamily: 'ui-monospace, "SF Mono", monospace',
                textShadow: `0 0 24px ${color}40`,
              }}
              aria-live="polite"
            >
              {formatDuration(elapsed)}
            </p>

            {subjectName && (
              <div
                className="mt-2 flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold"
                style={{ backgroundColor: color + '1e', border: `1.5px solid ${color}40`, color }}
              >
                <i className="ti ti-target text-[10px]" />
                {subjectName}
              </div>
            )}
          </div>
        </div>

        {/* Goal bar */}
        {dailyGoalSeconds > 0 && (
          <div className="w-full max-w-[260px] mt-5">
            <GoalBar current={todayTotal} goal={dailyGoalSeconds} color={color} />
          </div>
        )}
      </div>

      {/* ── Bottom controls ── */}
      <div className="relative z-10 w-full flex flex-col items-center pb-6 px-6 gap-4">
        <div className="flex items-stretch justify-center gap-3 w-full max-w-xs">

          {/* Stop */}
          <button
            onClick={handleStop}
            className="flex-1 flex flex-col items-center justify-center gap-2 py-4 rounded-2xl transition-all active:scale-95"
            style={{ backgroundColor: '#1e0f18', border: '1.5px solid #6b1c3844' }}
          >
            <div className="w-11 h-11 rounded-full bg-red-900/50 border border-red-700/40 flex items-center justify-center">
              <i className="ti ti-square-filled text-lg text-red-400" />
            </div>
            <span className="text-xs font-semibold text-red-400">Stop</span>
          </button>

          {/* Pause / Resume — prominent center */}
          <button
            onClick={isPaused ? resume : pause}
            className="flex-1 flex flex-col items-center justify-center gap-2 py-4 rounded-2xl transition-all active:scale-95"
            style={{ backgroundColor: color + '18', border: `1.5px solid ${color}44` }}
          >
            <div className="w-14 h-14 rounded-full flex items-center justify-center"
              style={{ backgroundColor: color, boxShadow: `0 4px 18px ${color}55` }}>
              <i className={`ti ${isPaused ? 'ti-player-play-filled' : 'ti-player-pause-filled'} text-2xl text-white`} />
            </div>
            <span className="text-sm font-bold" style={{ color }}>{isPaused ? 'Resume' : 'Pause'}</span>
          </button>

          {/* Switch */}
          <button
            onClick={() => navigate('/')}
            className="flex-1 flex flex-col items-center justify-center gap-2 py-4 rounded-2xl bg-[#111d30]/60 border border-[#2a3a55]/50 transition-all active:scale-95"
          >
            <div className="w-11 h-11 rounded-full bg-[#1a2d4a]/60 border border-[#2a3a55]/40 flex items-center justify-center">
              <i className="ti ti-switch-horizontal text-lg text-[#60a5fa]" />
            </div>
            <span className="text-xs font-semibold text-[#60a5fa]">Switch</span>
          </button>
        </div>

        {/* Footer */}
        <div className="flex items-center gap-2 text-slate-500 text-[11px]">
          <span>🌿</span>
          <span>Stay focused. Great things take time.</span>
        </div>
      </div>

      {showGroup && <GroupTimerOverlay onClose={() => setShowGroup(false)} />}
    </div>
  );
}