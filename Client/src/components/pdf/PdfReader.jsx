// src/components/pdf/PdfReader.jsx
// Full-screen PDF reader with freehand annotation:
// - Base canvas renders the actual PDF page (via pdf.js, loaded from CDN).
// - A transparent overlay canvas sits on top and captures pen/marker/eraser
//   strokes. Strokes are stored as normalized (0–1) points per page, so they
//   stay correctly positioned regardless of zoom/canvas size.
// - "Save annotated" uses pdf-lib (also CDN) to load a FRESH copy of the
//   ORIGINAL PDF bytes and draw the strokes onto it as vector lines, then
//   exports a brand new PDF file. The original Cloudinary resource is never
//   re-uploaded to, so it can't be corrupted by a save.
//
// UX notes (Edge-style continuous reader):
// - All pages are stacked vertically in one scrollable column. Pages lazily
//   render (via IntersectionObserver) as they scroll near the viewport, so
//   scrolling — not a "next page" button — is how you move through the doc.
// - Header + toolbar are merged into a SINGLE top bar so the page gets as
//   much vertical room as possible; there's no bottom bar at all, just a
//   small floating "n / N" pill that hovers over the content while scrolling.
// - Pen/marker thickness and marker "darkness" (opacity) are adjustable via
//   compact popovers, and the cursor turns into a little pen/eraser glyph
//   while a drawing tool is active — matching the feel of the Edge PDF
//   annotator shown in the reference screenshot.
import { useEffect, useRef, useState, useCallback, useLayoutEffect } from 'react'
import { saveAnnotatedPdf } from '@/api/pdfs'

const PDFJS_CDN = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js'
const PDFJS_WORKER_CDN = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js'
const PDFLIB_CDN = 'https://cdnjs.cloudflare.com/ajax/libs/pdf-lib/1.17.1/pdf-lib.min.js'

const COLORS = [
  { name: 'Yellow', hex: '#facc15' },
  { name: 'Orange', hex: '#fb923c' },
  { name: 'Red', hex: '#f87171' },
  { name: 'Pink', hex: '#f472b6' },
  { name: 'Purple', hex: '#a78bfa' },
  { name: 'Blue', hex: '#60a5fa' },
  { name: 'Cyan', hex: '#22d3ee' },
  { name: 'Green', hex: '#4ade80' },
  { name: 'White', hex: '#f8fafc' },
  { name: 'Black', hex: '#1e293b' },
]

function loadScript(src) {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) return resolve()
    const s = document.createElement('script')
    s.src = src
    s.onload = resolve
    s.onerror = reject
    document.head.appendChild(s)
  })
}

async function loadLibs() {
  if (!window.pdfjsLib) {
    await loadScript(PDFJS_CDN)
    window.pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER_CDN
  }
  if (!window.PDFLib) await loadScript(PDFLIB_CDN)
}

function hexToRgb01(hex) {
  const n = parseInt(hex.slice(1), 16)
  return { r: ((n >> 16) & 255) / 255, g: ((n >> 8) & 255) / 255, b: (n & 255) / 255 }
}

// ── Custom cursor glyphs (pen tip / eraser dot), Edge-style ────────────────
function svgCursor(svg, hx, hy, fallback) {
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}") ${hx} ${hy}, ${fallback}`
}
function getToolCursor(tool, color, eraserSize = 3) {
  if (tool === 'none') return 'auto'
  if (tool === 'eraser') {
    const r = 7 + eraserSize * 2.2
    const size = Math.ceil(r * 2 + 4)
    const c = size / 2
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}"><circle cx="${c}" cy="${c}" r="${r}" fill="white" fill-opacity="0.85" stroke="#334155" stroke-width="2"/></svg>`
    return svgCursor(svg, c, c, 'auto')
  }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 30 30"><g transform="rotate(45 15 15)"><rect x="13" y="3" width="4" height="16" rx="1.5" fill="${color}" stroke="#1e293b" stroke-width="1"/><polygon points="13,19 17,19 15,27" fill="#1e293b"/></g></svg>`
  return svgCursor(svg, 4, 27, 'crosshair')
}

function drawStroke(ctx, stroke, w, h) {
  if (stroke.points.length < 2) return
  ctx.save()
  ctx.lineJoin = 'round'
  ctx.lineCap = 'round'
  ctx.strokeStyle = stroke.color
  ctx.globalAlpha = stroke.opacity ?? (stroke.tool === 'marker' ? 0.35 : 1)
  ctx.lineWidth = stroke.width ?? (stroke.tool === 'marker' ? 16 : 3)
  ctx.beginPath()
  stroke.points.forEach((p, i) => {
    const x = p.x * w, y = p.y * h
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y)
  })
  ctx.stroke()
  ctx.restore()
}

