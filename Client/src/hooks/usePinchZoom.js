// src/hooks/usePinchZoom.js
// Two-finger pinch (touch) + Ctrl/⌘-scroll / trackpad-pinch (desktop) zoom for
// a scrollable viewer — ONLY the viewer zooms, never the whole website.
//
// How it works:
//  • While the fingers move we only change a CSS `transform` (translate + scale)
//    on the content wrapper, with transform-origin pinned to the spot between
//    the fingers. That's GPU-composited — no layout, no canvas re-render, no
//    scroll changes — so it stays smooth even on a phone with 20 pages.
//  • On touch we also freeze native scrolling for the length of the pinch
//    (overflow:hidden). Otherwise, if one finger had already started a scroll,
//    the browser keeps scrolling underneath the pinch and the page "fights" you.
//  • When the gesture ends we commit the final zoom to React state (flushSync),
//    drop the temporary transform in the same frame, then set scrollLeft/Top so
//    the exact point that was between your fingers is still between them. That
//    point is remembered as "this far down THIS page" (like pdf.js / Google Drive
//    do), not as a share of the whole document, so it stays exact no matter how
//    the pages above it happen to be sized. The pages re-render crisp at the new
//    scale a moment later.
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

    let g = null // active gesture: { kind, z0, r, wx, wy, anchor, cx0, cy0, dx, dy, d0 }
    let wheelTimer = null
    let locked = false // native scrolling frozen (touch pinch only) — released once ALL fingers are up
    let prevOverflow = ''
    const lock = () => { if (!locked) { locked = true; prevOverflow = el.style.overflow; el.style.overflow = 'hidden' } }
    const unlock = () => { if (locked) { locked = false; el.style.overflow = prevOverflow } }

    const clampR = (r, z0) => Math.min(max / z0, Math.max(min / z0, r))
    const dist = (t) => Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY)
    const mid = (t) => {
      const r = el.getBoundingClientRect()
      return { x: (t[0].clientX + t[1].clientX) / 2 - r.left, y: (t[0].clientY + t[1].clientY) / 2 - r.top }
    }
    // content wrapper's top-left, in the container's scroll coordinates
    function contentOrigin() {
      const content = contentRef.current
      const cr = el.getBoundingClientRect()
      const tr = content.getBoundingClientRect()
      return { ox: tr.left - cr.left + el.scrollLeft, oy: tr.top - cr.top + el.scrollTop }
    }

    // cx/cy = focal point in the container's viewport coords.
    function begin(kind, cx, cy) {
      const content = contentRef.current
      if (!content) return null
      const { ox, oy } = contentOrigin()
      const wx = el.scrollLeft + cx - ox // focal point in content coords (at the current zoom)
      const wy = el.scrollTop + cy - oy
      content.style.transformOrigin = `${wx}px ${wy}px`

      // Which page is under the focal point, and how far across / down it (0..1)?
      const cr = el.getBoundingClientRect()
      const fxClient = cr.left + cx
      const fyClient = cr.top + cy
      let anchor = null
      let bestDist = Infinity
      for (const pageEl of content.children) {
        const r = pageEl.getBoundingClientRect()
        if (!r.height || !r.width) continue
        const d = fyClient < r.top ? r.top - fyClient : fyClient > r.bottom ? fyClient - r.bottom : 0
        if (d < bestDist) {
          bestDist = d
          anchor = { el: pageEl, fx: (fxClient - r.left) / r.width, fy: (fyClient - r.top) / r.height }
          if (d === 0) break
        }
      }
      return { kind, z0: zoomRef.current, r: 1, wx, wy, anchor, cx0: cx, cy0: cy, dx: 0, dy: 0, d0: 0 }
    }

    function apply(cx, cy) {
      const content = contentRef.current
      if (!content || !g) return
      g.dx = cx - g.cx0
      g.dy = cy - g.cy0
      content.style.transform = `translate3d(${g.dx}px, ${g.dy}px, 0) scale(${g.r})`
    }

    function commit() {
      if (!g) return
      const cur = g
      g = null
      clearTimeout(wheelTimer)
      const content = contentRef.current
      if (!content) return
      content.style.transform = ''
      content.style.transformOrigin = ''
      const next = Math.round(cur.z0 * cur.r * 1000) / 1000
      if (Math.abs(next - zoomRef.current) < 0.001) return
      flushSync(() => setZoomRef.current(next)) // pages take their new size now (before the next paint)

      const cr = el.getBoundingClientRect()
      const targetX = cr.left + cur.cx0 + cur.dx // where the focal point should be on screen now
      const targetY = cr.top + cur.cy0 + cur.dy
      if (cur.anchor && cur.anchor.el.isConnected) {
        const r = cur.anchor.el.getBoundingClientRect()
        el.scrollLeft += r.left + cur.anchor.fx * r.width - targetX
        el.scrollTop += r.top + cur.anchor.fy * r.height - targetY
      } else {
        // fallback: proportional placement
        const rr = next / cur.z0
        const { ox, oy } = contentOrigin()
        el.scrollLeft = ox + cur.wx * rr - (cur.cx0 + cur.dx)
        el.scrollTop = oy + cur.wy * rr - (cur.cy0 + cur.dy)
      }
    }

    function onTouchStart(e) {
      if (e.touches.length !== 2) return
      if (g) commit()
      const m = mid(e.touches)
      const next = begin('touch', m.x, m.y)
      if (!next) return
      g = next
      g.d0 = dist(e.touches) || 1
      lock() // stop any native scroll that one finger already started
      pinchingRef.current = true
    }

    function onTouchMove(e) {
      if (!g || g.kind !== 'touch' || e.touches.length < 2) return
      if (e.cancelable) e.preventDefault()
      const m = mid(e.touches)
      g.r = clampR(dist(e.touches) / g.d0, g.z0)
      apply(m.x, m.y)
    }

    function onTouchEnd(e) {
      if (g && g.kind === 'touch' && e.touches.length < 2) {
        commit()
        // keep the flag up briefly so the lifting finger can't leave a stray pen dot
        setTimeout(() => { pinchingRef.current = false }, 150)
      }
      // Stay frozen until EVERY finger is off the glass — otherwise the finger that's still
      // down would start a normal scroll the moment the pinch ends and drag the page up/down.
      if (e.touches.length === 0) unlock()
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

    // iOS Safari has its own pinch events that would zoom the whole page
    const blockGesture = (e) => e.preventDefault()

    el.addEventListener('touchstart', onTouchStart, { passive: true })
    el.addEventListener('touchmove', onTouchMove, { passive: false })
    el.addEventListener('touchend', onTouchEnd)
    el.addEventListener('touchcancel', onTouchEnd)
    el.addEventListener('wheel', onWheel, { passive: false })
    el.addEventListener('gesturestart', blockGesture)
    el.addEventListener('gesturechange', blockGesture)
    el.addEventListener('gestureend', blockGesture)
    return () => {
      el.removeEventListener('touchstart', onTouchStart)
      el.removeEventListener('touchmove', onTouchMove)
      el.removeEventListener('touchend', onTouchEnd)
      el.removeEventListener('touchcancel', onTouchEnd)
      el.removeEventListener('wheel', onWheel)
      el.removeEventListener('gesturestart', blockGesture)
      el.removeEventListener('gesturechange', blockGesture)
      el.removeEventListener('gestureend', blockGesture)
      clearTimeout(wheelTimer)
      unlock()
      const content = contentRef.current
      if (content) { content.style.transform = ''; content.style.transformOrigin = '' }
    }
  }, [containerRef, contentRef, min, max])

  return { pinchingRef }
}