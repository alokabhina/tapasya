// src/components/pdf/ImageViewer.jsx
// Full-screen viewer for an item's revision pics.
//  • Two-finger pinch zoom (zooms around the fingers) with a smooth settle on release
//  • One-finger pan when zoomed — with momentum (it keeps gliding after you let go)
//    and a soft rubber-band at the edges that springs back
//  • Double-tap / double-click: animated zoom in & out
//  • Swipe left/right (or ←/→ keys, or the arrow buttons) to change pic
//  • Desktop: Ctrl/⌘ + scroll or trackpad pinch zooms; plain scroll pans when zoomed; Esc closes
// Only the picture zooms — the rest of the site is untouched.
import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

const MIN_S = 1
const MAX_S = 5
const clamp = (v, a, b) => Math.min(b, Math.max(a, v))
// resistance past an edge: moves with the finger, but less and less (capped), then springs back
const soft = (v, m) => (Math.abs(v) <= m ? v : Math.sign(v) * (m + Math.min(90, (Math.abs(v) - m) * 0.35)))

export default function ImageViewer({ images = [], startIndex = 0, title = '', onClose }) {
  const [index, setIndex] = useState(clamp(startIndex, 0, Math.max(0, images.length - 1)))
  const [loaded, setLoaded] = useState(false)
  const stageRef = useRef(null)
  const imgRef = useRef(null)
  const tf = useRef({ s: 1, x: 0, y: 0 })
  const pointers = useRef(new Map())
  const gesture = useRef(null)
  const lastTap = useRef({ t: 0, x: 0, y: 0 })
  const raf = useRef(0)

  const paint = useCallback(() => {
    const img = imgRef.current
    if (!img) return
    const { s, x, y } = tf.current
    img.style.transform = `translate3d(${x}px, ${y}px, 0) scale(${s})`
  }, [])

  const stop = useCallback(() => {
    cancelAnimationFrame(raf.current)
    raf.current = 0
  }, [])

  // how far the picture may travel from centre at scale s before it'd leave the screen
  const bounds = useCallback((s) => {
    const stage = stageRef.current
    const img = imgRef.current
    if (!stage || !img) return { mx: 0, my: 0 }
    return {
      mx: Math.max(0, (img.offsetWidth * s - stage.clientWidth) / 2),
      my: Math.max(0, (img.offsetHeight * s - stage.clientHeight) / 2),
    }
  }, [])

  const clampT = useCallback((t) => {
    const { mx, my } = bounds(t.s)
    return { s: t.s, x: clamp(t.x, -mx, mx), y: clamp(t.y, -my, my) }
  }, [bounds])

  // smooth ease-out glide from wherever we are to `target`
  const animateTo = useCallback((target, dur = 240) => {
    stop()
    const from = { ...tf.current }
    const t0 = performance.now()
    const step = (now) => {
      const p = Math.min(1, (now - t0) / dur)
      const e = 1 - Math.pow(1 - p, 3)
      tf.current = {
        s: from.s + (target.s - from.s) * e,
        x: from.x + (target.x - from.x) * e,
        y: from.y + (target.y - from.y) * e,
      }
      paint()
      raf.current = p < 1 ? requestAnimationFrame(step) : 0
    }
    raf.current = requestAnimationFrame(step)
  }, [paint, stop])

  // momentum: keep gliding with the release velocity (px/ms), slowing down by friction
  const fling = useCallback((vx, vy) => {
    stop()
    let last = performance.now()
    const step = (now) => {
      const dt = Math.min(32, now - last)
      last = now
      const { s } = tf.current
      const { mx, my } = bounds(s)
      let { x, y } = tf.current
      x += vx * dt
      y += vy * dt
      if (x > mx || x < -mx) { x = clamp(x, -mx, mx); vx = 0 }
      if (y > my || y < -my) { y = clamp(y, -my, my); vy = 0 }
      const f = Math.pow(0.93, dt / 16.67)
      vx *= f
      vy *= f
      tf.current = { s, x, y }
      paint()
      raf.current = Math.hypot(vx, vy) > 0.02 ? requestAnimationFrame(step) : 0
    }
    raf.current = requestAnimationFrame(step)
  }, [bounds, paint, stop])

  const reset = useCallback((animate = false) => {
    if (animate) animateTo({ s: 1, x: 0, y: 0 }, 240)
    else { stop(); tf.current = { s: 1, x: 0, y: 0 }; paint() }
  }, [animateTo, paint, stop])

  useEffect(() => { reset(false); setLoaded(false) }, [index, reset])
  useEffect(() => stop, [stop])

  const go = useCallback((dir) => {
    setIndex((i) => clamp(i + dir, 0, images.length - 1))
  }, [images.length])

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose?.()
      else if (e.key === 'ArrowLeft') go(-1)
      else if (e.key === 'ArrowRight') go(1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [go, onClose])

  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [])

  // where the picture should end up if we zoom to nextS around (fx, fy) [stage-centre coords]
  const zoomTarget = useCallback((fx, fy, nextS) => {
    const { s, x, y } = tf.current
    const ns = clamp(nextS, MIN_S, MAX_S)
    if (ns <= 1.001) return { s: 1, x: 0, y: 0 }
    const k = ns / s
    return clampT({ s: ns, x: fx - (fx - x) * k, y: fy - (fy - y) * k })
  }, [clampT])

  const rel = (clientX, clientY) => {
    const r = stageRef.current.getBoundingClientRect()
    return { x: clientX - (r.left + r.width / 2), y: clientY - (r.top + r.height / 2) }
  }

  // desktop wheel / trackpad
  useEffect(() => {
    const el = stageRef.current
    if (!el) return undefined
    const onWheel = (e) => {
      e.preventDefault()
      stop()
      if (e.ctrlKey || e.metaKey || tf.current.s <= 1.001) {
        const f = rel(e.clientX, e.clientY)
        const k = e.ctrlKey || e.metaKey ? 0.01 : 0.0018
        tf.current = zoomTarget(f.x, f.y, tf.current.s * Math.exp(-e.deltaY * k))
      } else {
        // two-finger scroll / wheel while zoomed → pan
        tf.current = clampT({ s: tf.current.s, x: tf.current.x - e.deltaX, y: tf.current.y - e.deltaY })
      }
      paint()
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [zoomTarget, clampT, paint, stop])

  const startPan = (p) => {
    gesture.current = {
      type: 'pan', sx: p.x, sy: p.y, tx: tf.current.x, ty: tf.current.y,
      moved: false, t0: Date.now(), dx: 0, samples: [{ t: performance.now(), x: p.x, y: p.y }],
    }
  }

  const onPointerDown = (e) => {
    if (e.target.closest('[data-ui]')) return
    stop() // touching the screen stops any glide in progress
    stageRef.current.setPointerCapture?.(e.pointerId)
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()]
      const m = rel((a.x + b.x) / 2, (a.y + b.y) / 2)
      gesture.current = { type: 'pinch', d0: Math.hypot(a.x - b.x, a.y - b.y) || 1, s0: tf.current.s, x0: tf.current.x, y0: tf.current.y, m0: m }
    } else if (pointers.current.size === 1) {
      startPan({ x: e.clientX, y: e.clientY })
    }
  }

  const onPointerMove = (e) => {
    const p = pointers.current.get(e.pointerId)
    if (!p) return
    p.x = e.clientX
    p.y = e.clientY
    const g = gesture.current
    if (!g) return

    if (g.type === 'pinch' && pointers.current.size >= 2) {
      const [a, b] = [...pointers.current.values()]
      const d = Math.hypot(a.x - b.x, a.y - b.y)
      const m = rel((a.x + b.x) / 2, (a.y + b.y) / 2)
      const s = clamp(g.s0 * (d / g.d0), 0.8, MAX_S) // a little under-zoom allowed; settles back on release
      const k = s / g.s0
      const nx = m.x - (g.m0.x - g.x0) * k
      const ny = m.y - (g.m0.y - g.y0) * k
      if (s > 1) {
        const { mx, my } = bounds(s)
        tf.current = { s, x: soft(nx, mx), y: soft(ny, my) }
      } else {
        tf.current = { s, x: nx, y: ny }
      }
      paint()
    } else if (g.type === 'pan') {
      const dx = e.clientX - g.sx
      const dy = e.clientY - g.sy
      if (Math.abs(dx) > 6 || Math.abs(dy) > 6) g.moved = true
      g.dx = dx
      const now = performance.now()
      g.samples.push({ t: now, x: e.clientX, y: e.clientY })
      while (g.samples.length > 2 && now - g.samples[0].t > 100) g.samples.shift()

      if (tf.current.s > 1.001) {
        const { mx, my } = bounds(tf.current.s)
        tf.current = { s: tf.current.s, x: soft(g.tx + dx, mx), y: soft(g.ty + dy, my) }
        paint()
      } else if (images.length > 1) {
        tf.current = { s: 1, x: dx * 0.6, y: 0 } // follow the finger a little while swiping between pics
        paint()
      }
    }
  }

  const endPointer = (e) => {
    if (!pointers.current.delete(e.pointerId)) return
    const g = gesture.current

    if (g?.type === 'pinch') {
      // settle: snap back inside the allowed range / edges with a smooth ease
      const { s, x, y } = tf.current
      animateTo(s < 1.02 ? { s: 1, x: 0, y: 0 } : clampT({ s, x, y }), 240)
      const rest = [...pointers.current.values()][0]
      if (rest) startPan(rest)
      else gesture.current = null
      return
    }

    if (g?.type === 'pan') {
      gesture.current = null
      const now = Date.now()

      // a tap (no real movement) → maybe the 2nd tap of a double-tap
      if (!g.moved && now - g.t0 < 300) {
        const lt = lastTap.current
        if (now - lt.t < 320 && Math.hypot(e.clientX - lt.x, e.clientY - lt.y) < 30) {
          lastTap.current = { t: 0, x: 0, y: 0 }
          const f = rel(e.clientX, e.clientY)
          animateTo(tf.current.s > 1.05 ? { s: 1, x: 0, y: 0 } : zoomTarget(f.x, f.y, 2.5), 260)
        } else {
          lastTap.current = { t: now, x: e.clientX, y: e.clientY }
        }
        return
      }

      if (tf.current.s > 1.001) {
        const { x, y } = tf.current
        const c = clampT(tf.current)
        if (Math.abs(c.x - x) > 0.5 || Math.abs(c.y - y) > 0.5) {
          animateTo(c, 280) // dragged past an edge → spring back
          return
        }
        // release velocity from the last ~100ms of movement; a paused finger = no glide
        const sm = g.samples
        const first = sm[0]
        const last = sm[sm.length - 1]
        const span = last.t - first.t
        if (span > 8 && performance.now() - last.t < 60) {
          const vx = (last.x - first.x) / span
          const vy = (last.y - first.y) / span
          if (Math.hypot(vx, vy) > 0.15) fling(clamp(vx, -4, 4), clamp(vy, -4, 4))
        }
        return
      }

      // not zoomed: was it a swipe to the next / previous pic?
      if (Math.abs(g.dx) > 60 && images.length > 1) {
        if (g.dx < 0 && index < images.length - 1) { go(1); return }
        if (g.dx > 0 && index > 0) { go(-1); return }
      }
      reset(true)
    }
  }

  if (!images.length) return null
  const cur = images[index]

  return createPortal(
    <div className="fixed inset-0 z-[130] bg-black/95 flex flex-col select-none" role="dialog" aria-modal="true">
      <div data-ui className="flex items-center gap-3 px-3 py-2.5 bg-black/60 backdrop-blur border-b border-white/10 shrink-0">
        <button onClick={onClose} className="w-9 h-9 rounded-lg bg-white/10 hover:bg-white/20 text-white flex items-center justify-center" aria-label="Close">
          <i className="ti ti-x text-lg" />
        </button>
        <p className="flex-1 min-w-0 text-sm text-white truncate">{title || 'Revision pics'}</p>
        <span className="text-xs text-slate-300 tabular-nums">{index + 1} / {images.length}</span>
      </div>

      <div
        ref={stageRef}
        className="relative flex-1 min-h-0 overflow-hidden flex items-center justify-center"
        style={{ touchAction: 'none' }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endPointer}
        onPointerCancel={endPointer}
      >
        {!loaded && <i className="ti ti-loader-2 animate-spin text-3xl text-slate-400 absolute" />}
        <img
          ref={imgRef}
          key={cur.url}
          src={cur.url}
          alt={`${title || 'Pic'} ${index + 1}`}
          draggable={false}
          onLoad={() => setLoaded(true)}
          className="max-w-full max-h-full object-contain will-change-transform"
          style={{ transformOrigin: 'center center' }}
        />

        {images.length > 1 && (
          <>
            <button data-ui onClick={() => go(-1)} disabled={index === 0}
              className="hidden sm:flex absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 disabled:opacity-20 text-white items-center justify-center" aria-label="Previous">
              <i className="ti ti-chevron-left text-xl" />
            </button>
            <button data-ui onClick={() => go(1)} disabled={index === images.length - 1}
              className="hidden sm:flex absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 disabled:opacity-20 text-white items-center justify-center" aria-label="Next">
              <i className="ti ti-chevron-right text-xl" />
            </button>
          </>
        )}
      </div>

      <div data-ui className="shrink-0 px-3 py-2 text-center text-[11px] text-slate-400 bg-black/60 border-t border-white/10">
        Do ungli se pinch karke zoom · double-tap bhi chalega{images.length > 1 ? ' · left/right swipe se agli pic' : ''}
      </div>
    </div>,
    document.body
  )
}