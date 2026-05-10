import { useState } from 'react';
import MemberRow from './MemberRow';
import useGroup from '@/hooks/useGroup';

// Real-time leaderboard — sorted by weekly study hours (Firestore onSnapshot via useGroup)
// Toggle: This Week / All Time — shows top 10 members
export default function GroupLeaderboard() {
  const { members } = useGroup();
  const [tab, setTab] = useState('week'); // 'week' | 'alltime'

  const sorted = [...(members || [])]
    .sort((a, b) =>
      tab === 'week'
        ? (b.weeklySeconds || 0) - (a.weeklySeconds || 0)
        : (b.totalSeconds || 0) - (a.totalSeconds || 0)
    )
    .slice(0, 10);

  return (
    <div className="w-full">
      {/* Toggle */}
      <div className="flex gap-2 mb-4">
        {[
          { key: 'week', label: 'This Week' },
          { key: 'alltime', label: 'All Time' },
        ].map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all duration-150 ${
              tab === key
                ? 'bg-tapasya-orange text-white'
                : 'bg-[#1e293b] text-slate-400 hover:bg-[#243347]'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Member list */}
      {sorted.length === 0 ? (
        <div className="text-center py-12 text-slate-500 text-sm">
          <i className="ti ti-users text-3xl block mb-2 opacity-30" />
          Koi member nahi abhi — invite karo!
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {sorted.map((member, index) => (
            <MemberRow
              key={member.uid}
              member={member}
              rank={index + 1}
              tab={tab}
            />
          ))}
        </div>
      )}
    </div>
  );
}