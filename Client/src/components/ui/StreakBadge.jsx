// StreakBadge.jsx
// 🔥 + streak number, 7+ day pe orange glow
// props: days
// import userStore — but also accepts direct prop for flexibility

import { useUserStore } from '../../store/userStore';

export default function StreakBadge({ days: daysProp }) {
  const streakDays = useUserStore((s) => s.streakDays);
  const days = daysProp !== undefined ? daysProp : streakDays;
  const isHot = days >= 7;

  return (
    <div
      className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold
        bg-orange-950/60 text-orange-400 border border-orange-900/40
        transition-all
        ${isHot ? 'shadow-[0_0_10px_2px_rgba(249,115,22,0.45)]' : ''}`}
    >
      <span role="img" aria-label="fire">🔥</span>
      <span>{days}</span>
    </div>
  );
}