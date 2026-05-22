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
  { to: '/games',        icon: 'ti-sword',            label: 'Practice Arena' },  // NEW
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
  const photoURL = useUserStore((s) => s.photoURL);

  const elapsed = useTimerStore((s) => s.elapsed);

  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={`
        hidden md:flex flex-col h-screen sticky top-0 flex-shrink-0
        bg-[#0c1526] border-r border-slate-800
        transition-all duration-300 overflow-hidden z-40
        ${collapsed ? 'w-[72px]' : 'w-[240px]'}
      `}
    >
      {/* =========================
          LOGO SECTION
      ========================== */}
      <div
        className={`
          relative flex items-center border-b border-slate-800
          min-h-[72px] px-4
          ${collapsed ? 'justify-center' : 'justify-between'}
        `}
      >
        {/* Expanded Logo */}
        {!collapsed && (
          <div className="flex items-center gap-3">
            <img
              src="/icons/Tapasya_logo.png"
              alt="Tapasya Logo"
              className="w-11 h-11 object-contain rounded-xl"
            />

            <div className="leading-tight">
              <p className="text-white font-bold text-[15px] tracking-tight">
                Tapasya
              </p>

              <p className="text-orange-400 text-[11px] font-medium">
                तपस्या
              </p>
            </div>
          </div>
        )}

        {/* Collapsed Logo */}
        {collapsed && (
          <img
            src="/icons/Tapasya_favicon.png"
            alt="Tapasya"
            className="w-10 h-10 object-contain rounded-xl"
          />
        )}

        {/* Toggle Button */}
        <button
          onClick={() => setCollapsed((c) => !c)}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className={`
            w-7 h-7 rounded-lg
            bg-slate-800/70
            flex items-center justify-center
            text-slate-400
            hover:text-white
            hover:bg-slate-700
            transition-colors
            flex-shrink-0

            ${
              collapsed
                ? 'absolute left-1/2 -translate-x-1/2 top-[78px]'
                : ''
            }
          `}
        >
          <i
            className={`ti ${
              collapsed ? 'ti-chevron-right' : 'ti-chevron-left'
            } text-sm`}
          />
        </button>
      </div>

      {/* =========================
          NAVIGATION
      ========================== */}
      <nav
        className="flex-1 px-2 py-3 space-y-1 overflow-y-auto"
        style={{ scrollBehavior: 'smooth' }}
      >
        {NAV_ITEMS.map(({ to, icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            title={collapsed ? label : undefined}
            className={({ isActive }) =>
              `
                flex items-center gap-3
                px-3 py-2.5 rounded-xl
                text-sm transition-all duration-200

                ${collapsed ? 'justify-center' : ''}

                ${
                  isActive
                    ? 'bg-orange-500/15 text-orange-400 border border-orange-500/20'
                    : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
                }
              `
            }
          >
            {({ isActive }) => (
              <>
                <i
                  className={`
                    ti ${icon} text-[18px] flex-shrink-0
                    ${isActive ? 'text-orange-400' : ''}
                  `}
                />

                {!collapsed && (
                  <span className="truncate font-medium">
                    {label}
                  </span>
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* =========================
          ACTIVE SESSION
      ========================== */}
      {elapsed > 0 && (
        <div
          className={`
            mx-2 mb-2
            ${collapsed ? 'flex justify-center' : ''}
          `}
        >
          {collapsed ? (
            <div
              title={`Session: ${formatHours(elapsed)}`}
              className="
                w-9 h-9 rounded-xl
                bg-orange-500/10
                border border-orange-500/20
                flex items-center justify-center
              "
            >
              <i className="ti ti-clock text-orange-400 text-sm" />
            </div>
          ) : (
            <div className="px-3 py-2 bg-slate-800/60 rounded-xl">
              <p className="text-[10px] text-slate-500 uppercase tracking-wide">
                Active Session
              </p>

              <p className="text-orange-400 text-sm font-semibold">
                {formatHours(elapsed)}
              </p>
            </div>
          )}
        </div>
      )}

      {/* =========================
          SETTINGS
      ========================== */}
      <div className="px-2 pb-2 border-t border-slate-800 pt-2">
        <NavLink
          to="/settings"
          title={collapsed ? 'Settings' : undefined}
          className={({ isActive }) =>
            `
              flex items-center gap-3
              px-3 py-2.5 rounded-xl
              text-sm transition-all duration-200

              ${collapsed ? 'justify-center' : ''}

              ${
                isActive
                  ? 'bg-orange-500/15 text-orange-400'
                  : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
              }
            `
          }
        >
          <i className="ti ti-settings text-[18px] flex-shrink-0" />

          {!collapsed && (
            <span className="font-medium">
              Settings
            </span>
          )}
        </NavLink>
      </div>

      {/* =========================
          USER PROFILE
      ========================== */}
      <NavLink
        to="/profile"
        title={collapsed ? (displayName || 'Profile') : undefined}
        className={`
          flex items-center gap-3
          px-3 py-3 border-t border-slate-800
          hover:bg-slate-800/40
          transition-colors

          ${collapsed ? 'justify-center' : ''}
        `}
      >
        <Avatar
          photoURL={photoURL}
          name={displayName || user?.email || 'U'}
          size="sm"
        />

        {!collapsed && (
          <>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-slate-200 truncate font-medium">
                {displayName || 'My Profile'}
              </p>

              <p className="text-[10px] text-slate-500">
                Keep pushing 🔥
              </p>
            </div>

            <StreakBadge />
          </>
        )}
      </NavLink>
    </aside>
  );
}