// ── One page: lazily rendered when it scrolls near the viewport ────────────
function PageBlock({
  pageNum, pdfDoc, zoom, containerWidth, tool, color, penWidth, penOpacity, markerWidth, markerOpacity, eraserSize,
  strokes, onStroke, onErase, registerRenderObserver, registerViewObserver,
}) {
  const wrapRef = useRef(null)
  const baseCanvasRef = useRef(null)
  const overlayCanvasRef = useRef(null)
  const renderTaskRef = useRef(null)
  const drawingRef = useRef(false)
  const currentStrokeRef = useRef(null)
  const [rendered, setRendered] = useState(false)
  const [shouldRender, setShouldRender] = useState(false)

  // Register with the shared lazy-render observer once on mount.
  useEffect(() => {
    const el = wrapRef.current
    if (!el) return undefined
    return registerRenderObserver(el, () => setShouldRender(true))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Register with the shared "which page is on screen" observer.
  useEffect(() => {
    const el = wrapRef.current
    if (!el) return undefined
    return registerViewObserver(el, pageNum)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageNum])

  const render = useCallback(async () => {
    if (!pdfDoc || !baseCanvasRef.current || !overlayCanvasRef.current || !containerWidth) return
    const page = await pdfDoc.getPage(pageNum)
    const unscaledViewport = page.getViewport({ scale: 1 })
    const fitScale = Math.min(containerWidth, 1100) / unscaledViewport.width
    const viewport = page.getViewport({ scale: fitScale * zoom })
    const base = baseCanvasRef.current
    const overlay = overlayCanvasRef.current
    for (const canvas of [base, overlay]) {
      canvas.width = viewport.width
      canvas.height = viewport.height
      canvas.style.width = `${viewport.width}px`
      canvas.style.height = `${viewport.height}px`
    }
    if (renderTaskRef.current) {
      try { renderTaskRef.current.cancel() } catch { /* previous task already done */ }
    }
    const task = page.render({ canvasContext: base.getContext('2d'), viewport })
    renderTaskRef.current = task
    try {
      await task.promise
    } catch {
      return // cancelled by a newer render (e.g. rapid zoom change)
    }
    setRendered(true)
    const ctx = overlay.getContext('2d')
    ctx.clearRect(0, 0, overlay.width, overlay.height)
    for (const s of strokes) drawStroke(ctx, s, overlay.width, overlay.height)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pdfDoc, pageNum, zoom, containerWidth])

  useEffect(() => { if (shouldRender) render() }, [shouldRender, render])

  // Redraw strokes whenever they change (new stroke added / erased / undone).
  useEffect(() => {
    if (!rendered) return
    const overlay = overlayCanvasRef.current
    if (!overlay) return
    const ctx = overlay.getContext('2d')
    ctx.clearRect(0, 0, overlay.width, overlay.height)
    for (const s of strokes) drawStroke(ctx, s, overlay.width, overlay.height)
  }, [strokes, rendered])

  function getNormalizedPoint(e) {
    const canvas = overlayCanvasRef.current
    const rect = canvas.getBoundingClientRect()
    return { x: (e.clientX - rect.left) / rect.width, y: (e.clientY - rect.top) / rect.height }
  }

  function handlePointerDown(e) {
    if (tool === 'none') return // read/scroll mode — overlay has pointer-events:none anyway
    e.preventDefault()
    const pt = getNormalizedPoint(e)
    if (tool === 'eraser') {
      drawingRef.current = true
      onErase(pageNum, pt)
      overlayCanvasRef.current.setPointerCapture(e.pointerId)
      return
    }
    drawingRef.current = true
    const width = tool === 'marker' ? markerWidth : penWidth
    const opacity = tool === 'marker' ? markerOpacity : penOpacity
    currentStrokeRef.current = { tool, color, width, opacity, points: [pt] }
    overlayCanvasRef.current.setPointerCapture(e.pointerId)
  }

  function handlePointerMove(e) {
    if (!drawingRef.current) return
    const pt = getNormalizedPoint(e)
    if (tool === 'eraser') { onErase(pageNum, pt); return }
    currentStrokeRef.current.points.push(pt)
    const ctx = overlayCanvasRef.current.getContext('2d')
    const w = overlayCanvasRef.current.width, h = overlayCanvasRef.current.height
    const seg = { ...currentStrokeRef.current, points: currentStrokeRef.current.points.slice(-2) }
    drawStroke(ctx, seg, w, h)
  }

  function handlePointerUp() {
    if (!drawingRef.current) return
    drawingRef.current = false
    if (tool === 'eraser') return
    const stroke = currentStrokeRef.current
    currentStrokeRef.current = null
    if (stroke && stroke.points.length > 1) onStroke(pageNum, stroke)
  }

  const placeholderH = Math.round(containerWidth * 1.414 * zoom) || 400

  return (
    <div
      ref={wrapRef}
      data-page={pageNum}
      className="relative mx-auto mb-4"
      style={{ width: rendered ? undefined : containerWidth, minHeight: rendered ? undefined : placeholderH }}
    >
      {!rendered && (
        <div
          className="flex items-center justify-center rounded-lg bg-slate-900/60 border border-slate-800/40 animate-pulse"
          style={{ width: containerWidth, height: placeholderH }}
        >
          <span className="text-[11px] text-slate-600">Page {pageNum}</span>
        </div>
      )}
      <canvas ref={baseCanvasRef} className={`rounded-lg shadow-xl block mx-auto ${rendered ? '' : 'hidden'}`} />
      <canvas
        ref={overlayCanvasRef}
        className={`absolute inset-0 ${tool === 'none' ? 'pointer-events-none' : 'touch-none'} ${rendered ? '' : 'hidden'}`}
        style={{ cursor: getToolCursor(tool, color, eraserSize) }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
      />
    </div>
  )
}

export default function PdfReader({ doc, onClose, onSaved }) {
  const viewerContainerRef = useRef(null)
  const pdfDocRef = useRef(null) // pdf.js document proxy (for viewing)

  // Shared observers so we don't spin up one IntersectionObserver per page.
  const renderObserverRef = useRef(null)
  const renderCallbacksRef = useRef(new Map())
  const viewObserverRef = useRef(null)
  const viewPagesRef = useRef(new Map())
  const visibilityRef = useRef(new Map())

  const [libsReady, setLibsReady] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [numPages, setNumPages] = useState(0)
  const [pdfReady, setPdfReady] = useState(false)
  const [currentPage, setCurrentPage] = useState(1) // derived from scroll position, for the floating indicator
  const [containerWidth, setContainerWidth] = useState(800)
  const [zoom, setZoom] = useState(1)
  const [tool, setTool] = useState('none') // 'none' = read/scroll mode (default) — pen kabhi apne aap select nahi rehta
  const [color, setColor] = useState(COLORS[0].hex)
  const [penWidth, setPenWidth] = useState(3)
  const [penOpacity, setPenOpacity] = useState(1) // pen ki apni darkness — pehle sirf marker ki thi
  const [markerWidth, setMarkerWidth] = useState(16)
  const [markerOpacity, setMarkerOpacity] = useState(0.35)
  const [eraserSize, setEraserSize] = useState(3) // 1–10, eraser ki "size" (chota/bada)
  const [panelOpen, setPanelOpen] = useState(null) // 'thickness' | 'opacity' | 'eraser' | 'color' | null
  const [annotations, setAnnotations] = useState({}) // { [pageNum]: Stroke[] }
  const [undoStack, setUndoStack] = useState([]) // [{ pageNum, snapshot }] — history for Undo
  const [redoStack, setRedoStack] = useState([]) // [{ pageNum, snapshot }] — history for Redo
  const customColorInputRef = useRef(null)
  const [saving, setSaving] = useState(false)
  const [dirty, setDirty] = useState(false) // any unsaved strokes since last save
  const [autoSaveState, setAutoSaveState] = useState('saved') // 'saved' | 'pending' | 'saving' | 'error' — drives the status pill so you always know your marks are safe
  const [downloading, setDownloading] = useState(false)
  // Which file we're viewing/building on top of. Default to continuing on
  // the existing annotated version (if any) so previous markup isn't lost —
  // new strokes just add to it, and saving updates that SAME file. Switch
  // to 'original' to start fresh from the clean, untouched copy instead.
  const [editingSource, setEditingSource] = useState(doc.annotatedUrl ? 'annotated' : 'original')
  const sourceUrl = editingSource === 'annotated' && doc.annotatedUrl ? doc.annotatedUrl : doc.originalUrl

  // ── Load pdf.js + pdf-lib, then the PDF itself ──────────────────────────
  useEffect(() => {
    let cancelled = false
    loadLibs()
      .then(() => { if (!cancelled) setLibsReady(true) })
      .catch(() => { if (!cancelled) setError(true) })
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    if (!libsReady) return
    let cancelled = false
    setLoading(true)
    setPdfReady(false)
    setAnnotations({}) // fresh strokes for this editing session — the base PDF already carries prior markup if 'annotated' was picked
    fetch(sourceUrl)
      .then((r) => {
        if (!r.ok) throw new Error(`PDF fetch failed: HTTP ${r.status}`)
        return r.arrayBuffer()
      })
      .then((buf) => window.pdfjsLib.getDocument({ data: buf }).promise)
      .then((pdf) => {
        if (cancelled) return
        pdfDocRef.current = pdf
        setNumPages(pdf.numPages)
        setCurrentPage(1)
        setError(false)
        setPdfReady(true)
        viewerContainerRef.current?.scrollTo({ top: 0 })
      })
      .catch((err) => {
        // eslint-disable-next-line no-console
        console.error('PDF load failed:', err.message, '— check Cloudinary Settings → Security → "PDF and ZIP files delivery" if this is a 401/403.')
        if (!cancelled) setError(true)
      })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [libsReady, sourceUrl])

  // ── Measure the stable scroll container's width (drives page fit-scale) ─
  useLayoutEffect(() => {
    function measure() {
      if (viewerContainerRef.current) setContainerWidth(viewerContainerRef.current.clientWidth - 32)
    }
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [])

  // ── Shared observer #1: lazily render a page once it's near the viewport ─
  useEffect(() => {
    const root = viewerContainerRef.current
    if (!root) return undefined
    renderObserverRef.current = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return
        const cb = renderCallbacksRef.current.get(entry.target)
        if (cb) cb()
        renderObserverRef.current.unobserve(entry.target)
        renderCallbacksRef.current.delete(entry.target)
      })
    }, { root, rootMargin: '1200px 0px', threshold: 0.01 })
    return () => renderObserverRef.current?.disconnect()
  }, [])

  function registerRenderObserver(el, cb) {
    renderCallbacksRef.current.set(el, cb)
    renderObserverRef.current?.observe(el)
    return () => { renderObserverRef.current?.unobserve(el); renderCallbacksRef.current.delete(el) }
  }

  // ── Shared observer #2: track which page is most visible, for the pill ──
  useEffect(() => {
    const root = viewerContainerRef.current
    if (!root) return undefined
    viewObserverRef.current = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        const pn = viewPagesRef.current.get(entry.target)
        if (pn) visibilityRef.current.set(pn, entry.intersectionRatio)
      })
      let best = null, bestRatio = 0
      visibilityRef.current.forEach((ratio, pn) => {
        if (ratio > bestRatio) { bestRatio = ratio; best = pn }
      })
      if (best) setCurrentPage(best)
    }, { root, threshold: [0, 0.1, 0.25, 0.5, 0.75, 1] })
    return () => viewObserverRef.current?.disconnect()
  }, [])

  function registerViewObserver(el, pageNum) {
    viewPagesRef.current.set(el, pageNum)
    viewObserverRef.current?.observe(el)
    return () => {
      viewObserverRef.current?.unobserve(el)
      viewPagesRef.current.delete(el)
      visibilityRef.current.delete(pageNum)
    }
  }

  // Har mutating action se pehle current state history me push kr dete hain,
  // taaki Undo/Redo kaam kr sake. Naya stroke/erase hote hi redo stack clear
  // ho jata hai (jaise Word/Photoshop me hota hai).
  function pushHistory(pageNum, snapshot) {
    setUndoStack((s) => [...s.slice(-49), { pageNum, snapshot }])
    setRedoStack([])
  }

  function handleStroke(pageNum, stroke) {
    setAnnotations((prev) => {
      const before = prev[pageNum] || []
      pushHistory(pageNum, before)
      return { ...prev, [pageNum]: [...before, stroke] }
    })
    setDirty(true)
  }

  function handleErase(pageNum, pt) {
    setAnnotations((prev) => {
      const strokes = prev[pageNum] || []
      // eraserSize (1–10) se threshold scale hota hai, taaki eraser "chota/bada" kiya ja sake
      const threshold = 0.02 * (eraserSize / 3)
      let nearestIdx = -1, nearestDist = Infinity
      strokes.forEach((s, idx) => {
        for (const p of s.points) {
          const d = Math.hypot(p.x - pt.x, p.y - pt.y)
          if (d < nearestDist) { nearestDist = d; nearestIdx = idx }
        }
      })
      if (nearestIdx >= 0 && nearestDist < threshold * 3) {
        pushHistory(pageNum, strokes)
        const next = [...strokes]
        next.splice(nearestIdx, 1)
        setDirty(true)
        return { ...prev, [pageNum]: next }
      }
      return prev
    })
  }

  function undo() {
    if (!undoStack.length) return
    const last = undoStack[undoStack.length - 1]
    const currentSnapshot = annotations[last.pageNum] || []
    setRedoStack((r) => [...r, { pageNum: last.pageNum, snapshot: currentSnapshot }])
    setAnnotations((prev) => ({ ...prev, [last.pageNum]: last.snapshot }))
    setUndoStack((s) => s.slice(0, -1))
    setDirty(true)
  }

  function redo() {
    if (!redoStack.length) return
    const last = redoStack[redoStack.length - 1]
    const currentSnapshot = annotations[last.pageNum] || []
    setUndoStack((s) => [...s, { pageNum: last.pageNum, snapshot: currentSnapshot }])
    setAnnotations((prev) => ({ ...prev, [last.pageNum]: last.snapshot }))
    setRedoStack((r) => r.slice(0, -1))
    setDirty(true)
  }

  // Keyboard shortcuts — Ctrl/Cmd+Z undo, Ctrl/Cmd+Shift+Z (ya Ctrl+Y) redo,
  // Esc se read/scroll mode (pen deselect), 1/2/3 se tool switch.
  useEffect(() => {
    function onKey(e) {
      const tag = e.target?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return
      const mod = e.ctrlKey || e.metaKey
      if (mod && e.key.toLowerCase() === 'z' && e.shiftKey) { e.preventDefault(); redo(); return }
      if (mod && e.key.toLowerCase() === 'y') { e.preventDefault(); redo(); return }
      if (mod && e.key.toLowerCase() === 'z') { e.preventDefault(); undo(); return }
      if (e.key === 'Escape') { setTool('none'); setPanelOpen(null); return }
      if (e.key === '1') setTool('pen')
      else if (e.key === '2') setTool('marker')
      else if (e.key === '3') setTool('eraser')
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [undoStack, redoStack, annotations])

  // ── Export: builds on top of the current editing base (original or the
  // existing annotated copy) so previous markup isn't lost — new strokes
  // just add to it. The base is only ever READ here, never modified; the
  // export always goes out as a brand new blob to the SAME annotated slot
  // (server overwrites it in place — see routes/pdfs.js), so re-saving
  // never creates extra files, just updates the one "annotated" copy.
  //
  // `silent` (used by auto-save) skips the alert() on failure — auto-save
  // retries on the next change anyway, and a popup mid-drawing would be
  // disruptive. Re-entrant calls (a new stroke landing while a save is
  // already in flight) don't stack up as concurrent saves — they just mark
  // one more save as pending and it runs right after the current one.
  const savingRef = useRef(false)
  const pendingSaveRef = useRef(false)

  async function handleSaveAnnotated({ silent = false } = {}) {
    if (savingRef.current) { pendingSaveRef.current = true; return }
    savingRef.current = true
    setSaving(true)
    setAutoSaveState('saving')
    try {
      const { PDFDocument, rgb, LineCapStyle } = window.PDFLib
      const bytes = await fetch(sourceUrl).then((r) => r.arrayBuffer())
      const pdfLibDoc = await PDFDocument.load(bytes)
      const pages = pdfLibDoc.getPages()

      for (const [pStr, strokes] of Object.entries(annotations)) {
        const idx = Number(pStr) - 1
        const page = pages[idx]
        if (!page || !strokes.length) continue
        const { width, height } = page.getSize()

        for (const stroke of strokes) {
          const { r, g, b } = hexToRgb01(stroke.color)
          for (let i = 0; i < stroke.points.length - 1; i++) {
            const p1 = stroke.points[i], p2 = stroke.points[i + 1]
            page.drawLine({
              start: { x: p1.x * width, y: height - p1.y * height },
              end: { x: p2.x * width, y: height - p2.y * height },
              thickness: stroke.width ?? (stroke.tool === 'marker' ? 16 : 3),
              color: rgb(r, g, b),
              opacity: stroke.opacity ?? (stroke.tool === 'marker' ? 0.35 : 1),
              lineCap: LineCapStyle.Round,
            })
          }
        }
      }

      const outBytes = await pdfLibDoc.save()
      const blob = new Blob([outBytes], { type: 'application/pdf' })
      const updated = await saveAnnotatedPdf(doc._id, blob)
      onSaved?.(updated)
      setDirty(false)
      setAutoSaveState('saved')
    } catch {
      setAutoSaveState('error')
      if (!silent) alert('Save nahi ho paya, dobara try karo')
    } finally {
      setSaving(false)
      savingRef.current = false
      if (pendingSaveRef.current) {
        pendingSaveRef.current = false
        handleSaveAnnotated({ silent: true })
      }
    }
  }

  // ── Auto-save: 2.5s after the last stroke/erase/undo/redo, save quietly
  // in the background — so forgetting to hit "Save" before closing never
  // loses work. Timer resets on every new change, so a burst of drawing
  // doesn't trigger a save per-stroke, only once things settle down.
  useEffect(() => {
    if (!dirty) return undefined
    setAutoSaveState('pending')
    const t = setTimeout(() => { handleSaveAnnotated({ silent: true }) }, 2500)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [annotations, dirty])

  // Best-effort final save if you close the reader (or navigate away) with
  // unsaved marks still pending — don't make "did I remember to save"
  // something you have to think about at all.
  async function handleClose() {
    if (dirty) { try { await handleSaveAnnotated({ silent: true }) } catch { /* swallow — user is leaving anyway */ } }
    onClose()
  }

  useEffect(() => {
    function beforeUnload(e) {
      if (!dirty) return
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', beforeUnload)
    return () => window.removeEventListener('beforeunload', beforeUnload)
  }, [dirty])

  async function switchSource(next) {
    if (next === editingSource) return
    if (dirty) {
      if (!confirm('Abhi ke unsaved marks pehle save kar loon, phir switch karu?')) return
      await handleSaveAnnotated({ silent: true })
    }
    setEditingSource(next)
  }

  async function handleDownload() {
    setDownloading(true)
    try {
      // fetch + blob + object URL — works reliably regardless of whether
      // Cloudinary's response sets Content-Disposition:attachment or not.
      const blob = await fetch(sourceUrl).then((r) => r.blob())
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${doc.title}${editingSource === 'annotated' ? ' (marked)' : ''}.pdf`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } catch {
      alert('Download nahi ho paya, dobara try karo')
    } finally {
      setDownloading(false)
    }
  }

  const currentPageHasAnnotations = (annotations[currentPage] || []).length > 0
  const activeThickness = tool === 'marker' ? markerWidth : penWidth

  return (
    <div className="fixed inset-0 z-[110] bg-black/95 flex flex-col">
      {/* Single merged top bar — header + toolbar together so the PDF gets
          all the remaining vertical space. Scrolls horizontally on narrow
          screens instead of wrapping to a second row. */}
      <div className="flex items-center gap-1.5 px-3 py-2 border-b border-slate-800 overflow-x-auto no-scrollbar shrink-0">
        <button onClick={handleClose} className="text-slate-400 hover:text-white w-9 h-9 rounded-lg hover:bg-slate-800 flex items-center justify-center shrink-0">
          <i className="ti ti-arrow-left text-xl" />
        </button>
        <p className="text-sm text-slate-200 truncate max-w-[84px] sm:max-w-[200px] shrink-0">{doc.title}</p>

        <div className="w-px h-6 bg-slate-700 mx-1 shrink-0" />

        {doc.annotatedUrl && (
          <div className="flex items-center rounded-lg bg-slate-800 border border-slate-700 p-0.5 text-xs shrink-0">
            <button
              onClick={() => switchSource('original')}
              className={`px-2.5 py-1.5 rounded-md transition-colors ${editingSource === 'original' ? 'bg-slate-700 text-slate-100' : 'text-slate-400'}`}
            >
              Original
            </button>
            <button
              onClick={() => switchSource('annotated')}
              className={`px-2.5 py-1.5 rounded-md transition-colors flex items-center gap-1 ${editingSource === 'annotated' ? 'bg-orange-500/20 text-orange-400' : 'text-slate-400'}`}
            >
              <i className="ti ti-pencil text-xs" /> Annotated
            </button>
          </div>
        )}

        <div className="w-px h-6 bg-slate-700 mx-1 shrink-0" />

        {/* Drawing tools — "Read" default hai (pen kabhi apne aap active nahi rehta),
            active tool ko dobara click krne se bhi wapas Read mode aa jata hai */}
        {[
          { id: 'none', icon: 'ti-hand-stop', label: 'Read / Scroll' },
          { id: 'pen', icon: 'ti-pencil', label: 'Pen' },
          { id: 'marker', icon: 'ti-highlight', label: 'Marker' },
          { id: 'eraser', icon: 'ti-eraser', label: 'Eraser' },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => { setTool((prev) => (t.id !== 'none' && prev === t.id ? 'none' : t.id)); setPanelOpen(null) }}
            title={t.label}
            className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 border transition-colors ${
              tool === t.id ? 'bg-orange-500/20 border-orange-500/50 text-orange-400' : 'bg-slate-800/60 border-slate-700 text-slate-400'
            }`}
          >
            <i className={`ti ${t.icon} text-base`} />
          </button>
        ))}

        <div className="w-px h-6 bg-slate-700 mx-1 shrink-0" />

        {/* Undo / Redo */}
        <button
          onClick={undo}
          disabled={!undoStack.length}
          title="Undo (Ctrl+Z)"
          className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 border bg-slate-800/60 border-slate-700 text-slate-400 disabled:opacity-30"
        >
          <i className="ti ti-arrow-back-up text-base" />
        </button>
        <button
          onClick={redo}
          disabled={!redoStack.length}
          title="Redo (Ctrl+Shift+Z)"
          className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 border bg-slate-800/60 border-slate-700 text-slate-400 disabled:opacity-30"
        >
          <i className="ti ti-arrow-forward-up text-base" />
        </button>

        {(tool === 'pen' || tool === 'marker') && (
          <>
            <div className="w-px h-6 bg-slate-700 mx-1 shrink-0" />
            {COLORS.map((c) => (
              <button
                key={c.hex}
                onClick={() => setColor(c.hex)}
                title={c.name}
                className={`w-7 h-7 rounded-full shrink-0 border-2 transition-transform ${color === c.hex ? 'border-white scale-110' : 'border-transparent'}`}
                style={{ backgroundColor: c.hex }}
              />
            ))}
            {/* Custom color — koi bhi color chuno */}
            <div className="relative shrink-0">
              <button
                onClick={() => customColorInputRef.current?.click()}
                title="Custom color"
                className="w-7 h-7 rounded-full shrink-0 border-2 border-dashed border-slate-500 flex items-center justify-center"
                style={{ background: !COLORS.some((c) => c.hex === color) ? color : 'conic-gradient(red,orange,yellow,green,blue,violet,red)' }}
              >
                {COLORS.some((c) => c.hex === color) && <i className="ti ti-plus text-xs text-white" style={{ textShadow: '0 0 3px rgba(0,0,0,0.8)' }} />}
              </button>
              <input
                ref={customColorInputRef}
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="absolute inset-0 w-7 h-7 opacity-0 pointer-events-none"
              />
            </div>

            <div className="w-px h-6 bg-slate-700 mx-1 shrink-0" />

            {/* Thickness — quick -/+ buttons plus an Edge-style popover slider */}
            <div className="flex items-center gap-0.5 shrink-0">
              <button
                onClick={() => (tool === 'marker' ? setMarkerWidth((w) => Math.max(1, w - 2)) : setPenWidth((w) => Math.max(1, w - 1)))}
                title="Chota karo"
                className="w-7 h-9 rounded-lg flex items-center justify-center bg-slate-800/60 border border-slate-700 text-slate-400"
              >
                <i className="ti ti-minus text-xs" />
              </button>
              <div className="relative shrink-0">
                <button
                  onClick={() => setPanelOpen((p) => (p === 'thickness' ? null : 'thickness'))}
                  title="Thickness"
                  className={`w-9 h-9 rounded-lg flex items-center justify-center border transition-colors ${panelOpen === 'thickness' ? 'bg-orange-500/20 border-orange-500/50' : 'bg-slate-800/60 border-slate-700'}`}
                >
                  <span
                    className="rounded-full bg-slate-200"
                    style={{ width: Math.min(18, 5 + activeThickness / 3), height: Math.min(18, 5 + activeThickness / 3) }}
                  />
                </button>
                {panelOpen === 'thickness' && (
                  <div className="absolute top-11 left-0 z-20 bg-slate-800 border border-slate-700 rounded-lg p-3 w-40 shadow-xl">
                    <div className="flex items-center justify-between mb-1.5">
                      <p className="text-[10px] text-slate-400">Thickness</p>
                      <p className="text-[10px] text-slate-300 tabular-nums">{activeThickness}px</p>
                    </div>
                    <input
                      type="range"
                      min="1"
                      max={tool === 'marker' ? 36 : 12}
                      value={activeThickness}
                      onChange={(e) => (tool === 'marker' ? setMarkerWidth(+e.target.value) : setPenWidth(+e.target.value))}
                      className="w-full accent-orange-500"
                    />
                  </div>
                )}
              </div>
              <button
                onClick={() => (tool === 'marker' ? setMarkerWidth((w) => Math.min(36, w + 2)) : setPenWidth((w) => Math.min(12, w + 1)))}
                title="Bada karo"
                className="w-7 h-9 rounded-lg flex items-center justify-center bg-slate-800/60 border border-slate-700 text-slate-400"
              >
                <i className="ti ti-plus text-xs" />
              </button>
            </div>

            {/* Darkness (opacity) — for both pen and marker, so pen strokes
                can be made lighter (e.g. for light annotations) or the
                marker's ink strength adjusted, like a highlighter */}
            <div className="relative shrink-0">
              <button
                onClick={() => setPanelOpen((p) => (p === 'opacity' ? null : 'opacity'))}
                title="Darkness"
                className={`w-9 h-9 rounded-lg flex items-center justify-center border transition-colors ${panelOpen === 'opacity' ? 'bg-orange-500/20 border-orange-500/50' : 'bg-slate-800/60 border-slate-700'}`}
              >
                <i className="ti ti-droplet-half text-sm text-slate-300" />
              </button>
              {panelOpen === 'opacity' && (
                <div className="absolute top-11 left-0 z-20 bg-slate-800 border border-slate-700 rounded-lg p-3 w-40 shadow-xl">
                  <div className="flex items-center justify-between mb-1.5">
                    <p className="text-[10px] text-slate-400">Darkness</p>
                    <p className="text-[10px] text-slate-300 tabular-nums">{Math.round((tool === 'marker' ? markerOpacity : penOpacity) * 100)}%</p>
                  </div>
                  <input
                    type="range"
                    min="0.1"
                    max={tool === 'marker' ? '0.8' : '1'}
                    step="0.05"
                    value={tool === 'marker' ? markerOpacity : penOpacity}
                    onChange={(e) => (tool === 'marker' ? setMarkerOpacity(+e.target.value) : setPenOpacity(+e.target.value))}
                    className="w-full accent-orange-500"
                  />
                </div>
              )}
            </div>
          </>
        )}

        {/* Eraser size — chota/bada eraser */}
        {tool === 'eraser' && (
          <>
            <div className="w-px h-6 bg-slate-700 mx-1 shrink-0" />
            <div className="flex items-center gap-0.5 shrink-0">
              <button
                onClick={() => setEraserSize((s) => Math.max(1, s - 1))}
                title="Chota karo"
                className="w-7 h-9 rounded-lg flex items-center justify-center bg-slate-800/60 border border-slate-700 text-slate-400"
              >
                <i className="ti ti-minus text-xs" />
              </button>
              <div className="relative shrink-0">
                <button
                  onClick={() => setPanelOpen((p) => (p === 'eraser' ? null : 'eraser'))}
                  title="Eraser size"
                  className={`w-9 h-9 rounded-lg flex items-center justify-center border transition-colors ${panelOpen === 'eraser' ? 'bg-orange-500/20 border-orange-500/50' : 'bg-slate-800/60 border-slate-700'}`}
                >
                  <span className="rounded-sm bg-slate-200" style={{ width: 6 + eraserSize, height: 6 + eraserSize }} />
                </button>
                {panelOpen === 'eraser' && (
                  <div className="absolute top-11 left-0 z-20 bg-slate-800 border border-slate-700 rounded-lg p-3 w-40 shadow-xl">
                    <div className="flex items-center justify-between mb-1.5">
                      <p className="text-[10px] text-slate-400">Eraser size</p>
                      <p className="text-[10px] text-slate-300 tabular-nums">{eraserSize}</p>
                    </div>
                    <input
                      type="range"
                      min="1"
                      max="10"
                      value={eraserSize}
                      onChange={(e) => setEraserSize(+e.target.value)}
                      className="w-full accent-orange-500"
                    />
                  </div>
                )}
              </div>
              <button
                onClick={() => setEraserSize((s) => Math.min(10, s + 1))}
                title="Bada karo"
                className="w-7 h-9 rounded-lg flex items-center justify-center bg-slate-800/60 border border-slate-700 text-slate-400"
              >
                <i className="ti ti-plus text-xs" />
              </button>
            </div>
          </>
        )}

        {currentPageHasAnnotations && (
          <button
            onClick={() => {
              setAnnotations((prev) => {
                pushHistory(currentPage, prev[currentPage] || [])
                return { ...prev, [currentPage]: [] }
              })
              setDirty(true)
            }}
            className="text-[11px] text-slate-500 hover:text-red-400 px-2 shrink-0"
          >
            Page clear karo
          </button>
        )}

        <div className="flex-1 min-w-[8px]" />

        {/* Zoom */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => setZoom((z) => Math.max(0.5, +(z - 0.2).toFixed(2)))}
            title="Zoom out"
            className="w-8 h-8 rounded-lg bg-slate-800/60 border border-slate-700 text-slate-400 flex items-center justify-center"
          >
            <i className="ti ti-zoom-out text-sm" />
          </button>
          <button
            onClick={() => setZoom(1)}
            title="Reset zoom"
            className="px-2 h-8 rounded-lg bg-slate-800/60 border border-slate-700 text-slate-400 text-[11px] tabular-nums min-w-[42px]"
          >
            {Math.round(zoom * 100)}%
          </button>
          <button
            onClick={() => setZoom((z) => Math.min(3, +(z + 0.2).toFixed(2)))}
            title="Zoom in"
            className="w-8 h-8 rounded-lg bg-slate-800/60 border border-slate-700 text-slate-400 flex items-center justify-center"
          >
            <i className="ti ti-zoom-in text-sm" />
          </button>
        </div>

        <div className="w-px h-6 bg-slate-700 mx-1 shrink-0" />

        <button
          onClick={handleDownload}
          disabled={downloading}
          title="Download"
          className="w-9 h-9 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 disabled:opacity-50 flex items-center justify-center shrink-0"
        >
          {downloading ? <div className="w-3.5 h-3.5 rounded-full border-2 border-white/40 border-t-white animate-spin" /> : <i className="ti ti-download text-base" />}
        </button>

        {/* Auto-save status — so you never have to wonder if your marks
            are safe. Manual "Save" button still there for an immediate
            save instead of waiting out the auto-save debounce. */}
        <span className="hidden sm:flex items-center gap-1.5 text-[11px] text-slate-500 shrink-0 px-1">
          {autoSaveState === 'saving' && (<><div className="w-3 h-3 rounded-full border-2 border-slate-600 border-t-slate-300 animate-spin" /> Saving...</>)}
          {autoSaveState === 'pending' && (<><span className="w-1.5 h-1.5 rounded-full bg-amber-400" /> Save ho raha hai jald hi...</>)}
          {autoSaveState === 'saved' && (<><i className="ti ti-circle-check text-green-500 text-sm" /> Sab save ho gaya</>)}
          {autoSaveState === 'error' && (<><i className="ti ti-alert-circle text-red-400 text-sm" /> Save fail hua</>)}
        </span>

        <button
          onClick={() => handleSaveAnnotated()}
          disabled={saving || !dirty}
          className="px-3 sm:px-4 py-2 rounded-lg bg-orange-500 hover:bg-orange-600 disabled:opacity-40 text-white text-xs sm:text-sm font-semibold flex items-center gap-1.5 shrink-0"
        >
          {saving ? <div className="w-3.5 h-3.5 rounded-full border-2 border-white/50 border-t-white animate-spin" /> : <i className="ti ti-device-floppy" />}
          Save
        </button>
      </div>

      {/* Continuous scroll area — goes all the way to the bottom edge of the
          screen, no bottom bar, no border. Scroll to move between pages;
          a small floating pill shows the current page while you scroll. */}
      <div
        ref={viewerContainerRef}
        className="flex-1 overflow-y-auto overflow-x-hidden px-3 sm:px-6 py-4"
        onPointerDownCapture={() => panelOpen && setPanelOpen(null)}
      >
        {loading && (
          <div className="flex flex-col items-center justify-center py-20 text-slate-500">
            <div className="w-8 h-8 rounded-full border-2 border-slate-700 border-t-orange-500 animate-spin mb-3" />
            <p className="text-sm">PDF load ho raha hai...</p>
          </div>
        )}
        {error && !loading && (
          <div className="text-center py-20 text-slate-500">
            <i className="ti ti-file-alert text-4xl mb-2" />
            <p className="text-sm">PDF load nahi ho paya</p>
          </div>
        )}

        {!loading && !error && pdfReady && Array.from({ length: numPages }, (_, i) => i + 1).map((pn) => (
          <PageBlock
            key={pn}
            pageNum={pn}
            pdfDoc={pdfDocRef.current}
            zoom={zoom}
            containerWidth={containerWidth}
            tool={tool}
            color={color}
            penWidth={penWidth}
            penOpacity={penOpacity}
            markerWidth={markerWidth}
            markerOpacity={markerOpacity}
            eraserSize={eraserSize}
            strokes={annotations[pn] || []}
            onStroke={handleStroke}
            onErase={handleErase}
            registerRenderObserver={registerRenderObserver}
            registerViewObserver={registerViewObserver}
          />
        ))}

        {!loading && !error && numPages > 1 && (
          <div className="sticky bottom-3 flex justify-center pointer-events-none">
            <span className="px-3 py-1 rounded-full bg-slate-900/85 backdrop-blur text-[11px] text-slate-300 shadow-lg tabular-nums">
              {currentPage} / {numPages}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}