// src/pages/admin/AdminDashboard.jsx
// Admin panel home — overview stat cards + tab links to Users / Groups

import { useEffect, useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { getOverview } from '@/api/admin';
import { formatHours } from '@/utils/time';

const TABS = [
  { to: '/admin', end: true, label: 'Overview', icon: 'ti-layout-dashboard' },
  { to: '/admin/users', label: 'Members', icon: 'ti-users' },
  { to: '/admin/groups', label: 'Groups', icon: 'ti-users-group' },
];

export function AdminShell() {
  return (
    <div className="min-h-screen bg-[#07090f] text-white pb-28" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      <div className="px-5 pt-7 pb-4">
        <p className="text-[11px] text-orange-500/70 uppercase tracking-[0.2em] font-semibold mb-1">
          Admin Panel
        </p>
        <h1 className="text-2xl font-bold text-white tracking-tight" style={{ fontFamily: "'Sora', sans-serif" }}>
          App Control Center
        </h1>
      </div>

      <div className="px-5 flex gap-2 mb-6 overflow-x-auto">
        {TABS.map((t) => (
          <NavLink
            key={t.to}
            to={t.to}
            end={t.end}
            className={({ isActive }) =>
              `flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap border transition-colors ${
                isActive
                  ? 'bg-orange-500/15 border-orange-500/40 text-orange-400'
                  : 'bg-[#0d1420] border-slate-800/70 text-slate-400 hover:text-slate-200'
              }`
            }
          >
            <i className={`ti ${t.icon} text-base`} />
            {t.label}
          </NavLink>
        ))}
      </div>

      <div className="px-5">
        <Outlet />
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, accent = 'orange' }) {
  const colors = {
    orange: 'text-orange-400 bg-orange-500/10 border-orange-500/25',
    blue: 'text-blue-400 bg-blue-500/10 border-blue-500/25',
    green: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/25',
    red: 'text-red-400 bg-red-500/10 border-red-500/25',
    purple: 'text-purple-400 bg-purple-500/10 border-purple-500/25',
  };
  return (
    <div className="bg-[#0d1420] border border-slate-800/70 rounded-2xl p-4 flex items-center gap-3">
      <div className={`w-10 h-10 rounded-xl border flex items-center justify-center ${colors[accent]}`}>
        <i className={`ti ${icon} text-lg`} />
      </div>
      <div>
        <p className="text-xl font-bold text-white" style={{ fontFamily: "'Sora', sans-serif" }}>{value}</p>
        <p className="text-[11px] text-slate-500">{label}</p>
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getOverview().then(setStats).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-slate-500 text-sm py-10 text-center">Loading overview...</div>;
  if (!stats) return <div className="text-slate-500 text-sm py-10 text-center">Could not load stats.</div>;

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
      <StatCard icon="ti-users" label="Total Members" value={stats.totalUsers} accent="orange" />
      <StatCard icon="ti-user-plus" label="New This Week" value={stats.newUsersThisWeek} accent="green" />
      <StatCard icon="ti-activity" label="Active Today" value={stats.activeToday} accent="blue" />
      <StatCard icon="ti-clock-hour-4" label="Total Study Hours" value={stats.totalStudyHours} accent="purple" />
      <StatCard icon="ti-users-group" label="Total Groups" value={stats.totalGroups} accent="blue" />
      <StatCard icon="ti-ghost" label="Guest Accounts" value={stats.totalGuests} accent="orange" />
      <StatCard icon="ti-ban" label="Banned Users" value={stats.bannedCount} accent="red" />
    </div>
  );
}