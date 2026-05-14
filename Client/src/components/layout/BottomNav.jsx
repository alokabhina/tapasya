// BottomNav.jsx
// Mobile 5-tab bottom bar + "More" drawer for extra pages
// safe-area inset, hidden on desktop

import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';

const PRIMARY_TABS = [
  { to: '/',         icon: 'ti-home',      label: 'Home'     },
  { to: '/stats',    icon: 'ti-chart-bar', label: 'Stats'    },
  { to: '/calendar', icon: 'ti-calendar',  label: 'Calendar' },
  { to: '/todo',     icon: 'ti-checkbox',  label: 'Todo'     },
];

const MORE_ITEMS = [
  { to: '/history',      icon: 'ti-history',   label: 'History'      },
  { to: '/wellbeing',    icon: 'ti-heart',      label: 'Wellbeing'    },
  { to: '/achievements', icon: 'ti-trophy',     label: 'Achievements' },
  { to: '/group',        icon: 'ti-users',      label: 'Study Group'  },
  { to: '/profile',      icon: 'ti-user',       label: 'Profile'      },
  { to: '/settings',     icon: 'ti-settings',   label: 'Settings'     },
];

export default function BottomNav() {
  const [moreOpen, setMoreOpen] = useState(false);
  const location = useLocation();

  const isMoreActive = MORE_ITEMS.some((item) => location.pathname === item.to);

  return (
    <>
      {/* ── More Drawer Backdrop ─────────────────────────────────────── */}
      {moreOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setMoreOpen(false)}
        />
      )}

      {/* ── More Drawer Panel ────────────────────────────────────────── */}
      <div
        className={`
          fixed bottom-[56px] left-0 right-0 z-50 md:hidden
          bg-[#1a2234] border-t border-slate-700
          transition-transform duration-300 ease-out
          ${moreOpen ? 'translate-y-0' : 'translate-y-full'}
        `}
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div className="flex justify-center pt-2 pb-1">
          <div className="w-10 h-1 rounded-full bg-slate-600" />
        </div>

        <p className="text-[10px] text-slate-500 uppercase tracking-widest px-5 pb-2 pt-1">
          More
        </p>

        <div className="grid grid-cols-3 gap-px pb-2">
          {MORE_ITEMS.map(({ to, icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              onClick={() => setMoreOpen(false)}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center gap-1 py-3 text-[10px] transition-colors
                 ${isActive ? 'text-orange-500' : 'text-slate-400 active:text-slate-200'}`
              }
            >
              {({ isActive }) => (
                <>
                  <div
                    className={`w-9 h-8 rounded-xl flex items-center justify-center transition-colors
                      ${isActive ? 'bg-orange-950/60' : 'bg-slate-800/60'}`}
                  >
                    <i className={`ti ${icon} text-base`} aria-hidden="true" />
                  </div>
                  <span>{label}</span>
                </>
              )}
            </NavLink>
          ))}
        </div>
      </div>

      {/* ── Bottom Tab Bar ───────────────────────────────────────────── */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-40 md:hidden
                   bg-[#1a2234] border-t border-slate-800"
        style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 0px)' }}
      >
        <div className="flex items-stretch h-14">
          {PRIMARY_TABS.map(({ to, icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `flex-1 flex flex-col items-center justify-center gap-0.5 text-[10px] transition-colors
                 ${isActive ? 'text-orange-500' : 'text-slate-500'}`
              }
            >
              {({ isActive }) => (
                <>
                  <div
                    className={`w-8 h-7 rounded-lg flex items-center justify-center transition-colors
                      ${isActive ? 'bg-orange-950/60' : ''}`}
                  >
                    <i className={`ti ${icon} text-base`} aria-hidden="true" />
                  </div>
                  <span>{label}</span>
                </>
              )}
            </NavLink>
          ))}

          {/* More button */}
          <button
            onClick={() => setMoreOpen((o) => !o)}
            className={`flex-1 flex flex-col items-center justify-center gap-0.5 text-[10px] transition-colors
              ${isMoreActive || moreOpen ? 'text-orange-500' : 'text-slate-500'}`}
          >
            <div
              className={`w-8 h-7 rounded-lg flex items-center justify-center transition-colors
                ${isMoreActive || moreOpen ? 'bg-orange-950/60' : ''}`}
            >
              <i
                className={`ti ${moreOpen ? 'ti-x' : 'ti-dots'} text-base`}
                aria-hidden="true"
              />
            </div>
            <span>{moreOpen ? 'Close' : 'More'}</span>
          </button>
        </div>
      </nav>
    </>
  );
}
