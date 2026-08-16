// src/components/group/GroupLeaderboard.jsx
// Live-polling leaderboard — polls every 8s, instant update for self via timerStore

import { useState, useEffect, useRef } from 'react';
import MemberRow from './MemberRow';
import useUserStore from '../../store/userStore';
import useTimerStore from '../../store/timerStore';
import { fetchGroupMembers } from '../../api/groups';
import { formatHumanDuration } from '../../utils/time';
import { useLiveTicker } from '../../hooks/useLiveTicker';

export default function GroupLeaderboard({ members: initialMembers = [], currentUserId, groupId }) {
  const [tab, setTab] = useState('week');
  const [members, setMembers] = useState(initialMembers);
  const [loading, setLoading] = useState(false);
  const pollRef = useRef(null);

  const timerElapsed = useTimerStore((s) => s.elapsed);
  const timerRunning = useTimerStore((s) => s.isRunning && !s.isPaused);
  const timerSubject = useTimerStore((s) => s.subjectName);
  const timerColor   = useTimerStore((s) => s.subjectColor);
  const liveDisplayName = useUserStore((s) => s.displayName);
  const livePhotoURL    = useUserStore((s) => s.photoURL);

  useEffect(() => {
    if (!groupId) return;
    let active = true;
    setLoading(true);

    async function poll() {
      try {
        const data = await fetchGroupMembers(groupId);
        if (active) { setMembers(data); setLoading(false); }
      } catch (_) { if (active) setLoading(false); }
    }

    poll();
    pollRef.current = setInterval(poll, 20000); // was 8000 — reduced to cut Vercel function invocations
    return () => { active = false; clearInterval(pollRef.current); };
  }, [groupId]);

  useEffect(() => {
    if (!groupId) setMembers(initialMembers);
  }, [initialMembers, groupId]);

  // Enrich current user with live data
  const enriched = members.map((m) => {
    if (m.userId?.toString() !== currentUserId?.toString()) return m;
    return {
      ...m,
      displayName:     liveDisplayName || m.displayName,
      photoURL:        livePhotoURL !== undefined ? livePhotoURL : m.photoURL,
      isStudying:      timerRunning ? true : m.isStudying,
      studyingSubject: timerRunning ? timerSubject : m.studyingSubject,
      studyingColor:   timerRunning ? timerColor   : m.studyingColor,
    };
  });

  // FIX: sec-by-sec smooth ticking instead of jumping every 8-10s poll
  const ticked = useLiveTicker(enriched);

  const sorted = [...ticked]
    .sort((a, b) => tab === 'week'
      ? (b.weeklySeconds || 0) - (a.weeklySeconds || 0)
      : (b.totalSeconds  || 0) - (a.totalSeconds  || 0)
    )
    .slice(0, 20);

  // Summary stats
  const totalWeekly = enriched.reduce((s, m) => s + (m.weeklySeconds || 0), 0);
  const studyingNow = enriched.filter(m => m.isStudying).length;

  return (
    <div className="w-full">
      {/* Stats banner */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        <div className="bg-[#0f172a] rounded-xl p-2.5 text-center border border-[#1e293b]">
          <div className="text-sm font-bold text-orange-400">{enriched.length}</div>
          <div className="text-[10px] text-slate-600 mt-0.5">Members</div>
        </div>
        <div className="bg-[#0f172a] rounded-xl p-2.5 text-center border border-[#1e293b]">
          <div className="text-sm font-bold text-emerald-400 flex items-center justify-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse inline-block" />
            {studyingNow}
          </div>
          <div className="text-[10px] text-slate-600 mt-0.5">Studying</div>
        </div>
        <div className="bg-[#0f172a] rounded-xl p-2.5 text-center border border-[#1e293b]">
          <div className="text-sm font-bold text-blue-400">{formatHumanDuration(totalWeekly)}</div>
          <div className="text-[10px] text-slate-600 mt-0.5">Group Total</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-3">
        {[{ key: 'week', label: 'This Week' }, { key: 'alltime', label: 'All Time' }].map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all ${
              tab === key ? 'bg-orange-500 text-white' : 'bg-[#1e293b] text-slate-400 hover:bg-[#243347]'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {loading && members.length === 0 ? (
        <div className="flex flex-col items-center py-10 gap-3">
          <div className="w-5 h-5 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-600 text-xs">Loading rankings…</p>
        </div>
      ) : sorted.length === 0 ? (
        <div className="text-center py-12 text-slate-500 text-sm">
          <i className="ti ti-trophy text-3xl block mb-2 opacity-20" />
          Study karoge toh rank milega!
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {sorted.map((member, index) => {
            const isMe = member.userId?.toString() === currentUserId?.toString();
            return (
              <MemberRow
                key={member.userId || index}
                member={member}
                rank={index + 1}
                tab={tab}
                isCurrentUser={isMe}
                liveElapsed={isMe && timerRunning ? timerElapsed : undefined}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}