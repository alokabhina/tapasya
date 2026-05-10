// src/pages/Timer.jsx — back button sirf navigate karta hai, timer chalta rehta hai

import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import useTimerStore from '@/store/timerStore';
import useUserStore from '@/store/userStore';
import CircularProgressRing from '@/components/timer/CircularProgressRing';
import TimerDisplay from '@/components/timer/TimerDisplay';
import SessionControls from '@/components/timer/SessionControls';
import GoalBar from '@/components/timer/GoalBar';
import useSubjectStore from '@/store/subjectStore';
import { formatDuration } from '@/utils/time';

export default function Timer() {
  const navigate = useNavigate();
  const { isRunning, isPaused, elapsed, subjectId, subjectColor, subjectName } = useTimerStore();
  const dailyGoalSeconds = useUserStore((s) => s.dailyGoalSeconds);
  const bgImageUrl = useUserStore((s) => s.bgImageUrl);
  const subjects = useSubjectStore((s) => s.subjects);

  // Agar timer bilkul band ho (stop button ke baad) toh home pe bhejo
  useEffect(() => {
    if (!isRunning && !isPaused && !subjectId) {
      navigate('/', { replace: true });
    }
  }, [isRunning, isPaused, subjectId, navigate]);

  const todayBase  = subjects.reduce((sum, s) => sum + (s.todaySeconds || 0), 0);
  const todayTotal = todayBase + elapsed;

  const ringProgress =
    dailyGoalSeconds > 0
      ? Math.min((todayTotal / dailyGoalSeconds) * 100, 100)
      : Math.min((elapsed / (8 * 3600)) * 100, 100);

  // Back button: timer chalta rehega, MiniPlayer mein dikhega
  function handleBack() {
    navigate('/');
  }

  return (
    <div className="relative min-h-screen bg-[#0f172a] flex flex-col items-center justify-center overflow-hidden">
      {bgImageUrl && (
        <>
          <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${bgImageUrl})` }} />
          <div className="absolute inset-0 bg-[#0f172a]/75 backdrop-blur-sm" />
        </>
      )}

      <div className="relative z-10 flex flex-col items-center w-full max-w-sm px-6">
        <div className="w-full flex justify-between items-center mb-8">
          <button
            onClick={handleBack}
            className="flex items-center gap-1 text-slate-400 hover:text-slate-200 text-sm transition-colors"
          >
            <i className="ti ti-chevron-left text-base" />
            Back
          </button>
          {subjectName && (
            <span className="text-xs text-slate-500 font-medium truncate max-w-[140px]">
              {subjectName}
            </span>
          )}
        </div>

        <div className="relative mb-8">
          <CircularProgressRing
            progress={ringProgress}
            color={subjectColor || '#f97316'}
            size={220}
            strokeWidth={8}
          />
          <div className="absolute inset-0 flex items-center justify-center">
            <TimerDisplay />
          </div>
        </div>

        {dailyGoalSeconds > 0 && (
          <div className="w-full mb-6">
            <GoalBar current={todayTotal} goal={dailyGoalSeconds} />
          </div>
        )}

        <SessionControls />

        <div className="mt-6 flex items-center gap-2 text-slate-500 text-xs">
          <i className="ti ti-sun text-slate-600" />
          <span>Today total:</span>
          <span className="text-[#fb923c] font-mono font-medium">{formatDuration(todayTotal)}</span>
        </div>
      </div>
    </div>
  );
}