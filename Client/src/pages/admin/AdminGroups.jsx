// src/pages/admin/AdminGroups.jsx
// Lists every study group created in the app, with member counts + delete control

import { useEffect, useState } from 'react';
import { getGroups, deleteGroup } from '@/api/admin';
import { formatHours } from '@/utils/time';

export default function AdminGroups() {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);
  const [busy, setBusy] = useState(false);

  function load() {
    setLoading(true);
    getGroups().then(setGroups).finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, []);

  async function handleDelete(id, name) {
    if (!window.confirm(`Delete group "${name}"? This removes it for all members.`)) return;
    setBusy(true);
    try { await deleteGroup(id); load(); } finally { setBusy(false); }
  }

  if (loading) return <div className="text-slate-500 text-sm py-10 text-center">Loading groups...</div>;
  if (groups.length === 0) return <div className="text-slate-500 text-sm py-10 text-center">No groups created yet.</div>;

  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs text-slate-500 mb-1">{groups.length} groups total</p>
      {groups.map((g) => (
        <div key={g._id} className="bg-[#0d1420] border border-slate-800/70 rounded-xl p-3">
          <button
            onClick={() => setExpanded(expanded === g._id ? null : g._id)}
            className="flex items-center gap-3 w-full text-left"
          >
            <div className="w-10 h-10 rounded-xl bg-orange-500/10 border border-orange-500/25 flex items-center justify-center shrink-0">
              <i className="ti ti-users-group text-orange-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white truncate">{g.name}</p>
              <p className="text-[11px] text-slate-500">{g.memberCount} members · code {g.inviteCode}</p>
            </div>
            <i className={`ti ti-chevron-${expanded === g._id ? 'up' : 'down'} text-slate-600`} />
          </button>

          {expanded === g._id && (
            <div className="mt-3 pt-3 border-t border-slate-800/70">
              <div className="flex flex-col gap-1.5 mb-3">
                {g.members.map((m) => (
                  <div key={m.userId} className="flex items-center justify-between text-xs bg-[#07090f] rounded-lg px-3 py-2">
                    <span className="text-slate-300">{m.displayName}</span>
                    <span className="text-slate-500">{formatHours(m.totalSeconds)}</span>
                  </div>
                ))}
              </div>
              <button
                disabled={busy}
                onClick={() => handleDelete(g._id, g.name)}
                className="text-xs font-semibold px-3 py-2 rounded-lg border border-red-500/40 bg-red-500/20 text-red-300 disabled:opacity-50"
              >
                Delete Group
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}