// src/components/layout/RouteErrorBoundary.jsx
//
// Every page in this app is loaded with React.lazy() for code-splitting —
// each route is its own small JS file, fetched only when you visit it.
// That's great for load speed, but it has one sharp edge: if that fetch
// ever fails (no internet AND this exact page was never opened online
// before, so its file was never cached — or a brand new version just got
// deployed mid-session and the old page chunk no longer exists on the
// server), React throws, and with nothing catching it the ENTIRE app
// unmounts — every route, the sidebar, everything — leaving just a blank
// white window. That's the "offline, click something, whole app goes
// white" bug.
//
// A React Error Boundary (has to be a class component — there's no hook
// equivalent) catches exactly this: it stops the crash from propagating
// past this point, so only the broken page's spot on screen shows a
// friendly message instead of the whole app disappearing.

import { Component } from 'react';

function isChunkLoadError(error) {
  const msg = String(error?.message || error || '');
  return (
    msg.includes('Failed to fetch dynamically imported module') ||
    msg.includes('error loading dynamically imported module') ||
    msg.includes('Importing a module script failed') ||
    (msg.includes('Failed to fetch') && msg.includes('module'))
  );
}

export default class RouteErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    // eslint-disable-next-line no-console
    console.error('[RouteErrorBoundary] caught:', error, info?.componentStack);
  }

  // Reset on navigation — if the user goes back/forward or picks a
  // different page from the sidebar, give that a fresh try instead of
  // staying stuck on the error screen.
  componentDidUpdate(prevProps) {
    if (this.state.error && prevProps.locationKey !== this.props.locationKey) {
      this.setState({ error: null });
    }
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    const offlineChunk = isChunkLoadError(error) && !navigator.onLine;

    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center gap-4 bg-[#0f172a] text-center px-6 z-[9999]">
        <div className="w-14 h-14 rounded-2xl bg-orange-500/15 border border-orange-500/20 flex items-center justify-center">
          <i className={`ti ${offlineChunk ? 'ti-wifi-off' : 'ti-alert-triangle'} text-2xl text-orange-400`} />
        </div>
        <div>
          <p className="text-slate-200 font-semibold mb-1">
            {offlineChunk ? 'Ye page abhi offline available nahi hai' : 'Kuch gadbad ho gayi'}
          </p>
          <p className="text-slate-500 text-sm max-w-xs">
            {offlineChunk
              ? 'Is page ko pehli baar internet ke saath ek baar khol lo, uske baad ye offline bhi chalega.'
              : 'Ye page load nahi ho paya. Dobara try karo, agar phir bhi ho raha hai toh app ko ek baar reload kar do.'}
          </p>
        </div>
        <div className="flex items-center gap-2 mt-1">
          <button
            onClick={() => this.setState({ error: null })}
            className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-medium"
          >
            Dobara try karo
          </button>
          <button
            onClick={() => window.location.assign('/')}
            className="px-4 py-2 rounded-lg bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold"
          >
            Home pe jao
          </button>
        </div>
      </div>
    );
  }
}