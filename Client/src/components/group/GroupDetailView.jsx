// src/components/group/GroupDetailView.jsx
// Full group detail page: tabs for Leaderboard, Chat, Members, Settings

import { useState } from 'react';
import GroupLeaderboard from './GroupLeaderboard';
import GroupChat from './GroupChat';
import InviteCode from './InviteCode';
import Avatar from '../ui/Avatar';
import { formatHours } from '../../utils/time';
import GroupStatsTab from './GroupStatsTab';
import useUserStore from '../../store/userStore';

const TABS = [
  { key: 'leaderboard', icon: 'ti-trophy',          label: 'Rankings' },
  { key: 'stats',       icon: 'ti-chart-bar',        label: 'Stats'    },
  { key: 'chat',        icon: 'ti-message-circle',   label: 'Chat'     },
  { key: 'members',     icon: 'ti-users',            label: 'Members'  },
  { key: 'invite',      icon: 'ti-user-plus',        label: 'Invite'   },
];

export default function GroupDetailView({ group, members, onLeave, onDelete, onKick, onBack }) {
  const { uid, displayName: liveDisplayName, photoURL: livePhotoURL } = useUserStore();
  const [tab, setTab] = useState('leaderboard');
  const [kickConfirm, setKickConfirm] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Inject live name/photo for current user row so it updates instantly
  const enrichedMembers = members.map((m) =>
    m.userId?.toString() === uid?.toString()
      ? { ...m, displayName: liveDisplayName || m.displayName, photoURL: livePhotoURL !== undefined ? livePhotoURL : m.photoURL }
      : m
  );

  const isAdmin = group?.ownerUserId?.toString() === uid?.toString();

  async function handleKick(userId, name) {
    setActionLoading(true);
    try { await onKick(group._id, userId); setKickConfirm(null); }
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
    <div className="flex flex-col min-h-screen bg-[#0a1628]">
      {/* Header */}
      <div className="px-4 pt-5 pb-3 border-b border-[#1e293b]">
        <div className="flex items-center gap-3 mb-1">
          <button onClick={onBack} className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-[#1e293b] transition-colors">
            <i className="ti ti-arrow-left text-base" />
          </button>
          <div className="flex-1 min-w-0">
            <h2 className="text-base font-bold text-white truncate">{group.name}</h2>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-xs text-slate-500">{group.memberCount || members.length} members</span>
              {isAdmin && (
                <span className="text-[9px] bg-orange-500/20 text-orange-400 border border-orange-500/30 px-1.5 py-0.5 rounded-full font-bold">
                  ADMIN
                </span>
              )}
            </div>
          </div>
          {/* Admin or Leave button */}
          {isAdmin ? (
            <button
              onClick={() => setDeleteConfirm(true)}
              className="text-xs text-red-400/70 hover:text-red-400 transition-colors px-2 py-1 rounded-lg hover:bg-red-500/10"
            >
              <i className="ti ti-trash mr-1" />Delete
            </button>
          ) : (
            <button
              onClick={handleLeave}
              className="text-xs text-slate-500 hover:text-red-400 transition-colors px-2 py-1 rounded-lg hover:bg-red-500/10"
            >
              Leave
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 px-4 py-2 border-b border-[#1e293b] overflow-x-auto scrollbar-none">
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all flex-shrink-0
              ${tab === t.key ? 'bg-orange-500 text-white' : 'text-slate-500 hover:text-slate-300 hover:bg-[#1e293b]'}`}
          >
            <i className={`ti ${t.icon}`} />
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-hidden">
        {tab === 'leaderboard' && (
          <div className="px-4 py-4 overflow-y-auto h-full">
            <GroupLeaderboard members={enrichedMembers} currentUserId={uid} />
          </div>
        )}

        {tab === 'chat' && (
          <div className="h-full" style={{ height: 'calc(100vh - 180px)' }}>
            <GroupChat groupId={group._id} isAdmin={isAdmin} />
          </div>
        )}

        {tab === 'members' && (
          <div className="px-4 py-4 overflow-y-auto space-y-2">
            <p className="text-xs text-slate-600 uppercase tracking-widest font-semibold mb-3">
              {enrichedMembers.length} Member{enrichedMembers.length !== 1 ? 's' : ''}
            </p>
            {enrichedMembers.map(m => {
              const isOwner = group.ownerUserId?.toString() === m.userId?.toString();
              const isMe = m.userId?.toString() === uid?.toString();
              return (
                <div key={m.userId} className={`flex items-center gap-3 p-3 rounded-xl border transition-colors
                  ${isMe ? 'bg-orange-950/20 border-orange-900/30' : 'bg-[#1e293b] border-[#334155]'}`}>
                  <Avatar photoURL={m.photoURL} name={m.displayName} size="sm" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-slate-200 truncate">{m.displayName}</span>
                      {isOwner && <span className="text-[9px] bg-orange-500/20 text-orange-400 border border-orange-500/30 px-1.5 py-0.5 rounded-full font-bold">ADMIN</span>}
                      {isMe && <span className="text-[9px] bg-blue-500/20 text-blue-400 border border-blue-500/30 px-1.5 py-0.5 rounded-full font-bold">YOU</span>}
                    </div>
                    <p className="text-xs text-slate-600 font-mono mt-0.5">{formatHours(m.weeklySeconds || 0)} this week</p>
                  </div>
                  {isAdmin && !isMe && (
                    <button
                      onClick={() => setKickConfirm(m)}
                      className="text-xs text-slate-600 hover:text-red-400 transition-colors px-2 py-1 rounded-lg hover:bg-red-500/10"
                    >
                      <i className="ti ti-user-x" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {tab === 'stats' && (
          <div className="overflow-y-auto h-full">
            <GroupStatsTab group={group} members={enrichedMembers} />
          </div>
        )}

      {tab === 'invite' && (
          <div className="px-4 py-4 overflow-y-auto">
            <InviteCode code={group.inviteCode} isOwner={isAdmin} />
          </div>
        )}
      </div>

      {/* Kick confirm modal */}
      {kickConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4" onClick={() => setKickConfirm(null)}>
          <div className="bg-[#1e293b] rounded-2xl border border-[#334155] p-6 w-full max-w-sm" onClick={e => e.stopPropagation()}>
            <div className="text-center mb-5">
              <div className="text-3xl mb-2">👢</div>
              <h3 className="text-base font-semibold text-white">Kick Member?</h3>
              <p className="text-sm text-slate-400 mt-1">Remove <span className="text-orange-400 font-medium">{kickConfirm.displayName}</span> from the group?</p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setKickConfirm(null)} className="flex-1 py-2.5 rounded-xl bg-[#0f172a] border border-[#334155] text-slate-300 text-sm font-medium">Cancel</button>
              <button onClick={() => handleKick(kickConfirm.userId, kickConfirm.displayName)} disabled={actionLoading} className="flex-1 py-2.5 rounded-xl bg-red-500/80 hover:bg-red-500 text-white text-sm font-medium transition-colors disabled:opacity-50">
                {actionLoading ? 'Kicking...' : 'Kick'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4" onClick={() => setDeleteConfirm(false)}>
          <div className="bg-[#1e293b] rounded-2xl border border-[#334155] p-6 w-full max-w-sm" onClick={e => e.stopPropagation()}>
            <div className="text-center mb-5">
              <div className="text-3xl mb-2">🗑️</div>
              <h3 className="text-base font-semibold text-white">Delete Group?</h3>
              <p className="text-sm text-slate-400 mt-1">This will permanently delete <span className="text-orange-400 font-medium">{group.name}</span> and remove all members. This cannot be undone.</p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setDeleteConfirm(false)} className="flex-1 py-2.5 rounded-xl bg-[#0f172a] border border-[#334155] text-slate-300 text-sm font-medium">Cancel</button>
              <button onClick={handleDelete} disabled={actionLoading} className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-sm font-medium transition-colors disabled:opacity-50">
                {actionLoading ? 'Deleting...' : 'Delete Forever'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}