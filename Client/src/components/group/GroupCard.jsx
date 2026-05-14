// src/components/group/GroupCard.jsx
// Grid card for a group — auto avatar/thumbnail from name, basic stats

import { formatHours } from '../../utils/time';
import useUserStore from '../../store/userStore';

// Generate a consistent gradient + emoji from group name
const GRADIENTS = [
  ['#f97316', '#dc2626'], // orange-red
  ['#8b5cf6', '#ec4899'], // purple-pink
  ['#06b6d4', '#3b82f6'], // cyan-blue
  ['#10b981', '#059669'], // emerald
  ['#f59e0b', '#f97316'], // amber-orange
  ['#ef4444', '#f97316'], // red-orange
  ['#6366f1', '#8b5cf6'], // indigo-purple
  ['#14b8a6', '#10b981'], // teal-emerald
];

function getGroupStyle(name) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  const idx = Math.abs(hash) % GRADIENTS.length;
  return GRADIENTS[idx];
}

function GroupAvatar({ name, size = 'lg' }) {
  const [from, to] = getGroupStyle(name);
  // Extract emoji if name starts with one
  const emojiMatch = name.match(/^(\p{Emoji_Presentation}|\p{Emoji}\uFE0F)/u);
  const emoji = emojiMatch ? emojiMatch[0] : null;
  const initials = !emoji ? name.replace(/[^\w\s]/g, '').trim().slice(0, 2).toUpperCase() : null;
  const sz = size === 'lg' ? 'w-14 h-14 text-2xl' : 'w-10 h-10 text-lg';
  return (
    <div className={`${sz} rounded-2xl flex items-center justify-center flex-shrink-0 font-bold`}
      style={{ background: `linear-gradient(135deg, ${from}, ${to})` }}>
      {emoji || initials}
    </div>
  );
}

export default function GroupCard({ group, members = [], onClick }) {
  const { uid } = useUserStore();
  const isAdmin = group.ownerUserId?.toString() === uid?.toString();

  // Find current user's stats in this group
  const myMember = (group.members || members).find(m => m.userId?.toString() === uid?.toString());
  const myWeekly = myMember?.weeklySeconds || 0;

  // Top 3 members by weekly hours
  const top3 = [...(group.members || [])].sort((a, b) => (b.weeklySeconds || 0) - (a.weeklySeconds || 0)).slice(0, 3);
  const totalWeekly = (group.members || []).reduce((s, m) => s + (m.weeklySeconds || 0), 0);

  const [from, to] = getGroupStyle(group.name);

  return (
    <button
      onClick={onClick}
      className="w-full text-left bg-[#111827] border border-[#1e2d42] rounded-2xl overflow-hidden hover:border-orange-500/40 transition-all duration-200 active:scale-[0.98] group"
    >
      {/* Top gradient bar */}
      <div className="h-1.5 w-full" style={{ background: `linear-gradient(90deg, ${from}, ${to})` }} />

      <div className="p-4">
        {/* Header row */}
        <div className="flex items-start gap-3 mb-3">
          <GroupAvatar name={group.name} size="lg" />
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <h3 className="text-sm font-bold text-white truncate leading-tight">{group.name}</h3>
              {isAdmin && (
                <span className="text-[8px] bg-orange-500/20 text-orange-400 border border-orange-500/30 px-1.5 py-0.5 rounded-full font-bold flex-shrink-0">
                  ADMIN
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              {group.memberCount || (group.members || []).length} members
            </p>
            {/* Group total study this week */}
            <p className="text-xs text-slate-400 mt-1 font-mono">
              <span style={{ color: from }}>{formatHours(totalWeekly)}</span>
              <span className="text-slate-600"> group total</span>
            </p>
          </div>
        </div>

        {/* My stats bar */}
        <div className="bg-[#0a1628] rounded-xl px-3 py-2 mb-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-slate-600 font-medium">My time this week</span>
            <span className="text-[10px] font-mono font-semibold" style={{ color: from }}>
              {formatHours(myWeekly)}
            </span>
          </div>
        </div>

        {/* Top 3 member avatars */}
        {top3.length > 0 && (
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-slate-600 mr-1">Top:</span>
            {top3.map((m, i) => (
              <div key={m.userId || i} className="relative">
                <div className="w-6 h-6 rounded-full overflow-hidden bg-[#1e293b] border border-[#334155] flex items-center justify-center">
                  {m.photoURL
                    ? <img src={m.photoURL} alt="" className="w-full h-full object-cover" />
                    : <span className="text-[8px] font-bold text-slate-400">{(m.displayName || '?')[0].toUpperCase()}</span>
                  }
                </div>
                {i === 0 && <span className="absolute -top-1 -right-1 text-[8px]">🥇</span>}
              </div>
            ))}
            {(group.memberCount || (group.members || []).length) > 3 && (
              <span className="text-[10px] text-slate-600">+{(group.memberCount || (group.members || []).length) - 3} more</span>
            )}
          </div>
        )}
      </div>

      {/* Bottom action hint */}
      <div className="px-4 pb-3">
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-slate-700">Tap to open</span>
          <i className="ti ti-chevron-right text-slate-700 text-xs group-hover:text-slate-500 transition-colors" />
        </div>
      </div>
    </button>
  );
}
