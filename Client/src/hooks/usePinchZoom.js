// src/hooks/usePinchZoom.js
// Two-finger pinch (touch) + Ctrl/⌘-scroll / trackpad-pinch (desktop) zoom for
// a scrollable viewer — ONLY the viewer zooms, never the whole website.
//
// How it works (why it's smooth):
//  • While the fingers are moving we apply the CSS `zoom` property to the
//    content wrapper. That's layout-affecting, so the scroll extents stay
//    correct and we can keep the point between the fingers fixed on screen
//    by adjusting scrollLeft/scrollTop on every move. No canvas re-render yet.
//  • When the gesture ends we commit the final value to the `zoom` state
//    (flushSync), drop the temporary CSS zoom in the same frame, and the
//    pages re-render crisp at the new scale.
//
// Usage:
//   const contentRef = useRef(null)
//   const { pinchingRef } = usePinchZoom({ containerRef, contentRef, zoom, setZoom })
//   <div ref={containerRef} style={{ touchAction: 'pan-x pan-y' }} className="overflow-auto">
//     <div ref={contentRef} style={{ width: 'max-content', margin: '0 auto' }}>…pages…</div>
//   </div>
// `pinchingRef.current` is true while a pinch is active, so a drawing layer
// can cancel an in-progress pen stroke when a second finger lands.
import { useEffect, useRef } from 'react'
import { flushSync } from 'react-dom'

export default function usePinchZoom({ containerRef, contentRef, zoom, setZoom, min = 0.5, max = 4 }) {
  const zoomRef = useRef(zoom)
  zoomRef.current = zoom
  const setZoomRef = useRef(setZoom)
  setZoomRef.current = setZoom
  const pinchingRef = useRef(false)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return undefined

    let g = null // active gesture: { kind, z0, r, ox, oy, wx, wy, d0 }
    let wheelTimer = null

    const clampR = (r, z0) => Math.min(max / z0, Math.max(min / z0, r))
    const dist = (t) => Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY)
    const mid = (t) => {
      const r = el.getBoundingClientRect()
      return { x: (t[0].clientX + t[1].clientX) / 2 - r.left, y: (t[0].clientY + t[1].clientY) / 2 - r.top }
    }

    // cx/cy = focal point in the container's viewport coords.
    function begin(kind, cx, cy) {
      const content = contentRef.current
      if (!content) return null
      const cr = el.getBoundingClientRect()
      const tr = content.getBoundingClientRect()
      const ox = tr.left - cr.left + el.scrollLeft // content origin, in scroll coords
      const oy = tr.top - cr.top + el.scrollTop
      return { kind, z0: zoomRef.current, r: 1, ox, oy, wx: el.scrollLeft + cx - ox, wy: el.scrollTop + cy - oy, d0: 0 }
    }

    function apply(cx, cy) {
      const content = contentRef.current
      if (!content || !g) return
      content.style.zoom = String(g.r)
      el.scrollLeft = g.ox + g.wx * g.r - cx
      el.scrollTop = g.oy + g.wy * g.r - cy
    }

    function commit() {
      if (!g) return
      const content = contentRef.current
      const next = Math.round(g.z0 * g.r * 1000) / 1000
      g = null
      clearTimeout(wheelTimer)
      if (!content) return
      if (Math.abs(next - zoomRef.current) < 0.001) { content.style.zoom = ''; return }
      flushSync(() => setZoomRef.current(next))
      content.style.zoom = ''
    }

    function onTouchStart(e) {
      if (e.touches.length !== 2) return
      if (g) commit()
      const m = mid(e.touches)
      const next = begin('touch', m.x, m.y)
      if (!next) return
      g = next
      g.d0 = dist(e.touches) || 1
      pinchingRef.current = true
    }

    function onTouchMove(e) {
      if (!g || g.kind !== 'touch' || e.touches.length < 2) return
      e.preventDefault() // stop the browser scrolling / page-zooming under the fingers
      const m = mid(e.touches)
      g.r = clampR(dist(e.touches) / g.d0, g.z0)
      apply(m.x, m.y)
    }

    function onTouchEnd(e) {
      if (!g || g.kind !== 'touch' || e.touches.length >= 2) return
      commit()
      // keep the flag up briefly so the lifting finger can't leave a stray pen dot
      setTimeout(() => { pinchingRef.current = false }, 150)
    }

    function onWheel(e) {
      if (!e.ctrlKey && !e.metaKey) return // plain scroll stays normal scroll
      e.preventDefault()
      const rect = el.getBoundingClientRect()
      const cx = e.clientX - rect.left
      const cy = e.clientY - rect.top
      if (!g) {
        g = begin('wheel', cx, cy)
        if (!g) return
      } else if (g.kind !== 'wheel') return
      const k = Math.abs(e.deltaY) > 50 ? 0.002 : 0.01 // mouse wheel steps vs trackpad pinch
      g.r = clampR(g.r * Math.exp(-e.deltaY * k), g.z0)
      apply(cx, cy)
      clearTimeout(wheelTimer)
      wheelTimer = setTimeout(commit, 180)
    }

    el.addEventListener('touchstart', onTouchStart, { passive: true })
    el.addEventListener('touchmove', onTouchMove, { passive: false })
    el.addEventListener('touchend', onTouchEnd)
    el.addEventListener('touchcancel', onTouchEnd)
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => {
      el.removeEventListener('touchstart', onTouchStart)
      el.removeEventListener('touchmove', onTouchMove)
      el.removeEventListener('touchend', onTouchEnd)
      el.removeEventListener('touchcancel', onTouchEnd)
      el.removeEventListener('wheel', onWheel)
      clearTimeout(wheelTimer)
      if (contentRef.current) contentRef.current.style.zoom = ''
    }
  }, [containerRef, contentRef, min, max])

  return { pinchingRef }
}