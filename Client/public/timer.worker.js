// public/timer.worker.js
// FIXED BUGS:
// 1. RESUME pe duplicate interval ban jaata tha (intervalId check missing)
// 2. Wall-clock drift: elapsed ab start time se pure count hota hai

let intervalId = null;
let elapsed = 0;
let startWallTime = null;

function startTicking(fromElapsed) {
  elapsed = fromElapsed;
  startWallTime = Date.now() - elapsed * 1000;
  // BUG FIX: clearInterval pehle — RESUME pe double interval nahi banega
  clearInterval(intervalId);
  intervalId = setInterval(() => {
    elapsed = Math.round((Date.now() - startWallTime) / 1000);
    self.postMessage({ type: 'TICK', elapsed });
  }, 1000);
}

self.onmessage = function (e) {
  const { type, payload } = e.data;

  switch (type) {
    case 'START':
      startTicking(payload?.elapsed || 0);
      break;

    case 'RESUME':
      // BUG FIX: resume pe exact elapsed pass hota hai from store
      // ab wall-clock se drift nahi hoga
      startTicking(payload?.elapsed ?? elapsed);
      break;

    case 'PAUSE':
      clearInterval(intervalId);
      intervalId = null;
      // elapsed yahan preserve rahega — resume pe wahan se shuru hoga
      break;

    case 'STOP':
      clearInterval(intervalId);
      intervalId = null;
      elapsed = 0;
      startWallTime = null;
      self.postMessage({ type: 'STOPPED', elapsed: 0 });
      break;

    case 'GET_ELAPSED':
      self.postMessage({ type: 'ELAPSED', elapsed });
      break;

    default:
      break;
  }
};