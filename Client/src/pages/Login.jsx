// src/pages/Login.jsx
// FIX: Pehli baar Google se aao — naam poochho aur save karo
// FIX: "Guest" naam na dikhe — naam set hota hai

import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import api from '@/api/client';
import useUserStore from '@/store/userStore';

export default function Login() {
  const { user, loading, handleGoogleCredential, signInAsGuest } = useAuth();
  const setUser = useUserStore((s) => s.setUser);
  const [authError, setAuthError] = useState('');
  const [gsiReady, setGsiReady] = useState(false);

  // Name setup state — Google login ke baad naam confirm karo
  const [showNameSetup, setShowNameSetup] = useState(false);
  const [pendingName, setPendingName] = useState('');
  const [savingName, setSavingName] = useState(false);

  const btnRef = useRef(null);
  const initializedRef = useRef(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user) navigate('/', { replace: true });
  }, [user, loading, navigate]);

  useEffect(() => {
    const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    if (!CLIENT_ID) {
      setAuthError('VITE_GOOGLE_CLIENT_ID .env mein set nahi hai');
      return;
    }

    function initGSI() {
      if (initializedRef.current) return;
      initializedRef.current = true;

      window.google.accounts.id.initialize({
        client_id: CLIENT_ID,
        callback: async ({ credential }) => {
          setAuthError('');
          try {
            await handleGoogleCredential(credential);
            // Google se naam milta hai — agar "Guest" ya empty hai to naam poochho
            const name = useUserStore.getState().displayName;
            if (!name || name === 'Guest' || name === 'Aspirant') {
              setShowNameSetup(true);
            }
          } catch (e) {
            setAuthError(e?.response?.data?.error || e.message || 'Google sign-in failed');
          }
        },
        auto_select: false,
        cancel_on_tap_outside: true,
      });

      if (btnRef.current) {
        window.google.accounts.id.renderButton(btnRef.current, {
          theme: 'outline', size: 'large', width: 340,
          text: 'signin_with', shape: 'rectangular', logo_alignment: 'left',
        });
        setGsiReady(true);
      }
    }

    if (window.google?.accounts?.id) {
      initGSI();
    } else {
      if (!document.getElementById('gsi-script')) {
        const script = document.createElement('script');
        script.id = 'gsi-script';
        script.src = 'https://accounts.google.com/gsi/client';
        script.async = true; script.defer = true;
        script.onload = initGSI;
        script.onerror = () => setAuthError('Google script load nahi hua.');
        document.head.appendChild(script);
      } else {
        const poll = setInterval(() => {
          if (window.google?.accounts?.id) { clearInterval(poll); initGSI(); }
        }, 100);
        return () => clearInterval(poll);
      }
    }
    return () => { initializedRef.current = false; };
  }, []);

  // Save display name to server
  async function handleSaveName() {
    if (!pendingName.trim()) return;
    setSavingName(true);
    try {
      await api.put('/auth/name', { displayName: pendingName.trim() });
      setUser({ ...useUserStore.getState(), displayName: pendingName.trim() });
      setShowNameSetup(false);
      navigate('/', { replace: true });
    } catch {
      // Even if API fails, save locally and proceed
      setUser({ ...useUserStore.getState(), displayName: pendingName.trim() });
      setShowNameSetup(false);
      navigate('/', { replace: true });
    } finally {
      setSavingName(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0f172a] flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Name setup screen after Google login
  if (showNameSetup) {
    return (
      <div className="min-h-screen bg-[#0f172a] flex flex-col items-center justify-center px-6">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <div className="text-4xl mb-3">👋</div>
            <h2 className="text-2xl font-bold text-white">Swagat hai!</h2>
            <p className="text-slate-400 text-sm mt-2">
              Apna naam batao — yahi naam app mein dikhega
            </p>
          </div>
          <div className="space-y-4">
            <input
              autoFocus
              value={pendingName}
              onChange={(e) => setPendingName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSaveName()}
              placeholder="Tumhara naam..."
              className="w-full bg-[#1e293b] border border-slate-700 rounded-xl px-4 py-3.5 text-white placeholder-slate-500 focus:outline-none focus:border-orange-500 transition-colors text-sm"
            />
            <button
              onClick={handleSaveName}
              disabled={savingName || !pendingName.trim()}
              className="w-full py-3.5 rounded-xl bg-orange-500 hover:bg-orange-400 disabled:opacity-50 text-white font-semibold transition-colors"
            >
              {savingName ? 'Saving...' : 'Shuru karo →'}
            </button>
            <button
              onClick={() => { setShowNameSetup(false); navigate('/', { replace: true }); }}
              className="w-full py-2 text-slate-500 text-sm hover:text-slate-300 transition-colors"
            >
              Baad mein set karunga
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f172a] flex flex-col items-center justify-center px-6">
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-orange-500/5 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-sm relative">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-orange-500/10 border border-orange-500/30 mb-4">
            <span className="text-3xl">🔥</span>
          </div>
          <h1 className="text-3xl font-bold text-slate-100 tracking-tight">तपस्या</h1>
          <p className="text-slate-500 text-sm mt-1 font-medium">Disciplined study tracker</p>
          <p className="text-slate-600 text-xs mt-1">YPT-inspired · Padhai mein tapasya karo</p>
        </div>

        <div className="flex flex-wrap gap-2 justify-center mb-8">
          {[['⏱','Subject Timer'],['📊','Stats'],['🔥','Streak'],['👥','Study Group']].map(([icon,label]) => (
            <div key={label} className="flex items-center gap-1.5 bg-[#1e293b] border border-[#334155] rounded-full px-3 py-1">
              <span className="text-xs">{icon}</span>
              <span className="text-xs text-slate-400 font-medium">{label}</span>
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-3 items-center">
          <div className="w-full flex justify-center min-h-[44px]">
            {!gsiReady && (
              <div className="w-full flex items-center justify-center gap-3 bg-white text-slate-700 font-semibold py-3 rounded-lg text-sm opacity-50 cursor-wait">
                <div className="w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
                Google load ho raha hai...
              </div>
            )}
            <div ref={btnRef} className={gsiReady ? 'w-full flex justify-center' : 'hidden'} />
          </div>
          <button
            onClick={signInAsGuest}
            className="w-full flex items-center justify-center gap-2 bg-[#1e293b] border border-[#334155] text-slate-300 font-medium py-3.5 rounded-xl hover:border-slate-500 hover:text-slate-100 active:scale-95 transition-all duration-150 text-sm"
          >
            👤 Guest mode mein try karo
          </button>
        </div>

        {authError && <p className="text-center text-xs text-red-400 mt-3 px-2">{authError}</p>}
        <p className="text-center text-xs text-slate-600 mt-4 leading-relaxed">
          Guest mode mein data sirf is device pe saved hoga.<br />Google se sign in karo sync ke liye.
        </p>
      </div>
    </div>
  );
}
