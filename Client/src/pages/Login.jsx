// src/pages/Login.jsx

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

  // Name setup state
  const [showNameSetup, setShowNameSetup] = useState(false);
  const [pendingName, setPendingName] = useState('');
  const [savingName, setSavingName] = useState(false);

  const btnRef = useRef(null);
  const initializedRef = useRef(false);

  const navigate = useNavigate();

  // Redirect if already logged in
  useEffect(() => {
    if (!loading && user) {
      navigate('/', { replace: true });
    }
  }, [user, loading, navigate]);

  // Google Sign-In Init
  useEffect(() => {
    const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

    if (!CLIENT_ID) {
      setAuthError('VITE_GOOGLE_CLIENT_ID missing in .env');
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

            const name = useUserStore.getState().displayName;

            if (
              !name ||
              name === 'Guest' ||
              name === 'Aspirant'
            ) {
              setShowNameSetup(true);
            }
          } catch (e) {
            setAuthError(
              e?.response?.data?.error ||
                e.message ||
                'Google sign-in failed'
            );
          }
        },

        auto_select: false,
        cancel_on_tap_outside: true,
      });

      if (btnRef.current) {
        window.google.accounts.id.renderButton(btnRef.current, {
          theme: 'filled_black',
          size: 'large',
          width: 340,
          text: 'signin_with',
          shape: 'pill',
          logo_alignment: 'left',
        });

        setGsiReady(true);
      }
    }

    // Script handling
    if (window.google?.accounts?.id) {
      initGSI();
    } else {
      if (!document.getElementById('gsi-script')) {
        const script = document.createElement('script');

        script.id = 'gsi-script';
        script.src = 'https://accounts.google.com/gsi/client';

        script.async = true;
        script.defer = true;

        script.onload = initGSI;

        script.onerror = () => {
          setAuthError('Google script load failed');
        };

        document.head.appendChild(script);
      } else {
        const poll = setInterval(() => {
          if (window.google?.accounts?.id) {
            clearInterval(poll);
            initGSI();
          }
        }, 100);

        return () => clearInterval(poll);
      }
    }

    return () => {
      initializedRef.current = false;
    };
  }, []);

  // Save Name
  async function handleSaveName() {
    if (!pendingName.trim()) return;

    setSavingName(true);

    try {
      await api.put('/auth/name', {
        displayName: pendingName.trim(),
      });

      setUser({
        ...useUserStore.getState(),
        displayName: pendingName.trim(),
      });

      setShowNameSetup(false);

      navigate('/', { replace: true });
    } catch {
      setUser({
        ...useUserStore.getState(),
        displayName: pendingName.trim(),
      });

      setShowNameSetup(false);

      navigate('/', { replace: true });
    } finally {
      setSavingName(false);
    }
  }

  // Loading Screen
  if (loading) {
    return (
      <div className="min-h-screen bg-[#0b1120] flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Name Setup Modal
  if (showNameSetup) {
    return (
      <div className="min-h-screen bg-[#0b1120] flex items-center justify-center px-6">
        <div className="w-full max-w-sm bg-[#111827] border border-slate-800 rounded-3xl p-7 shadow-2xl">
          <div className="text-center mb-7">
            <img
              src="/icons/Tapasya_logo.png"
              alt="Tapasya"
              className="w-16 h-16 mx-auto object-contain mb-4"
            />

            <h2 className="text-2xl font-bold text-white">
              Swagat hai 👋
            </h2>

            <p className="text-slate-400 text-sm mt-2 leading-relaxed">
              Yeh naam leaderboard aur profile mein dikhega
            </p>
          </div>

          <div className="space-y-4">
            <input
              autoFocus
              value={pendingName}
              onChange={(e) => setPendingName(e.target.value)}
              onKeyDown={(e) =>
                e.key === 'Enter' && handleSaveName()
              }
              placeholder="Apna naam likho..."
              className="
                w-full bg-[#1e293b]
                border border-slate-700
                rounded-2xl px-4 py-3.5
                text-white placeholder-slate-500
                focus:outline-none
                focus:border-orange-500
                transition-colors text-sm
              "
            />

            <button
              onClick={handleSaveName}
              disabled={savingName || !pendingName.trim()}
              className="
                w-full py-3.5 rounded-2xl
                bg-orange-500 hover:bg-orange-400
                disabled:opacity-50
                text-white font-semibold
                transition-all
              "
            >
              {savingName ? 'Saving...' : 'Continue →'}
            </button>

            <button
              onClick={() => {
                setShowNameSetup(false);
                navigate('/', { replace: true });
              }}
              className="
                w-full py-2
                text-slate-500 text-sm
                hover:text-slate-300
                transition-colors
              "
            >
              Skip for now
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Main Login Page
  return (
    <div className="relative min-h-screen overflow-hidden bg-[#0b1120] flex items-center justify-center px-6">
      {/* Background Glow */}
      <div className="absolute top-[-120px] left-1/2 -translate-x-1/2 w-[650px] h-[320px] bg-orange-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-10">
          <div
            className="
              inline-flex items-center justify-center
              w-24 h-24 rounded-3xl
              bg-[#111827]
              border border-orange-500/20
              shadow-lg mb-5
            "
          >
            <img
              src="/icons/Tapasya_logo.png"
              alt="Tapasya"
              className="w-16 h-16 object-contain"
            />
          </div>

          <h1 className="text-4xl font-bold text-white tracking-tight">
            Tapasya
          </h1>

          <p className="text-orange-400 font-medium mt-1">
            तपस्या
          </p>

          <p className="text-slate-400 text-sm mt-4 leading-relaxed">
            Discipline based study tracker
          </p>

          <p className="text-slate-600 text-xs mt-1">
            Focus · Consistency · Deep Work
          </p>
        </div>

        {/* Feature Pills */}
        <div className="flex flex-wrap justify-center gap-2 mb-8">
          {[
            ['⏱', 'Focus Timer'],
            ['📊', 'Analytics'],
            ['🔥', 'Streak'],
            ['👥', 'Study Groups'],
          ].map(([icon, label]) => (
            <div
              key={label}
              className="
                flex items-center gap-1.5
                bg-[#111827]
                border border-slate-800
                rounded-full px-3 py-1.5
              "
            >
              <span className="text-xs">
                {icon}
              </span>

              <span className="text-xs text-slate-400 font-medium">
                {label}
              </span>
            </div>
          ))}
        </div>

        {/* Login Card */}
        <div
          className="
            bg-[#111827]/90 backdrop-blur-xl
            border border-slate-800
            rounded-3xl p-6
            shadow-2xl
          "
        >
          <div className="flex flex-col gap-4 items-center">
            {/* Google Button */}
            <div className="w-full flex justify-center min-h-[44px]">
              {!gsiReady && (
                <div
                  className="
                    w-full flex items-center justify-center gap-3
                    bg-white text-slate-700
                    font-semibold py-3 rounded-xl
                    text-sm opacity-60 cursor-wait
                  "
                >
                  <div className="w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />

                  Google loading...
                </div>
              )}

              <div
                ref={btnRef}
                className={
                  gsiReady
                    ? 'w-full flex justify-center'
                    : 'hidden'
                }
              />
            </div>

            {/* Guest Button */}
            <button
              onClick={signInAsGuest}
              className="
                w-full flex items-center justify-center gap-2
                bg-[#1e293b]
                border border-[#334155]
                text-slate-300 font-medium
                py-3.5 rounded-2xl
                hover:border-slate-500
                hover:text-slate-100
                active:scale-[0.99]
                transition-all duration-150
                text-sm
              "
            >
              👤 Continue as Guest
            </button>
          </div>

          {/* Error */}
          {authError && (
            <p className="text-center text-xs text-red-400 mt-4 px-2">
              {authError}
            </p>
          )}

          {/* Footer Text */}
          <p className="text-center text-xs text-slate-600 mt-6 leading-relaxed">
            Guest mode mein data sirf current device pe save hoga.
            <br />
            Google sign-in se cloud sync enable hoga.
          </p>
        </div>
      </div>
    </div>
  );
}