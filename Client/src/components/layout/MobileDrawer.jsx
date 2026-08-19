// MobileDrawer.jsx
// Slide-up bottom sheet for secondary navigation on mobile
// Contains: Stats, Calendar, History, Wellbeing, Achievements, Settings

import { useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useUserStore } from '../../store/userStore';
import Avatar from '../ui/Avatar';

const SECONDARY_NAV = [
  { to: '/stats',        icon: 'ti-chart-bar', label: 'Stats',            desc: 'Study performance & insights' },
  { to: '/yt-hub',       icon: 'ti-brand-youtube', label: 'YT Study Pathsala', desc: 'Subject-wise video watchlist' },
  { to: '/pdf-library',  icon: 'ti-file-text', label: 'PDF Library',     desc: 'Read & mark up your PDFs' },
  // { to: '/games',     icon: 'ti-sword',     label: 'Games',            desc: 'Practice Arena'              }, // OUTDATED — removed from nav, feature deprecated
  { to: '/profile',      icon: 'ti-user',      label: 'Profile',          desc: 'Your account'                },
  // Calendar, History, Wellbeing, Achievements, Money moved into Other Tools to declutter this list
  { to: '/other-tools',  icon: 'ti-apps',       label: 'Other Tools',      desc: 'Calendar, Syllabus, History, Achievements, Wellbeing, Money' },
  { to: '/settings',     icon: 'ti-settings',  label: 'Settings',         desc: 'App preferences & account'  },
];

export default function MobileDrawer({ open, onClose }) {
  const { user } = useAuth();
  const displayName = useUserStore((s) => s.displayName);
  const photoURL    = useUserStore((s) => s.photoURL);

  // Lock body scroll when drawer open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        className={`
          fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm
          transition-opacity duration-300 md:hidden
          ${open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}
        `}
      />

      {/* Drawer panel — slides up from bottom. Capped height + internal scroll so it
          never spills past the top of small phone screens; header stays put while the
          nav list scrolls underneath it. */}
      <div
        className={`
          fixed left-0 right-0 bottom-0 z-[70] md:hidden
          bg-[#0c1526] border-t border-slate-700/60
          rounded-t-2xl shadow-2xl shadow-black/60
          flex flex-col
          transition-transform duration-300 ease-out
          ${open ? 'translate-y-0' : 'translate-y-full'}
        `}
        style={{ maxHeight: 'calc(85dvh)' }}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1 shrink-0">
          <div className="w-10 h-1 rounded-full bg-slate-600" />
        </div>

        {/* User info header */}
        <div className="flex items-center gap-3 px-5 py-3 border-b border-slate-800/60 shrink-0">
          <Avatar src={photoURL} name={displayName || user?.email} size={36} />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-100 truncate">
              {displayName || 'Tapasya User'}
            </p>
            <p className="text-xs text-slate-500 truncate">{user?.email}</p>
          </div>
          <button
            onClick={onClose}
            className="ml-auto w-8 h-8 rounded-xl bg-slate-800 flex items-center justify-center text-slate-400 shrink-0"
          >
            <i className="ti ti-x text-[15px]" />
          </button>
        </div>

        {/* Secondary nav items — scrollable region */}
        <div
          className="px-3 py-3 flex flex-col gap-1 overflow-y-auto overscroll-contain"
          style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 72px)' }}
        >
          {SECONDARY_NAV.map(({ to, icon, label, desc }) => (
            <NavLink
              key={to}
              to={to}
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-150
                ${isActive
                  ? 'bg-orange-500/10 text-orange-400 border border-orange-500/15'
                  : 'text-slate-300 active:bg-slate-800/60'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0
                    ${isActive ? 'bg-orange-500/15' : 'bg-slate-800/70'}`}
                  >
                    <i className={`ti ${icon} text-[20px]`} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium leading-tight">{label}</p>
                    <p className="text-xs text-slate-500 truncate">{desc}</p>
                  </div>
                  <i className="ti ti-chevron-right text-[14px] text-slate-600 ml-auto shrink-0" />
                </>
              )}
            </NavLink>
          ))}
        </div>
      </div>
    </>
  );
}