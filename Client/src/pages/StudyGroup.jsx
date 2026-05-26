// src/pages/StudyGroup.jsx
// Mobile-first Study Groups page — YPT-inspired layout

import { useState } from 'react';
import { useGroup } from '../hooks/useGroup';
import GroupCard from '../components/group/GroupCard';
import GroupDetailView from '../components/group/GroupDetailView';
import CreateGroupModal from '../components/group/CreateGroupModal';

export default function StudyGroup() {
  const {
    groups, group, activeGroupId, setActiveGroupId,
    members, loading,
    createGroup, joinGroup, leaveGroup, deleteGroup, kickMember,
  } = useGroup();

  const [view, setView] = useState('grid'); // 'grid' | 'detail'
  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState('');

  function openGroup(groupId) {
    setActiveGroupId(groupId);
    setView('detail');
  }

  function backToGrid() {
    setView('grid');
    setActiveGroupId(null);
  }

  const handleJoin = async () => {
    if (!joinCode.trim()) return;
    setJoining(true); setJoinError('');
    try {
      await joinGroup(joinCode.trim().toUpperCase());
      setShowJoin(false); setJoinCode('');
    } catch (e) {
      setJoinError(e?.message || 'Invalid code or group not found.');
    } finally { setJoining(false); }
  };

  const handleLeave = async (groupId) => {
    await leaveGroup(groupId);
    backToGrid();
  };

  const handleDelete = async (groupId) => {
    await deleteGroup(groupId);
    backToGrid();
  };

  if (loading && groups.length === 0) {
    return (
      <div className="min-h-screen bg-[#0a1628] flex items-center justify-center">
        <div className="w-6 h-6 rounded-full border-2 border-orange-500 border-t-transparent animate-spin" />
      </div>
    );
  }

  if (view === 'detail' && group) {
    return (
      <GroupDetailView
        group={group}
        members={members}
        onLeave={handleLeave}
        onDelete={handleDelete}
        onKick={kickMember}
        onBack={backToGrid}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#0a1628] text-white pb-24">

      {/* Header */}
      <div className="px-4 pt-6 pb-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-white">Study Groups</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              {groups.length > 0
                ? `${groups.length} group${groups.length > 1 ? 's' : ''} joined`
                : 'Study together, grow together'}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => { setShowJoin(v => !v); setShowCreate(false); }}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-colors flex items-center gap-1
                ${showJoin
                  ? 'bg-orange-500/20 border border-orange-500/40 text-orange-400'
                  : 'bg-[#1e293b] border border-[#334155] text-slate-300 hover:bg-[#263244]'}`}
            >
              <i className="ti ti-login text-sm" />Join
            </button>
            <button
              onClick={() => { setShowCreate(true); setShowJoin(false); }}
              className="px-3 py-1.5 rounded-xl bg-orange-500 text-white text-xs font-medium
                         hover:bg-orange-600 transition-colors flex items-center gap-1"
            >
              <i className="ti ti-plus text-sm" />Create
            </button>
          </div>
        </div>
      </div>

      {/* Join form */}
      {showJoin && (
        <div className="px-4 mb-4">
          <div className="bg-[#1e293b] rounded-2xl p-4 border border-[#334155]">
            <p className="text-sm font-medium text-white mb-3">Enter Invite Code</p>
            <div className="flex gap-2">
              <input
                type="text"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
                placeholder="XXXXXX"
                maxLength={8}
                autoFocus
                className="flex-1 bg-[#0f172a] border border-[#334155] rounded-xl px-3 py-2.5
                           text-sm font-mono text-white placeholder-slate-600 outline-none
                           tracking-widest uppercase focus:border-orange-500 transition-colors"
              />
              <button
                onClick={handleJoin}
                disabled={!joinCode.trim() || joining}
                className="px-4 py-2.5 bg-orange-500 disabled:opacity-40 text-white text-sm
                           font-medium rounded-xl active:scale-95 transition-transform"
              >
                {joining ? '…' : 'Join'}
              </button>
            </div>
            {joinError && <p className="text-xs text-red-400 mt-2">{joinError}</p>}
          </div>
        </div>
      )}

      {/* Empty state */}
      {groups.length === 0 && (
        <div className="flex flex-col items-center py-16 px-6">
          <div className="w-20 h-20 rounded-3xl bg-[#1e293b] border border-[#334155]
                          flex items-center justify-center text-4xl mb-5">
            👥
          </div>
          <h2 className="text-base font-bold text-white mb-1">Koi group nahi abhi</h2>
          <p className="text-sm text-slate-500 text-center mb-8 leading-relaxed">
            Group mein study karo, motivated raho. Create karo ya join karo!
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => setShowJoin(true)}
              className="px-5 py-2.5 rounded-xl bg-[#1e293b] border border-[#334155]
                         text-white text-sm font-medium hover:bg-[#263244] transition-colors"
            >
              Join Group
            </button>
            <button
              onClick={() => setShowCreate(true)}
              className="px-5 py-2.5 rounded-xl bg-orange-500 text-white text-sm font-medium
                         hover:bg-orange-600 transition-colors"
            >
              Create Group
            </button>
          </div>
        </div>
      )}

      {/* Groups list */}
      {groups.length > 0 && (
        <div className="px-4">
          {/* Aggregate stats */}
          <div className="grid grid-cols-3 gap-2.5 mb-5">
            <div className="bg-[#111827] border border-[#1e2d42] rounded-xl p-3 text-center">
              <div className="text-lg font-bold text-orange-400">{groups.length}</div>
              <div className="text-[10px] text-slate-600 mt-0.5">Groups</div>
            </div>
            <div className="bg-[#111827] border border-[#1e2d42] rounded-xl p-3 text-center">
              <div className="text-lg font-bold text-blue-400">
                {groups.reduce((s, g) => s + (g.memberCount || 0), 0)}
              </div>
              <div className="text-[10px] text-slate-600 mt-0.5">Members</div>
            </div>
            <div className="bg-[#111827] border border-[#1e2d42] rounded-xl p-3 text-center">
              <div className="text-lg font-bold text-emerald-400">
                {groups.reduce((s, g) => s + (g.members || []).filter(m => m.isStudying).length, 0)}
              </div>
              <div className="text-[10px] text-slate-600 mt-0.5">Active</div>
            </div>
          </div>

          {/* Group cards */}
          <div className="flex flex-col gap-3">
            {groups.map(g => (
              <GroupCard key={g._id} group={g} onClick={() => openGroup(g._id)} />
            ))}
          </div>

          {/* Add more row */}
          <div className="mt-4 grid grid-cols-2 gap-3">
            <button
              onClick={() => setShowJoin(true)}
              className="py-3 rounded-xl bg-[#111827] border border-dashed border-[#334155]
                         text-slate-500 text-xs font-medium hover:border-slate-500
                         hover:text-slate-400 transition-colors flex items-center justify-center gap-1.5"
            >
              <i className="ti ti-login text-sm" />Join Another
            </button>
            <button
              onClick={() => setShowCreate(true)}
              className="py-3 rounded-xl bg-[#111827] border border-dashed border-[#334155]
                         text-slate-500 text-xs font-medium hover:border-orange-500/50
                         hover:text-orange-400 transition-colors flex items-center justify-center gap-1.5"
            >
              <i className="ti ti-plus text-sm" />Create New
            </button>
          </div>
        </div>
      )}

      {/* Create modal */}
      {showCreate && (
        <CreateGroupModal
          onClose={() => setShowCreate(false)}
          createGroup={createGroup}
        />
      )}
    </div>
  );
}