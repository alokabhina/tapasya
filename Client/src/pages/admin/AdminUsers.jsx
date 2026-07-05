// src/pages/admin/AdminUsers.jsx
// Full members list — search, basic stats, click a row to open full profile

import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getUsers } from '@/api/admin';
import { formatHours } from '@/utils/time';

function timeAgo(dateStr) {
  if (!dateStr) return 'Never';
  const d = new Date(dateStr);
  const diffDays = Math.floor((Date.now() - d.getTime()) / 86400000);
  if (diffDays <= 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  return `${diffDays}d ago`;
}

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState('');
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const load = useCallback((q = '') => {
    setLoading(true);
    getUsers(q, 1)
      .then((data) => { setUsers(data.users); setTotal(data.total); })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(''); }, [load]);

  useEffect(() => {
    const t = setTimeout(() => load(search), 350);
    return () => clearTimeout(t);
  }, [search, load]);

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <div className="flex-1 relative">
          <i className="ti ti-search absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-base" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or email..."
            className="w-full bg-[#0d1420] border border-slate-800/70 rounded-xl pl-9 pr-3 py-2.5 text-sm text-white placeholder:text-slate-600 outline-none focus:border-orange-500/50"
          />
        </div>
        <span className="text-xs text-slate-500 whitespace-nowrap">{total} members</span>
      </div>

      {loading ? (
        <div className="text-slate-500 text-sm py-10 text-center">Loading members...</div>
      ) : users.length === 0 ? (
        <div className="text-slate-500 text-sm py-10 text-center">No members found.</div>
      ) : (
        <div className="flex flex-col gap-2">
          {users.map((u) => (
            <button
              key={u._id}
              onClick={() => navigate(`/admin/users/${u._id}`)}
              className="flex items-center gap-3 bg-[#0d1420] border border-slate-800/70 hover:border-orange-500/40 rounded-xl p-3 text-left transition-colors"
            >
              <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center overflow-hidden shrink-0">
                {u.photoURL ? (
                  <img src={u.photoURL} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-sm font-bold text-slate-300">{(u.displayName || 'A')[0].toUpperCase()}</span>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-white truncate">{u.displayName || 'Aspirant'}</p>
                  {u.isGuest && <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-700/60 text-slate-400">Guest</span>}
                  {u.isBanned && <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-500/15 text-red-400 border border-red-500/30">Banned</span>}
                  {!u.isBanned && u.timeoutUntil && new Date(u.timeoutUntil) > new Date() && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-yellow-500/15 text-yellow-400 border border-yellow-500/30">Timeout</span>
                  )}
                </div>
                <p className="text-[12px] text-slate-500 truncate">{u.email || 'No email'}</p>
              </div>

              <div className="text-right shrink-0">
                <p className="text-[12px] font-semibold text-orange-400">{formatHours(u.totalSeconds)}</p>
                <p className="text-[10px] text-slate-600">{timeAgo(u.lastActive)}</p>
              </div>

              <i className="ti ti-chevron-right text-slate-600" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}