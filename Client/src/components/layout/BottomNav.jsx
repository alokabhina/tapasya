// BottomNav.jsx
// Mobile 5-tab bottom bar (Home/Stats/Calendar/Todo/Profile)
// safe-area inset, hidden on desktop

import { NavLink } from 'react-router-dom';

const TABS = [
  { to: '/',         icon: 'ti-home',      label: 'Home'     },
  { to: '/stats',    icon: 'ti-chart-bar', label: 'Stats'    },
  { to: '/calendar', icon: 'ti-calendar',  label: 'Calendar' },
  { to: '/todo',     icon: 'ti-checkbox',  label: 'Todo'     },
  { to: '/profile',  icon: 'ti-user',      label: 'Profile'  },
];

export default function BottomNav() {
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 md:hidden
                 bg-[#1a2234] border-t border-slate-800
                 pb-[env(safe-area-inset-bottom)]"
      style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 0px)' }}
    >
      <div className="flex items-stretch h-14">
        {TABS.map(({ to, icon, label }) => (
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
                <div className={`w-8 h-7 rounded-lg flex items-center justify-center transition-colors
                  ${isActive ? 'bg-orange-950/60' : ''}`}>
                  <i className={`ti ${icon} text-base`} aria-hidden="true" />
                </div>
                <span>{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}