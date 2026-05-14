// src/components/group/MemberRow.jsx
// Rank + avatar + name + weekly hours + subject color bar
// rank 1-3 = gold/silver/bronze, "You" tag
// props: member, rank, isCurrentUser
// import Avatar

import Avatar from '../ui/Avatar';
import { formatHours } from '../../utils/time';

const RANK_STYLES = {
  1: { bg: 'bg-yellow-950/50', border: 'border-yellow-800/40', color: 'text-yellow-400', medal: '🥇' },
  2: { bg: 'bg-slate-700/30',  border: 'border-slate-600/40',  color: 'text-slate-300',  medal: '🥈' },
  3: { bg: 'bg-orange-950/30', border: 'border-orange-900/40', color: 'text-orange-700', medal: '🥉' },
};

function SubjectBar({ subjects = [] }) {
  const total = subjects.reduce((s, x) => s + (x.seconds || 0), 0);
  if (!total) return null;
  return (
    <div className="flex h-1.5 rounded-full overflow-hidden gap-0.5 mt-1.5 w-full max-w-[120px]">
      {subjects.map((s, i) => (
        <div
          key={i}
          style={{
            width: `${(s.seconds / total) * 100}%`,
            backgroundColor: s.color || '#f97316',
          }}
          title={`${s.name}: ${formatHours(s.seconds)}`}
          className="rounded-full"
        />
      ))}
    </div>
  );
}

export default function MemberRow({ member, rank, isCurrentUser, onClick }) {
  const rankStyle = RANK_STYLES[rank];
  const weeklySeconds = member.weeklySeconds || 0;

  return (
    <div
      onClick={onClick}
      className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-colors
        ${onClick ? 'cursor-pointer hover:brightness-125' : ''}
        ${rankStyle
          ? `${rankStyle.bg} ${rankStyle.border}`
          : isCurrentUser
            ? 'bg-orange-950/20 border-orange-900/30'
            : 'bg-slate-800/50 border-slate-800'}`}
    >
      {/* Rank */}
      <div className="w-8 flex-shrink-0 text-center">
        {rankStyle ? (
          <span className="text-lg leading-none">{rankStyle.medal}</span>
        ) : (
          <span className={`text-sm font-bold ${isCurrentUser ? 'text-orange-400' : 'text-slate-500'}`}>
            #{rank}
          </span>
        )}
      </div>

      {/* Avatar */}
      <Avatar photoURL={member.photoURL} name={member.displayName} size="sm" />

      {/* Name + subject bar */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className={`text-sm font-medium truncate
            ${rankStyle ? rankStyle.color : isCurrentUser ? 'text-orange-300' : 'text-slate-200'}`}>
            {member.displayName || 'Anonymous'}
          </p>
          {isCurrentUser && (
            <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-orange-500/20 text-orange-400 border border-orange-500/20 flex-shrink-0">
              You
            </span>
          )}
        </div>
        <SubjectBar subjects={member.subjectBreakdown || []} />
      </div>

      {/* Weekly hours */}
      <div className="text-right flex-shrink-0">
        <p className={`text-sm font-semibold font-timer
          ${rankStyle ? rankStyle.color : isCurrentUser ? 'text-orange-400' : 'text-slate-400'}`}>
          {formatHours(weeklySeconds)}
        </p>
        <p className="text-[10px] text-slate-600">this week</p>
      </div>
    </div>
  );
}