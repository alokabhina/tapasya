// src/components/group/MemberRow.jsx
// Leaderboard row — rank, avatar, name, studying status, time

import Avatar from '../ui/Avatar';
import { formatHumanDuration, formatDuration } from '../../utils/time';

const RANK_STYLES = {
  1: { bg: 'bg-yellow-950/50', border: 'border-yellow-800/40', color: 'text-yellow-400', medal: '🥇' },
  2: { bg: 'bg-slate-700/30',  border: 'border-slate-600/40',  color: 'text-slate-300',  medal: '🥈' },
  3: { bg: 'bg-orange-950/30', border: 'border-orange-900/40', color: 'text-orange-600', medal: '🥉' },
};

function SubjectBar({ subjects = [] }) {
  const total = subjects.reduce((s, x) => s + (x.seconds || 0), 0);
  if (!total) return null;
  return (
    <div className="flex h-1.5 rounded-full overflow-hidden gap-px mt-1.5 w-full max-w-[100px]">
      {subjects.map((s, i) => (
        <div
          key={i}
          style={{ width: `${(s.seconds / total) * 100}%`, backgroundColor: s.color || '#f97316' }}
          title={`${s.name}: ${formatHumanDuration(s.seconds)}`}
          className="rounded-full"
        />
      ))}
    </div>
  );
}

export default function MemberRow({ member, rank, isCurrentUser, tab, onClick, liveElapsed }) {
  const rankStyle = RANK_STYLES[rank];
  const weeklySeconds = member.weeklySeconds || 0;
  const totalSeconds  = member.totalSeconds  || 0;
  const displaySeconds = tab === 'alltime' ? totalSeconds : weeklySeconds;
  const isStudying = member.isStudying || false;
  const elapsed = liveElapsed ?? member.liveElapsed ?? 0;

  return (
    <div
      onClick={onClick}
      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-colors
        ${onClick ? 'cursor-pointer hover:brightness-110' : ''}
        ${rankStyle
          ? `${rankStyle.bg} ${rankStyle.border}`
          : isCurrentUser
            ? 'bg-orange-950/20 border-orange-900/30'
            : 'bg-[#1a2539] border-[#1e293b]'}`}
    >
      {/* Rank */}
      <div className="w-7 flex-shrink-0 text-center">
        {rankStyle ? (
          <span className="text-base leading-none">{rankStyle.medal}</span>
        ) : (
          <span className={`text-xs font-bold ${isCurrentUser ? 'text-orange-400' : 'text-slate-600'}`}>
            #{rank}
          </span>
        )}
      </div>

      {/* Avatar + live dot */}
      <div className="relative flex-shrink-0">
        <Avatar photoURL={member.photoURL} name={member.displayName} size="sm" />
        {isStudying && (
          <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full
                           bg-emerald-400 border-2 border-[#0a1628] animate-pulse" />
        )}
      </div>

      {/* Name + info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <p className={`text-sm font-medium truncate
            ${rankStyle ? rankStyle.color : isCurrentUser ? 'text-orange-300' : 'text-slate-200'}`}>
            {member.displayName || 'Anonymous'}
          </p>
          {isCurrentUser && (
            <span className="text-[8px] font-semibold px-1.5 py-0.5 rounded-full
                             bg-orange-500/20 text-orange-400 border border-orange-500/20 flex-shrink-0">
              You
            </span>
          )}
        </div>

        {/* Studying status or subject bar */}
        {isStudying && (member.studyingSubject || elapsed > 0) ? (
          <p className="text-[10px] text-emerald-400 flex items-center gap-1 mt-0.5">
            <span className="w-1 h-1 rounded-full bg-emerald-400 inline-block flex-shrink-0" />
            {member.studyingSubject || 'Studying'}
            {elapsed > 0 && <span className="font-mono ml-0.5">{formatDuration(elapsed)}</span>}
          </p>
        ) : (
          <SubjectBar subjects={member.subjectBreakdown || []} />
        )}
      </div>

      {/* Time */}
      <div className="text-right flex-shrink-0">
        <p className={`text-sm font-bold font-mono
          ${rankStyle ? rankStyle.color : isCurrentUser ? 'text-orange-400' : 'text-slate-400'}`}>
          {displaySeconds > 0 ? formatHumanDuration(displaySeconds) : '—'}
        </p>
        <p className="text-[9px] text-slate-700">{tab === 'alltime' ? 'total' : 'this week'}</p>
      </div>
    </div>
  );
}