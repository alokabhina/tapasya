// src/hooks/useAutoLandscapeFullscreen.js
import { useEffect } from 'react'

// YouTube's embedded iframe player has its own native fullscreen button,
// but entering fullscreen on an <iframe> does NOT auto-rotate the screen
// to landscape the way a plain <video> tag does in most mobile browsers.
// This hook watches for fullscreenchange on the document and explicitly
// locks the screen orientation to landscape while fullscreen, unlocking
// again on exit.
//
// Platform notes:
// - Works on Android Chrome/Edge (and Chromium-based PWAs installed to
//   home screen) via the Screen Orientation API.
// - iOS Safari / iOS PWAs do NOT implement screen.orientation.lock() at
//   all (Apple restriction) — on iOS the user still has to rotate the
//   phone manually, or turn off the OS-level rotation lock. There is no
//   web-API workaround for that platform.
export function useAutoLandscapeFullscreen() {
  useEffect(() => {
    function onFsChange() {
      const isFullscreen = !!(document.fullscreenElement || document.webkitFullscreenElement)
      const orientation = window.screen?.orientation

      if (!orientation?.lock) return // unsupported (iOS, some older browsers) — no-op

      if (isFullscreen) {
        orientation.lock('landscape').catch(() => {
          // Some browsers reject lock() outside a user gesture / non-fullscreen
          // context — safe to ignore, user can still rotate manually.
        })
      } else {
        try { orientation.unlock?.() } catch { /* ignore */ }
      }
    }

    document.addEventListener('fullscreenchange', onFsChange)
    document.addEventListener('webkitfullscreenchange', onFsChange) // Safari-prefixed, harmless no-op elsewhere
    return () => {
      document.removeEventListener('fullscreenchange', onFsChange)
      document.removeEventListener('webkitfullscreenchange', onFsChange)
    }
  }, [])
}