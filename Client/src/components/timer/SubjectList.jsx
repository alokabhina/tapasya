// SubjectList.jsx
// Subject cards list: color bg + name + today time, tap → start timer + navigate /timer
// import subjectStore, timerStore, useTimer

import { useNavigate } from 'react-router-dom';
import { useSubjectStore } from '../../store/subjectStore';
import { useTimerStore } from '../../store/timerStore';
import { useTimer } from '../../hooks/useTimer';
import { formatHours } from '../../utils/time';

export default function SubjectList() {
  const subjects  = useSubjectStore((s) => s.subjects);
  const isRunning = useTimerStore((s) => s.isRunning);
  const activeId  = useTimerStore((s) => s.subjectId);
  const { start } = useTimer();
  const navigate  = useNavigate();

  if (!subjects || subjects.length === 0) {
    return (
      <div className="text-center py-10 text-slate-500 text-sm">
        <i className="ti ti-books text-3xl block mb-2 opacity-30" />
        No subjects yet. Add one in Settings.
      </div>
    );
  }

  async function handleStart(subject) {
    // If same subject already running, just navigate
    if (isRunning && activeId === subject.id) {
      navigate('/timer');
      return;
    }
    // Start (stops current session internally if any)
    await start(subject);
    navigate('/timer');
  }

  return (
    <div className="grid grid-cols-2 gap-3">
      {subjects.map((subject) => {
        const isActive = isRunning && activeId === subject.id;
        return (
          <button
            key={subject.id}
            onClick={() => handleStart(subject)}
            className="relative text-left rounded-xl p-4 transition-transform active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
            style={{ backgroundColor: subject.color || '#1e293b' }}
            aria-label={`Start ${subject.name}`}
          >
            {/* Active pulse indicator */}
            {isActive && (
              <span className="absolute top-2 right-2 flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-orange-400" />
              </span>
            )}

            <p className="text-white font-medium text-sm truncate mb-1">{subject.name}</p>
            <p className="text-white/60 text-xs">
              {formatHours(subject.todaySeconds || 0)} today
            </p>
            <div className="mt-3 inline-flex items-center gap-1 text-[10px] text-white/70 bg-white/10 px-2 py-0.5 rounded">
              {isActive ? (
                <><i className="ti ti-player-pause text-[10px]" /> Running</>
              ) : (
                <><i className="ti ti-player-play text-[10px]" /> Start</>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}