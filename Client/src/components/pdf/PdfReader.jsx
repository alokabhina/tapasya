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
import { getPdfFileOffline, savePdfFileOffline } from '@/utils/offlineDB'

const PDFJS_CDN = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js'
const PDFJS_WORKER_CDN = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js'
const PDFLIB_CDN = 'https://cdnjs.cloudflare.com/ajax/libs/pdf-lib/1.17.1/pdf-lib.min.js'
// Single draft "kind" now — there's only ever one live editable copy per
// doc (always built on the original + persisted strokes), no more
// original-vs-annotated split to key drafts by.
const DRAFT_KIND = 'live'

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

// ── Local draft backup (crash-safe autosave) ────────────────────────────────
// Strokes are backed up to localStorage the instant they change, so a tab
// crash/kill/accidental close never loses work — separate from the actual
// "Save" which uploads a merged PDF + the raw strokes to the server.
function draftKey(docId, source) {
  return `pdfDraft:${docId}:${source}`
}
function loadDraft(docId, source) {
  try {
    const raw = localStorage.getItem(draftKey(docId, source))
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (parsed && parsed.annotations && Object.keys(parsed.annotations).length) return parsed
    return null
  } catch {
    return null
  }
}
function saveDraft(docId, source, annotations) {
  try {
    localStorage.setItem(draftKey(docId, source), JSON.stringify({ annotations, savedAt: Date.now() }))
  } catch { /* storage full/unavailable — draft backup is best-effort only */ }
}
function clearDraft(docId, source) {
  try { localStorage.removeItem(draftKey(docId, source)) } catch { /* ignore */ }
}

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
  const cssSizeRef = useRef({ w: 0, h: 0 }) // canvas CSS (logical) size — backing-store pixels are this × devicePixelRatio
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
    // Mobile screens have a devicePixelRatio > 1 (often 2–3x). If we only
    // give the canvas as many backing-store pixels as CSS pixels, the
    // browser has to upscale it to fill the physical screen — that's the
    // "PDF looks blurry on mobile" bug. Fix: render at CSS-size × DPR into
    // the canvas's actual pixel buffer, then scale the drawing context
    // back down so all our existing coordinate math (viewport.width/height
    // etc.) still lines up, while keeping the on-screen CSS size the same.
    const dpr = Math.min(window.devicePixelRatio || 1, 3) // cap at 3x — plenty sharp, avoids huge canvases
    const base = baseCanvasRef.current
    const overlay = overlayCanvasRef.current
    for (const canvas of [base, overlay]) {
      canvas.width = Math.round(viewport.width * dpr)
      canvas.height = Math.round(viewport.height * dpr)
      canvas.style.width = `${viewport.width}px`
      canvas.style.height = `${viewport.height}px`
    }
    if (renderTaskRef.current) {
      try { renderTaskRef.current.cancel() } catch { /* previous task already done */ }
    }
    const baseCtx = base.getContext('2d')
    baseCtx.setTransform(dpr, 0, 0, dpr, 0, 0)
    const task = page.render({ canvasContext: baseCtx, viewport })
    renderTaskRef.current = task
    try {
      await task.promise
    } catch {
      return // cancelled by a newer render (e.g. rapid zoom change)
    }
    setRendered(true)
    cssSizeRef.current = { w: viewport.width, h: viewport.height }
    const ctx = overlay.getContext('2d')
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, viewport.width, viewport.height)
    for (const s of strokes) drawStroke(ctx, s, viewport.width, viewport.height)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pdfDoc, pageNum, zoom, containerWidth])

  useEffect(() => { if (shouldRender) render() }, [shouldRender, render])

  // Redraw strokes whenever they change (new stroke added / erased / undone).
  useEffect(() => {
    if (!rendered) return
    const overlay = overlayCanvasRef.current
    if (!overlay) return
    const { w, h } = cssSizeRef.current
    const ctx = overlay.getContext('2d')
    ctx.clearRect(0, 0, w, h)
    for (const s of strokes) drawStroke(ctx, s, w, h)
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
    const { w, h } = cssSizeRef.current
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
  const [showMarks, setShowMarks] = useState(true) // "Clean" view toggle — strokes stay in data either way, just hidden
  const [color, setColor] = useState(COLORS[0].hex)
  const [penWidth, setPenWidth] = useState(3)
  const [penOpacity, setPenOpacity] = useState(1)
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
  const [downloading, setDownloading] = useState(false)
  const [autoSaveStatus, setAutoSaveStatus] = useState('idle') // 'idle' | 'saving' | 'saved' | 'restored'
  const autoSaveTimerRef = useRef(null)
  // ── Top-bar tap → whole page scrolls in Y direction (mobile quirk) ──────
  // Some mobile browsers auto-scroll the nearest scrollable ancestor into
  // view whenever a button inside a horizontally-scrolling toolbar gets
  // focus (e.g. tapping the Pen icon). There's no clean single CSS/DOM fix
  // for this across browsers, so instead we guard against it directly:
  // remember the scroll position the instant a toolbar tap starts, then for
  // a short window afterwards, snap the reading area straight back if
  // anything nudges it — the jump never becomes visible to the user.
  const scrollGuardUntilRef = useRef(0)
  const scrollGuardTopRef = useRef(0)
  function armScrollGuard() {
    scrollGuardTopRef.current = viewerContainerRef.current?.scrollTop || 0
    scrollGuardUntilRef.current = Date.now() + 450
  }
  function handleViewerScroll() {
    if (Date.now() < scrollGuardUntilRef.current && viewerContainerRef.current) {
      viewerContainerRef.current.scrollTop = scrollGuardTopRef.current
    }
  }
  // Which file we're viewing/building on top of. Default to continuing on
  // the existing annotated version (if any) so previous markup isn't lost —
  // new strokes just add to it, and saving updates that SAME file. Switch
  // to 'original' to start fresh from the clean, untouched copy instead.
  // We ALWAYS edit on top of the untouched original PDF now — never a
  // previously-flattened "annotated" export. Old strokes come back as real,
  // still-erasable vector data (doc.annotationsData, loaded below), so
  // there's no more "eraser can't touch marks from a past save" problem,
  // and no more surprise auto-switch into a baked/flattened copy after
  // saving. annotatedUrl still gets produced on every save purely as a
  // downloadable/shareable flattened copy — it's just never read back in.
  const sourceUrl = doc.originalUrl

  // Offline-aware fetch of the original PDF's bytes: try the network first
  // (and refresh the offline copy on success, so it stays current), but if
  // there's no internet — or the fetch just fails — fall back to whatever
  // got cached the last time this PDF was opened online. Only when NEITHER
  // exists does the caller actually see an error. Shared by the initial
  // load, Save (needs the original to build the flattened export) and
  // Download, so all three keep working with zero internet.
  async function loadPdfBytes() {
    try {
      const r = await fetch(sourceUrl)
      if (!r.ok) throw new Error(`PDF fetch failed: HTTP ${r.status}`)
      const buf = await r.arrayBuffer()
      savePdfFileOffline(doc._id, new Blob([buf], { type: 'application/pdf' })).catch(() => {})
      return buf
    } catch (networkErr) {
      const offline = await getPdfFileOffline(doc._id).catch(() => null)
      if (offline?.blob) return offline.blob.arrayBuffer()
      throw networkErr
    }
  }

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
    // Seed with whatever was saved last time (real, still-editable/erasable
    // strokes) instead of wiping to blank — old marks come back exactly as
    // they were, not baked into the page.
    setAnnotations(doc.annotationsData || {})
    loadPdfBytes()
      .then((buf) => window.pdfjsLib.getDocument({ data: buf }).promise)
      .then((pdf) => {
        if (cancelled) return
        pdfDocRef.current = pdf
        setNumPages(pdf.numPages)
        setCurrentPage(1)
        setError(false)
        setPdfReady(true)
        viewerContainerRef.current?.scrollTo({ top: 0 })
        // Restore any local draft left over from a crash/interrupted session
        // for this exact doc, so marks are never silently lost — this can
        // be newer than what the server has, so it takes priority.
        const draft = loadDraft(doc._id, DRAFT_KIND)
        if (draft) {
          setAnnotations(draft.annotations)
          setDirty(true)
          setAutoSaveStatus('restored')
          setTimeout(() => setAutoSaveStatus((s) => (s === 'restored' ? 'idle' : s)), 3000)
        }
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

  // ── Auto-save #1: instant local backup (debounced) ──────────────────────
  // Every time strokes change, back them up to localStorage a moment later
  // — cheap, synchronous, and survives a crash/tab-kill even before the
  // server autosave below gets a chance to run.
  useEffect(() => {
    if (!dirty) return undefined
    const t = setTimeout(() => saveDraft(doc._id, DRAFT_KIND, annotations), 600)
    return () => clearTimeout(t)
  }, [annotations, dirty, doc._id])

  // ── Auto-save #2: periodic real save to the server ──────────────────────
  // Mirrors how Google Docs / Notion autosave: no need to remember to hit
  // "Save" — every ~25s (and whenever you leave/hide the tab) any unsaved
  // marks are quietly pushed up in the background. Manual Save still works
  // for "save it right now".
  useEffect(() => {
    autoSaveTimerRef.current = setInterval(() => {
      setDirty((isDirty) => {
        if (isDirty) runAutoSave()
        return isDirty
      })
    }, 25000)
    return () => clearInterval(autoSaveTimerRef.current)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    function onVisibility() {
      if (document.visibilityState === 'hidden' && dirty) runAutoSave()
    }
    window.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('pagehide', onVisibility)
    return () => {
      window.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('pagehide', onVisibility)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dirty])

  async function runAutoSave() {
    if (saving) return // manual save already in flight, don't double up
    setAutoSaveStatus('saving')
    try {
      await handleSaveAnnotated(true)
      setAutoSaveStatus('saved')
      setTimeout(() => setAutoSaveStatus((s) => (s === 'saved' ? 'idle' : s)), 2500)
    } catch {
      setAutoSaveStatus('idle') // silent — manual Save button is still right there if this keeps failing
    }
  }

  // ── Export: builds on top of the current editing base (original or the
  // existing annotated copy) so previous markup isn't lost — new strokes
  // just add to it. The base is only ever READ here, never modified; the
  // export always goes out as a brand new blob to the SAME annotated slot
  // (server overwrites it in place — see routes/pdfs.js), so re-saving
  // never creates extra files, just updates the one "annotated" copy.
  // Renders the ORIGINAL PDF + current strokes into one flattened PDF's
  // bytes — shared by Save (uploads it) and Download (just hands it to the
  // browser), so both always reflect exactly what's on screen right now,
  // strokes included.
  async function buildFlattenedPdfBytes() {
    const { PDFDocument, rgb, LineCapStyle } = window.PDFLib
    const bytes = await loadPdfBytes()
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
    return pdfLibDoc.save()
  }

  // Every save (a) uploads a freshly-flattened PDF (for Download/sharing/
  // opening outside the app) built from the ORIGINAL + every stroke, old
  // and new, and (b) persists the raw stroke data itself, so the NEXT
  // session reloads real, still-erasable strokes rather than the flattened
  // pixels — that's what makes old marks stay erasable forever, and what
  // stops the reader from ever auto-switching into a separate "annotated"
  // file after a save (there's only ever the one live editable copy now).
  async function handleSaveAnnotated(silent = false) {
    if (!silent) setSaving(true)
    try {
      const outBytes = await buildFlattenedPdfBytes()
      const blob = new Blob([outBytes], { type: 'application/pdf' })
      const updated = await saveAnnotatedPdf(doc._id, blob, annotations)
      onSaved?.(updated)
      setDirty(false)
      clearDraft(doc._id, DRAFT_KIND)
    } catch (err) {
      if (!silent) alert('Save nahi ho paya, dobara try karo')
      throw err
    } finally {
      if (!silent) setSaving(false)
    }
  }

  async function handleDownload() {
    setDownloading(true)
    try {
      // Downloads exactly what's on screen — original + every stroke —
      // built fresh client-side rather than trusting a possibly-stale
      // server copy, so it's correct even before you've hit Save.
      const hasMarks = Object.values(annotations).some((s) => s.length)
      const outBytes = hasMarks ? await buildFlattenedPdfBytes() : await loadPdfBytes()
      const blob = new Blob([outBytes], { type: 'application/pdf' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${doc.title}${hasMarks ? ' (marked)' : ''}.pdf`
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
      <div
        className="flex items-center gap-1.5 px-3 py-2 border-b border-slate-800 overflow-x-auto no-scrollbar shrink-0"
        onPointerDownCapture={armScrollGuard}
      >
        <button onClick={onClose} className="text-slate-400 hover:text-white w-9 h-9 rounded-lg hover:bg-slate-800 flex items-center justify-center shrink-0">
          <i className="ti ti-arrow-left text-xl" />
        </button>
        <p className="text-sm text-slate-200 truncate max-w-[84px] sm:max-w-[200px] shrink-0">{doc.title}</p>

        <div className="w-px h-6 bg-slate-700 mx-1 shrink-0" />

        {Object.values(annotations).some((s) => s.length) && (
          <div className="flex items-center rounded-lg bg-slate-800 border border-slate-700 p-0.5 text-xs shrink-0">
            <button
              onClick={() => setShowMarks(true)}
              className={`px-2.5 py-1.5 rounded-md transition-colors flex items-center gap-1 ${showMarks ? 'bg-orange-500/20 text-orange-400' : 'text-slate-400'}`}
            >
              <i className="ti ti-pencil text-xs" /> Marks
            </button>
            <button
              onClick={() => { setShowMarks(false); setTool('none') }}
              className={`px-2.5 py-1.5 rounded-md transition-colors ${!showMarks ? 'bg-slate-700 text-slate-100' : 'text-slate-400'}`}
            >
              Clean
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
            onClick={() => { setTool((prev) => (t.id !== 'none' && prev === t.id ? 'none' : t.id)); setPanelOpen(null); if (t.id !== 'none') setShowMarks(true) }}
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

            {/* Darkness (opacity) — works for BOTH pen and marker now. Pen
                defaults to fully opaque (1) but can be made lighter/faded
                just like a marker's ink strength. */}
            <div className="relative shrink-0">
              <button
                onClick={() => setPanelOpen((p) => (p === 'opacity' ? null : 'opacity'))}
                title="Opacity / Darkness"
                className={`w-9 h-9 rounded-lg flex items-center justify-center border transition-colors ${panelOpen === 'opacity' ? 'bg-orange-500/20 border-orange-500/50' : 'bg-slate-800/60 border-slate-700'}`}
              >
                <i className="ti ti-droplet-half text-sm text-slate-300" />
              </button>
              {panelOpen === 'opacity' && (
                <div className="absolute top-11 left-0 z-20 bg-slate-800 border border-slate-700 rounded-lg p-3 w-40 shadow-xl">
                  <div className="flex items-center justify-between mb-1.5">
                    <p className="text-[10px] text-slate-400">Opacity</p>
                    <p className="text-[10px] text-slate-300 tabular-nums">{Math.round((tool === 'marker' ? markerOpacity : penOpacity) * 100)}%</p>
                  </div>
                  <input
                    type="range"
                    min={tool === 'marker' ? '0.1' : '0.15'}
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
        <button
          onClick={() => handleSaveAnnotated(false)}
          disabled={saving || !dirty}
          className="px-3 sm:px-4 py-2 rounded-lg bg-orange-500 hover:bg-orange-600 disabled:opacity-40 text-white text-xs sm:text-sm font-semibold flex items-center gap-1.5 shrink-0"
        >
          {saving ? <div className="w-3.5 h-3.5 rounded-full border-2 border-white/50 border-t-white animate-spin" /> : <i className="ti ti-device-floppy" />}
          Save
        </button>

        {/* Quiet autosave status — no action needed from the user */}
        {autoSaveStatus !== 'idle' && (
          <span className="text-[10px] text-slate-500 flex items-center gap-1 shrink-0 pl-0.5">
            {autoSaveStatus === 'saving' && (<><div className="w-2.5 h-2.5 rounded-full border-2 border-slate-600 border-t-orange-400 animate-spin" /> Saving…</>)}
            {autoSaveStatus === 'saved' && (<><i className="ti ti-cloud-check text-emerald-400 text-xs" /> Saved</>)}
            {autoSaveStatus === 'restored' && (<><i className="ti ti-history text-orange-400 text-xs" /> Draft restored</>)}
          </span>
        )}
      </div>

      {/* Continuous scroll area — goes all the way to the bottom edge of the
          screen, no bottom bar, no border. Scroll to move between pages;
          a small floating pill shows the current page while you scroll. */}
      <div
        ref={viewerContainerRef}
        className="flex-1 overflow-y-auto overflow-x-hidden px-3 sm:px-6 py-4"
        onPointerDownCapture={() => panelOpen && setPanelOpen(null)}
        onScroll={handleViewerScroll}
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
            strokes={showMarks ? (annotations[pn] || []) : []}
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