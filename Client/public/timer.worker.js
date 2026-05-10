// public/timer.worker.js
// FIX: Tab switch pe bhi timer chalta rahe
// Web Worker main thread se alag hota hai — tab visibility ka koi asar nahi
// Lekin elapsed sync karo localStorage mein taaki page reload pe bhi kaam kare

let intervalId = null;
let elapsed = 0;
let startWallTime = null; // actual wall clock time jab start hua

self.onmessage = function (e) {
  const { type, payload } = e.data;

  switch (type) {
    case 'START':
      elapsed = payload?.elapsed || 0;
      startWallTime = Date.now() - elapsed * 1000;
      clearInterval(intervalId);
      intervalId = setInterval(() => {
        // Wall clock se calculate karo — tab throttling se accurate rahe
        elapsed = Math.round((Date.now() - startWallTime) / 1000);
        self.postMessage({ type: 'TICK', elapsed });
      }, 1000);
      break;

    case 'RESUME':
      // Resume pe elapsed already store mein hai — wall clock reset karo
      elapsed = payload?.elapsed || elapsed;
      startWallTime = Date.now() - elapsed * 1000;
      if (!intervalId) {
        intervalId = setInterval(() => {
          elapsed = Math.round((Date.now() - startWallTime) / 1000);
          self.postMessage({ type: 'TICK', elapsed });
        }, 1000);
      }
      break;

    case 'PAUSE':
      clearInterval(intervalId);
      intervalId = null;
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
