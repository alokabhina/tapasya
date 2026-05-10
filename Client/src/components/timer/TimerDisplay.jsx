// TimerDisplay.jsx
// HH:MM:SS large mono font, subject name + color below, bg image overlay
// import timerStore, formatDuration

import { useTimerStore } from '../../store/timerStore';
import { useUserStore } from '../../store/userStore';
import { formatDuration } from '../../utils/time';

export default function TimerDisplay() {
  const elapsed      = useTimerStore((s) => s.elapsed);
  const subjectName  = useTimerStore((s) => s.subjectName);
  const subjectColor = useTimerStore((s) => s.subjectColor);
  const bgImageUrl   = useUserStore((s) => s.bgImageUrl);

  return (
    <div className="relative flex flex-col items-center justify-center select-none">
      {/* Background image overlay (subtle) */}
      {bgImageUrl && (
        <div
          className="absolute inset-0 rounded-2xl overflow-hidden pointer-events-none"
          style={{
            backgroundImage: `url(${bgImageUrl})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            opacity: 0.12,
          }}
          aria-hidden="true"
        />
      )}

      {/* Time */}
      <p
        className="font-timer text-5xl md:text-6xl font-bold text-orange-400 tracking-widest relative z-10"
        aria-live="polite"
        aria-atomic="true"
        aria-label={`Timer: ${formatDuration(elapsed)}`}
      >
        {formatDuration(elapsed)}
      </p>

      {/* Subject pill */}
      {subjectName && (
        <div
          className="mt-3 flex items-center gap-2 px-4 py-1.5 rounded-full relative z-10"
          style={{ backgroundColor: `${subjectColor}22`, border: `1px solid ${subjectColor}44` }}
        >
          <span
            className="w-2.5 h-2.5 rounded-full flex-shrink-0"
            style={{ backgroundColor: subjectColor || '#f97316' }}
          />
          <span className="text-sm font-medium" style={{ color: subjectColor || '#f97316' }}>
            {subjectName}
          </span>
        </div>
      )}
    </div>
  );
}