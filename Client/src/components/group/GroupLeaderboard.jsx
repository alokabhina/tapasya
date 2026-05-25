// src/components/group/GroupLeaderboard.jsx
// Live-polling leaderboard: polls every 8s for fresh members + liveElapsed
// Current user's elapsed comes from timerStore (instant, no polling delay)

import { useState, useEffect, useRef } from 'react';
import MemberRow from './MemberRow';
import useUserStore from '../../store/userStore';
import useTimerStore from '../../store/timerStore';
import { fetchGroupMembers } from '../../api/groups';

export default function GroupLeaderboard({ members: initialMembers = [], currentUserId, groupId }) {
  const [tab, setTab] = useState('week');
  const [members, setMembers] = useState(initialMembers);
  const pollRef = useRef(null);

  // Live timer elapsed for current user (instant, no delay)
  const timerElapsed  = useTimerStore((s) => s.elapsed);
  const timerRunning  = useTimerStore((s) => s.isRunning && !s.isPaused);
  const timerSubject  = useTimerStore((s) => s.subjectName);
  const timerColor    = useTimerStore((s) => s.subjectColor);

  // Always read latest name/photo from local store
  const liveDisplayName = useUserStore((s) => s.displayName);
  const livePhotoURL    = useUserStore((s) => s.photoURL);

  // Poll members every 8s if we have a groupId
  useEffect(() => {
    if (!groupId) return;
    let active = true;

    async function poll() {
      try {
        const data = await fetchGroupMembers(groupId);
        if (active) setMembers(data);
      } catch (_) {}
    }

    poll(); // immediate first load
    pollRef.current = setInterval(poll, 8000);
    return () => { active = false; clearInterval(pollRef.current); };
  }, [groupId]);

  // Sync initial props when no groupId (static mode)
  useEffect(() => {
    if (!groupId) setMembers(initialMembers);
  }, [initialMembers, groupId]);

  // Enrich current user with live name/photo + live studying data
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

  const sorted = [...enriched]
    .sort((a, b) => tab === 'week'
      ? (b.weeklySeconds || 0) - (a.weeklySeconds || 0)
      : (b.totalSeconds  || 0) - (a.totalSeconds  || 0)
    )
    .slice(0, 10);

  return (
    <div className="w-full">
      <div className="flex gap-2 mb-4">
        {[{ key: 'week', label: 'This Week' }, { key: 'alltime', label: 'All Time' }].map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all duration-150 ${
              tab === key ? 'bg-tapasya-orange text-white' : 'bg-[#1e293b] text-slate-400 hover:bg-[#243347]'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {sorted.length === 0 ? (
        <div className="text-center py-12 text-slate-500 text-sm">
          <i className="ti ti-users text-3xl block mb-2 opacity-30" />
          Koi member nahi abhi — invite karo!
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
                // Pass live elapsed directly for current user — no server poll delay
                liveElapsed={isMe && timerRunning ? timerElapsed : undefined}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}