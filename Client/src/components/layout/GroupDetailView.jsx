// src/components/group/GroupDetailView.jsx
// Full group detail — mobile-first, tabs: Rankings, Stats, Chat, Members, Invite

import { useState, useEffect, useRef } from 'react';
import GroupLeaderboard from './GroupLeaderboard';
import GroupChat from './GroupChat';
import InviteCode from './InviteCode';
import Avatar from '../ui/Avatar';
import { formatHumanDuration } from '../../utils/time';
import GroupStatsTab from './GroupStatsTab';
import useUserStore from '../../store/userStore';
import { fetchGroupMembers } from '../../api/groups';

const TABS = [
  { key: 'leaderboard', icon: 'ti-trophy',        label: 'Rankings' },
  { key: 'stats',       icon: 'ti-chart-bar',      label: 'Stats'    },
  { key: 'chat',        icon: 'ti-message-circle', label: 'Chat'     },
  { key: 'members',     icon: 'ti-users',          label: 'Members'  },
  { key: 'invite',      icon: 'ti-user-plus',      label: 'Invite'   },
];

export default function GroupDetailView({ group, members: initialMembers, onLeave, onDelete, onKick, onBack }) {
  const { uid, displayName: liveDisplayName, photoURL: livePhotoURL } = useUserStore();
  const [tab, setTab] = useState('leaderboard');
  const [members, setMembers] = useState(initialMembers || []);
  const [kickConfirm, setKickConfirm] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const pollRef = useRef(null);

  // Poll members every 8s for live presence
  useEffect(() => {
    if (!group?._id) return;
    let active = true;

    async function poll() {
      try {
        const data = await fetchGroupMembers(group._id);
        if (active) setMembers(data);
      } catch (_) {}
    }

    poll();
    pollRef.current = setInterval(poll, 20000); // was 8000 — reduced to cut Vercel function invocations
    return () => { active = false; clearInterval(pollRef.current); };
  }, [group?._id]);

  // Sync from parent when initialMembers changes
  useEffect(() => { setMembers(initialMembers || []); }, [initialMembers]);

  // Enrich current user row
  const enrichedMembers = members.map((m) =>
    m.userId?.toString() === uid?.toString()
      ? { ...m, displayName: liveDisplayName || m.displayName, photoURL: livePhotoURL !== undefined ? livePhotoURL : m.photoURL }
      : m
  );

  const isAdmin = group?.ownerUserId?.toString() === uid?.toString();
  const studyingCount = enrichedMembers.filter(m => m.isStudying).length;

  async function handleKick(userId) {
    setActionLoading(true);
    try { await onKick(group._id, userId); setKickConfirm(null); setMembers(prev => prev.filter(m => m.userId?.toString() !== userId)); }
    catch (e) { alert(e.message); }
    finally { setActionLoading(false); }
  }

  async function handleDelete() {
    setActionLoading(true);
    try { await onDelete(group._id); }
    catch (e) { alert(e.message); }
    finally { setActionLoading(false); setDeleteConfirm(false); }
  }

  async function handleLeave() {
    if (!window.confirm('Leave this group?')) return;
    try { await onLeave(group._id); }
    catch (e) { alert(e.message); }
  }

  if (!group) return null;

  return (
    <div className="flex flex-col h-screen bg-[#0a1628] overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0 px-4 pt-safe pt-4 pb-3 border-b border-[#1e293b]">
        <div className="flex items-center gap-2">
          <button
            onClick={onBack}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400
                       hover:text-white hover:bg-[#1e293b] transition-colors flex-shrink-0"
          >
            <i className="ti ti-arrow-left text-base" />
          </button>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-white truncate">{group.name}</h2>
              {isAdmin && (
                <span className="text-[9px] bg-orange-500/20 text-orange-400 border border-orange-500/30
                                 px-1.5 py-0.5 rounded-full font-bold flex-shrink-0">ADMIN</span>
              )}
            </div>
            <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-500">
              <span>{enrichedMembers.length} members</span>
              {studyingCount > 0 && (
                <>
                  <span>·</span>
                  <span className="flex items-center gap-1 text-emerald-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    {studyingCount} studying
                  </span>
                </>
              )}
            </div>
          </div>

          {isAdmin ? (
            <button
              onClick={() => setDeleteConfirm(true)}
              className="text-xs text-red-400/60 hover:text-red-400 px-2 py-1.5 rounded-lg
                         hover:bg-red-500/10 transition-colors flex-shrink-0"
            >
              <i className="ti ti-trash" />
            </button>
          ) : (
            <button
              onClick={handleLeave}
              className="text-xs text-slate-500 hover:text-red-400 px-2 py-1.5 rounded-lg
                         hover:bg-red-500/10 transition-colors flex-shrink-0"
            >
              Leave
            </button>
          )}
        </div>
      </div>

      {/* Tabs — scrollable on mobile */}
      <div className="flex-shrink-0 flex gap-1 px-3 py-2 border-b border-[#1e293b]
                      overflow-x-auto scrollbar-none">
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium
                        whitespace-nowrap transition-all flex-shrink-0
                        ${tab === t.key
                          ? 'bg-orange-500 text-white shadow-sm shadow-orange-500/30'
                          : 'text-slate-500 hover:text-slate-300 hover:bg-[#1e293b]'}`}
          >
            <i className={`ti ${t.icon} text-sm`} />
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-hidden">

        {/* Rankings */}
        {tab === 'leaderboard' && (
          <div className="h-full overflow-y-auto px-4 py-4">
            <GroupLeaderboard
              members={enrichedMembers}
              currentUserId={uid}
              groupId={group._id}
            />
          </div>
        )}

        {/* Chat */}
        {tab === 'chat' && (
          <div className="h-full">
            <GroupChat groupId={group._id} isAdmin={isAdmin} />
          </div>
        )}

        {/* Members */}
        {tab === 'members' && (
          <div className="h-full overflow-y-auto px-4 py-4 space-y-2">
            <p className="text-[10px] text-slate-600 uppercase tracking-widest font-semibold mb-3">
              {enrichedMembers.length} Member{enrichedMembers.length !== 1 ? 's' : ''}
            </p>
            {enrichedMembers.map(m => {
              const isOwner = group.ownerUserId?.toString() === m.userId?.toString();
              const isMe = m.userId?.toString() === uid?.toString();
              return (
                <div key={m.userId}
                  className={`flex items-center gap-3 p-3 rounded-xl border transition-colors
                    ${isMe ? 'bg-orange-950/20 border-orange-900/30' : 'bg-[#1a2539] border-[#1e293b]'}`}>
                  <div className="relative flex-shrink-0">
                    <Avatar photoURL={m.photoURL} name={m.displayName} size="sm" />
                    {m.isStudying && (
                      <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full
                                       bg-emerald-400 border-2 border-[#0a1628] animate-pulse" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-sm font-medium text-slate-200 truncate">{m.displayName}</span>
                      {isOwner && (
                        <span className="text-[8px] bg-orange-500/20 text-orange-400 border border-orange-500/30
                                         px-1 py-0.5 rounded-full font-bold">ADMIN</span>
                      )}
                      {isMe && (
                        <span className="text-[8px] bg-blue-500/20 text-blue-400 border border-blue-500/30
                                         px-1 py-0.5 rounded-full font-bold">YOU</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      {m.isStudying ? (
                        <p className="text-[10px] text-emerald-400 flex items-center gap-1">
                          <span className="w-1 h-1 rounded-full bg-emerald-400 inline-block" />
                          {m.studyingSubject || 'Studying'}
                        </p>
                      ) : (
                        <p className="text-[10px] text-slate-600 font-mono">
                          {m.weeklySeconds > 0 ? formatHumanDuration(m.weeklySeconds) + ' this week' : 'Not studied yet'}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-xs font-bold font-mono text-slate-300">
                      {m.weeklySeconds > 0 ? formatHumanDuration(m.weeklySeconds) : '—'}
                    </p>
                    {isAdmin && !isMe && (
                      <button
                        onClick={() => setKickConfirm(m)}
                        className="text-[10px] text-slate-600 hover:text-red-400 transition-colors mt-0.5"
                      >
                        kick
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Stats */}
        {tab === 'stats' && (
          <div className="h-full overflow-y-auto">
            <GroupStatsTab group={group} members={enrichedMembers} />
          </div>
        )}

        {/* Invite */}
        {tab === 'invite' && (
          <div className="h-full overflow-y-auto px-4 py-4">
            <InviteCode code={group.inviteCode} isOwner={isAdmin} />
          </div>
        )}
      </div>

      {/* Kick confirm */}
      {kickConfirm && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 px-4 pb-6 sm:pb-0"
          onClick={() => setKickConfirm(null)}>
          <div className="bg-[#1e293b] rounded-2xl border border-[#334155] p-6 w-full max-w-sm"
            onClick={e => e.stopPropagation()}>
            <div className="text-center mb-5">
              <div className="text-3xl mb-2">👢</div>
              <h3 className="text-base font-semibold text-white">Remove Member?</h3>
              <p className="text-sm text-slate-400 mt-1">
                Remove <span className="text-orange-400 font-medium">{kickConfirm.displayName}</span> from this group?
              </p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setKickConfirm(null)}
                className="flex-1 py-2.5 rounded-xl bg-[#0f172a] border border-[#334155] text-slate-300 text-sm font-medium">
                Cancel
              </button>
              <button onClick={() => handleKick(kickConfirm.userId?.toString())} disabled={actionLoading}
                className="flex-1 py-2.5 rounded-xl bg-red-500/80 hover:bg-red-500 text-white text-sm font-medium transition-colors disabled:opacity-50">
                {actionLoading ? 'Removing…' : 'Remove'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 px-4 pb-6 sm:pb-0"
          onClick={() => setDeleteConfirm(false)}>
          <div className="bg-[#1e293b] rounded-2xl border border-[#334155] p-6 w-full max-w-sm"
            onClick={e => e.stopPropagation()}>
            <div className="text-center mb-5">
              <div className="text-3xl mb-2">🗑️</div>
              <h3 className="text-base font-semibold text-white">Delete Group?</h3>
              <p className="text-sm text-slate-400 mt-1">
                Permanently delete <span className="text-orange-400 font-medium">{group.name}</span>? Yeh undo nahi ho sakta.
              </p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setDeleteConfirm(false)}
                className="flex-1 py-2.5 rounded-xl bg-[#0f172a] border border-[#334155] text-slate-300 text-sm font-medium">
                Cancel
              </button>
              <button onClick={handleDelete} disabled={actionLoading}
                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-sm font-medium transition-colors disabled:opacity-50">
                {actionLoading ? 'Deleting…' : 'Delete Forever'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}