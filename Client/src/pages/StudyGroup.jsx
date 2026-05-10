import { useState } from "react";
import { useGroup } from "../hooks/useGroup";
import GroupLeaderboard from "../components/group/GroupLeaderboard";
import InviteCode from "../components/group/InviteCode";
import CreateGroupModal from "../components/group/CreateGroupModal";

export default function StudyGroup() {
  const { group, leaveGroup, joinGroup, loading } = useGroup();
  const [showCreate, setShowCreate] = useState(false);
  const [joinCode, setJoinCode] = useState("");
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState("");

  const handleJoin = async () => {
    if (!joinCode.trim()) return;
    setJoining(true);
    setJoinError("");
    try {
      await joinGroup(joinCode.trim().toUpperCase());
    } catch (e) {
      setJoinError("Invalid code or group not found.");
    } finally {
      setJoining(false);
    }
  };

  const handleLeave = async () => {
    if (!window.confirm("Leave this group? You can rejoin with the invite code.")) return;
    try {
      await leaveGroup();
    } catch (e) {
      console.error("Leave error:", e);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0f172a] flex items-center justify-center">
        <div className="w-6 h-6 rounded-full border-2 border-orange-500 border-t-transparent animate-spin" />
      </div>
    );
  }

  // No group — show join or create UI
  if (!group) {
    return (
      <div className="min-h-screen bg-[#0f172a] text-white pb-24">
        <div className="px-4 pt-6 pb-4">
          <h1 className="text-xl font-semibold text-white tracking-tight">Study Group</h1>
          <p className="text-sm text-slate-400 mt-0.5">
            Study with friends. Stay accountable.
          </p>
        </div>

        {/* Illustration */}
        <div className="flex flex-col items-center py-8">
          <div className="text-6xl mb-3">👥</div>
          <div className="text-base font-medium text-white">No group yet</div>
          <div className="text-sm text-slate-400 mt-1 text-center px-8">
            Create a study group or join one with an invite code
          </div>
        </div>

        {/* Join with code */}
        <div className="px-4 mb-4">
          <div className="bg-[#1e293b] rounded-2xl p-4">
            <div className="text-sm font-medium text-white mb-3">Join with invite code</div>
            <div className="flex gap-2">
              <input
                type="text"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                onKeyDown={(e) => e.key === "Enter" && handleJoin()}
                placeholder="Enter 6-digit code"
                maxLength={8}
                className="flex-1 bg-[#0f172a] border border-[#334155] rounded-xl px-3 py-2.5 text-sm font-mono text-white placeholder-slate-600 outline-none tracking-widest uppercase focus:border-orange-500 transition-colors"
              />
              <button
                onClick={handleJoin}
                disabled={!joinCode.trim() || joining}
                className="px-4 py-2.5 bg-orange-500 disabled:opacity-40 text-white text-sm font-medium rounded-xl active:scale-95 transition-transform"
              >
                {joining ? "..." : "Join"}
              </button>
            </div>
            {joinError && (
              <p className="text-xs text-red-400 mt-2">{joinError}</p>
            )}
          </div>
        </div>

        {/* Create group */}
        <div className="px-4">
          <button
            onClick={() => setShowCreate(true)}
            className="w-full py-3.5 bg-[#1e293b] border border-[#334155] text-white text-sm font-medium rounded-2xl flex items-center justify-center gap-2 hover:bg-[#263244] transition-colors"
          >
            <i className="ti ti-plus text-orange-400 text-base" />
            Create a new group
          </button>
        </div>

        {showCreate && (
          <CreateGroupModal onClose={() => setShowCreate(false)} />
        )}
      </div>
    );
  }

  // In a group — show leaderboard + invite
  return (
    <div className="min-h-screen bg-[#0f172a] text-white pb-24">
      <div className="px-4 pt-6 pb-4">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-semibold text-white tracking-tight">
              {group.name}
            </h1>
            <p className="text-sm text-slate-400 mt-0.5">
              {group.memberCount || 0} members
            </p>
          </div>
          <button
            onClick={handleLeave}
            className="text-xs text-slate-500 hover:text-red-400 transition-colors py-1"
          >
            Leave group
          </button>
        </div>
      </div>

      {/* Invite code */}
      <div className="px-4 mb-6">
        <InviteCode code={group.inviteCode} />
      </div>

      {/* Leaderboard */}
      <div className="px-4">
        <GroupLeaderboard />
      </div>
    </div>
  );
}