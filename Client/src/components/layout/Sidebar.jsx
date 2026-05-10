// Sidebar.jsx
// Collapsible, sticky sidebar — fixed to viewport height, no scroll

import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useUserStore } from '../../store/userStore';
import { useTimerStore } from '../../store/timerStore';
import { formatHours } from '../../utils/time';
import StreakBadge from '../ui/StreakBadge';
import Avatar from '../ui/Avatar';

const NAV_ITEMS = [
  { to: '/',             icon: 'ti-layout-dashboard', label: 'Overview' },
  { to: '/stats',        icon: 'ti-chart-bar',        label: 'Stats' },
  { to: '/calendar',     icon: 'ti-calendar',         label: 'Calendar' },
  { to: '/todo',         icon: 'ti-checkbox',         label: 'Todo' },
  { to: '/history',      icon: 'ti-history',          label: 'History' },
  { to: '/achievements', icon: 'ti-trophy',           label: 'Achievements' },
  { to: '/group',        icon: 'ti-users',            label: 'Study Group' },
  { to: '/wellbeing',    icon: 'ti-heart',            label: 'Wellbeing' },
];

export default function Sidebar() {
  const { user } = useAuth();
  const displayName = useUserStore((s) => s.displayName);
  const photoURL    = useUserStore((s) => s.photoURL);
  const elapsed     = useTimerStore((s) => s.elapsed);
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={`
        hidden md:flex flex-col h-screen sticky top-0 flex-shrink-0
        bg-[#0c1526] border-r border-slate-800 transition-all duration-300 overflow-hidden z-40
        ${collapsed ? 'w-[64px]' : 'w-[220px]'}
      `}
    >
      {/* Logo + Collapse Toggle */}
      <div className={`flex items-center border-b border-slate-800 min-h-[64px] px-4 ${collapsed ? 'justify-center' : 'justify-between'}`}>
        {!collapsed && (
          <div className="flex items-center gap-2">
            <span className="text-purple-400 text-xl">⚡</span>
            <div className="leading-tight">
              <p className="text-white font-bold text-sm tracking-tight">Tapasya</p>
              <p className="text-slate-500 text-[10px]">· तपस्या</p>
            </div>
          </div>
        )}
        {collapsed && <span className="text-purple-400 text-xl">⚡</span>}
        <button
          onClick={() => setCollapsed((c) => !c)}
          className={`w-7 h-7 rounded-lg bg-slate-800/60 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-700 transition-colors flex-shrink-0 ${collapsed ? 'absolute left-1/2 -translate-x-1/2 bottom-auto top-[70px]' : ''}`}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <i className={`ti ${collapsed ? 'ti-chevron-right' : 'ti-chevron-left'} text-sm`} />
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-hidden">
        {NAV_ITEMS.map(({ to, icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            title={collapsed ? label : undefined}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors
               ${collapsed ? 'justify-center' : ''}
               ${isActive
                 ? 'bg-purple-600/20 text-purple-400 border border-purple-500/20'
                 : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'}`
            }
          >
            {({ isActive }) => (
              <>
                <i className={`ti ${icon} text-base flex-shrink-0 ${isActive ? 'text-purple-400' : ''}`} aria-hidden="true" />
                {!collapsed && <span className="truncate">{label}</span>}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Active session indicator */}
      {elapsed > 0 && (
        <div className={`mx-2 mb-2 ${collapsed ? 'flex justify-center' : 'px-3 py-2 bg-slate-800/60 rounded-xl'}`}>
          {collapsed ? (
            <div className="w-8 h-8 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center" title={`Session: ${formatHours(elapsed)}`}>
              <i className="ti ti-clock text-orange-400 text-xs" />
            </div>
          ) : (
            <>
              <p className="text-[10px] text-slate-500 uppercase tracking-wide">Active Session</p>
              <p className="text-orange-400 text-sm font-medium">{formatHours(elapsed)}</p>
            </>
          )}
        </div>
      )}

      {/* Settings */}
      <div className="px-2 pb-2 border-t border-slate-800 pt-2">
        <NavLink
          to="/settings"
          title={collapsed ? 'Settings' : undefined}
          className={({ isActive }) =>
            `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors
             ${collapsed ? 'justify-center' : ''}
             ${isActive ? 'bg-purple-600/20 text-purple-400' : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'}`
          }
        >
          <i className="ti ti-settings text-base flex-shrink-0" />
          {!collapsed && <span>Settings</span>}
        </NavLink>
      </div>

      {/* User profile */}
      <NavLink
        to="/profile"
        title={collapsed ? (displayName || 'Profile') : undefined}
        className={`flex items-center gap-3 px-3 py-3 border-t border-slate-800 hover:bg-slate-800/40 transition-colors ${collapsed ? 'justify-center' : ''}`}
      >
        <Avatar photoURL={photoURL} name={displayName || user?.email || 'U'} size="sm" />
        {!collapsed && (
          <>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-slate-200 truncate">{displayName || 'My Profile'}</p>
              <p className="text-[10px] text-slate-500">Keep pushing! 🔥</p>
            </div>
            <StreakBadge />
          </>
        )}
      </NavLink>
    </aside>
  );
}
