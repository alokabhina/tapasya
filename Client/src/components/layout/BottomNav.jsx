// BottomNav.jsx
// Fixed 5-item bottom nav + hamburger for secondary pages
// Clean, no scroll, proper mobile UX

import { NavLink } from 'react-router-dom';
import { useState } from 'react';
import MobileDrawer from './MobileDrawer';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';

const MAIN_NAV = [
  { to: '/',        icon: 'ti-home',      label: 'Home'    },
  { to: '/vocab',   icon: 'ti-book-2',    label: 'Vocab'   },
  { to: '/todo',    icon: 'ti-checkbox',  label: 'Todo'    },
  { to: '/group',   icon: 'ti-users',     label: 'Group'   },
  { to: '/stats',   icon: 'ti-chart-bar', label: 'Stats'   },
];

export default function BottomNav() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { isOnline, pending, syncing } = useOnlineStatus();

  return (
    <>
      <nav
        className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-[#0c1526]/98 backdrop-blur-xl border-t border-slate-800"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        {/* top glow line */}
        <div className="h-[1px] w-full bg-gradient-to-r from-transparent via-orange-500/40 to-transparent" />

        {/* Offline/sync indicator */}
        {(!isOnline || syncing || pending > 0) && (
          <div className={`flex items-center justify-center gap-1.5 py-0.5 text-[10px] font-medium
            ${!isOnline ? 'bg-slate-800/80 text-slate-400' : 'bg-orange-500/10 text-orange-400'}`}>
            {!isOnline && (
              <>
                <i className="ti ti-wifi-off text-[10px]" />
                Offline mode
                {pending > 0 && <span className="text-slate-500">· {pending} pending</span>}
              </>
            )}
            {isOnline && syncing && (
              <>
                <div className="w-2 h-2 rounded-full border border-orange-400 border-t-transparent animate-spin" />
                Syncing...
              </>
            )}
            {isOnline && !syncing && pending > 0 && (
              <>
                <i className="ti ti-clock text-[10px]" />
                {pending} ops synced
              </>
            )}
          </div>
        )}

        <div className="flex items-center justify-around px-2 py-1">
          {MAIN_NAV.map(({ to, icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center flex-1 h-[56px] rounded-xl transition-all duration-200
                ${isActive
                  ? 'text-orange-400'
                  : 'text-slate-400 active:scale-95 active:text-slate-200'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all duration-200
                    ${isActive ? 'bg-orange-500/15 shadow-sm shadow-orange-500/20' : ''}`}
                  >
                    <i className={`ti ${icon} text-[19px]`} />
                  </div>
                  <span className="text-[10px] mt-0.5 font-medium">{label}</span>
                </>
              )}
            </NavLink>
          ))}

          {/* Hamburger button */}
          <button
            onClick={() => setDrawerOpen(true)}
            className={`flex flex-col items-center justify-center flex-1 h-[56px] rounded-xl transition-all duration-200
              ${drawerOpen ? 'text-orange-400' : 'text-slate-400 active:scale-95 active:text-slate-200'}`}
          >
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all duration-200
              ${drawerOpen ? 'bg-orange-500/15' : ''}`}
            >
              <i className="ti ti-menu-2 text-[19px]" />
            </div>
            <span className="text-[10px] mt-0.5 font-medium">More</span>
          </button>
        </div>
      </nav>

      <MobileDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </>
  );
}