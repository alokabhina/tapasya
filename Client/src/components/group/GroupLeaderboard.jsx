// src/components/group/GroupLeaderboard.jsx
import { useState } from 'react';
import MemberRow from './MemberRow';
import useUserStore from '../../store/userStore';

export default function GroupLeaderboard({ members = [], currentUserId }) {
  const [tab, setTab] = useState('week');

  // Always read latest name/photo from local store for the current user
  const liveDisplayName = useUserStore((s) => s.displayName);
  const livePhotoURL    = useUserStore((s) => s.photoURL);

  // Inject live values for the "You" row so it updates instantly without waiting for server poll
  const enrichedMembers = members.map((m) =>
    m.userId?.toString() === currentUserId?.toString()
      ? { ...m, displayName: liveDisplayName || m.displayName, photoURL: livePhotoURL !== undefined ? livePhotoURL : m.photoURL }
      : m
  );

  const sorted = [...enrichedMembers]
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
          {sorted.map((member, index) => (
            <MemberRow
              key={member.userId || index}
              member={member}
              rank={index + 1}
              tab={tab}
              isCurrentUser={member.userId?.toString() === currentUserId?.toString()}
            />
          ))}
        </div>
      )}
    </div>
  );
}