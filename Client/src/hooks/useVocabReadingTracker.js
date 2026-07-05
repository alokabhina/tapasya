// src/hooks/useVocabReadingTracker.js
// Vocab Master / Vocab Quiz page ke andar mount hote hi active reading time
// track karta hai. Agar user 20 sec tak koi interaction (swipe/tap/scroll/key)
// nahi karta, timer background mein automatically ruk jaata hai — page khula
// chhod kar chale jaane se time count nahi hoga.
//
// Har ~15s accumulated seconds backend ko bhej diye jaate hain (heartbeat),
// jisse Stats page pe turant reflect ho jaaye, bina is page pe wapas aaye.

import { useEffect, useRef } from 'react';
import { get4amDayString } from '@/utils/time';
import { sendReadingHeartbeat } from '@/api/Vocab';

const IDLE_LIMIT_MS = 20_000;   // 20 sec no-activity => timer pauses
const FLUSH_INTERVAL_MS = 15_000; // har 15 sec backend ko sync karo

const ACTIVITY_EVENTS = ['touchstart', 'touchmove', 'mousedown', 'mousemove', 'keydown', 'click', 'scroll', 'wheel'];

export default function useVocabReadingTracker(enabled = true) {
  const lastActivityRef = useRef(Date.now());
  const pendingSecondsRef = useRef(0);

  useEffect(() => {
    if (!enabled) return;

    lastActivityRef.current = Date.now();

    function markActive() {
      lastActivityRef.current = Date.now();
    }
    ACTIVITY_EVENTS.forEach((ev) => window.addEventListener(ev, markActive, { passive: true }));

    // ── 1-second tick — increments pending seconds only if user is active + tab visible ──
    const tickId = setInterval(() => {
      const isVisible = document.visibilityState === 'visible';
      const isActive = Date.now() - lastActivityRef.current < IDLE_LIMIT_MS;
      if (isVisible && isActive) {
        pendingSecondsRef.current += 1;
      }
    }, 1000);

    // ── periodic flush to backend ──────────────────────────────────────────
    function flush() {
      const seconds = pendingSecondsRef.current;
      if (seconds <= 0) return;
      pendingSecondsRef.current = 0;
      sendReadingHeartbeat(get4amDayString(), seconds).catch(() => {
        // Fail ho jaaye to seconds wapas jod do, next flush pe retry ho jayega
        pendingSecondsRef.current += seconds;
      });
    }
    const flushId = setInterval(flush, FLUSH_INTERVAL_MS);

    // Tab hide hote hi turant flush kar do (user app minimize/switch kar sakta hai)
    function onVisibilityChange() {
      if (document.visibilityState === 'hidden') flush();
    }
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      ACTIVITY_EVENTS.forEach((ev) => window.removeEventListener(ev, markActive));
      document.removeEventListener('visibilitychange', onVisibilityChange);
      clearInterval(tickId);
      clearInterval(flushId);
      flush(); // unmount pe bacha hua time bhi save kar do
    };
  }, [enabled]);
}