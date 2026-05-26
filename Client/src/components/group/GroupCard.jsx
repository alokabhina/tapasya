// src/components/group/GroupCard.jsx
// Mobile-first group card with real data display

import { formatHumanDuration } from '../../utils/time';
import useUserStore from '../../store/userStore';

const GRADIENTS = [
  ['#f97316', '#dc2626'],
  ['#8b5cf6', '#ec4899'],
  ['#06b6d4', '#3b82f6'],
  ['#10b981', '#059669'],
  ['#f59e0b', '#f97316'],
  ['#ef4444', '#f97316'],
  ['#6366f1', '#8b5cf6'],
  ['#14b8a6', '#10b981'],
];

function getGroupStyle(name) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return GRADIENTS[Math.abs(hash) % GRADIENTS.length];
}

function GroupAvatar({ name }) {
  const [from, to] = getGroupStyle(name);
  const emojiMatch = name.match(/^(\p{Emoji_Presentation}|\p{Emoji}\uFE0F)/u);
  const emoji = emojiMatch ? emojiMatch[0] : null;
  const initials = !emoji ? name.replace(/[^\w\s]/g, '').trim().slice(0, 2).toUpperCase() : null;
  return (
    <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 font-bold text-xl"
      style={{ background: `linear-gradient(135deg, ${from}, ${to})` }}>
      {emoji || initials}
    </div>
  );
}

export default function GroupCard({ group, onClick }) {
  const { uid } = useUserStore();
  const isAdmin = group.ownerUserId?.toString() === uid?.toString();
  const allMembers = group.members || [];

  // Current user's data
  const myMember = allMembers.find(m => m.userId?.toString() === uid?.toString());
  const myWeekly = myMember?.weeklySeconds || 0;

  // Group aggregate stats
  const totalWeekly = allMembers.reduce((s, m) => s + (m.weeklySeconds || 0), 0);
  const studyingNow = allMembers.filter(m => m.isStudying).length;

  // Top 3 by weekly
  const top3 = [...allMembers]
    .sort((a, b) => (b.weeklySeconds || 0) - (a.weeklySeconds || 0))
    .slice(0, 3);

  const [from, to] = getGroupStyle(group.name);
  const memberCount = group.memberCount || allMembers.length;

  return (
    <button
      onClick={onClick}
      className="w-full text-left bg-[#111827] border border-[#1e2d42] rounded-2xl overflow-hidden
                 hover:border-orange-500/40 transition-all duration-200 active:scale-[0.98] group"
    >
      {/* Gradient accent bar */}
      <div className="h-1 w-full" style={{ background: `linear-gradient(90deg, ${from}, ${to})` }} />

      <div className="p-4">
        {/* Header */}
        <div className="flex items-center gap-3 mb-3">
          <GroupAvatar name={group.name} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-white truncate">{group.name}</h3>
              {isAdmin && (
                <span className="text-[8px] bg-orange-500/20 text-orange-400 border border-orange-500/30
                                 px-1.5 py-0.5 rounded-full font-bold flex-shrink-0">ADMIN</span>
              )}
            </div>
            <div className="flex items-center gap-3 mt-0.5">
              <span className="text-[11px] text-slate-500">{memberCount} members</span>
              {studyingNow > 0 && (
                <span className="flex items-center gap-1 text-[11px] text-emerald-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse inline-block" />
                  {studyingNow} active
                </span>
              )}
            </div>
          </div>
          <i className="ti ti-chevron-right text-slate-700 text-sm group-hover:text-slate-400 transition-colors" />
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 gap-2 mb-3">
          <div className="bg-[#0a1628] rounded-xl px-3 py-2">
            <div className="text-[10px] text-slate-600 mb-0.5">My week</div>
            <div className="text-sm font-bold font-mono" style={{ color: myWeekly > 0 ? from : '#475569' }}>
              {myWeekly > 0 ? formatHumanDuration(myWeekly) : '—'}
            </div>
          </div>
          <div className="bg-[#0a1628] rounded-xl px-3 py-2">
            <div className="text-[10px] text-slate-600 mb-0.5">Group total</div>
            <div className="text-sm font-bold font-mono" style={{ color: totalWeekly > 0 ? from : '#475569' }}>
              {totalWeekly > 0 ? formatHumanDuration(totalWeekly) : '—'}
            </div>
          </div>
        </div>

        {/* Top members */}
        {top3.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-slate-600">Top:</span>
            <div className="flex items-center gap-1.5">
              {top3.map((m, i) => (
                <div key={m.userId || i} className="relative">
                  <div className="w-6 h-6 rounded-full overflow-hidden bg-[#1e293b] border border-[#334155]
                                  flex items-center justify-center">
                    {m.photoURL
                      ? <img src={m.photoURL} alt="" className="w-full h-full object-cover" />
                      : <span className="text-[8px] font-bold text-slate-400">
                          {(m.displayName || '?')[0].toUpperCase()}
                        </span>
                    }
                  </div>
                  {i === 0 && <span className="absolute -top-1 -right-1 text-[8px]">🥇</span>}
                </div>
              ))}
              {memberCount > 3 && (
                <span className="text-[10px] text-slate-600">+{memberCount - 3}</span>
              )}
            </div>
          </div>
        )}
      </div>
    </button>
  );
}