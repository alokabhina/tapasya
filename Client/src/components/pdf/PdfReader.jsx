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
import { useEffect, useRef, useState, useCallback } from 'react'
import { saveAnnotatedPdf } from '@/api/pdfs'

const PDFJS_CDN = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js'
const PDFJS_WORKER_CDN = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js'
const PDFLIB_CDN = 'https://cdnjs.cloudflare.com/ajax/libs/pdf-lib/1.17.1/pdf-lib.min.js'

const COLORS = [
  { name: 'Yellow', hex: '#facc15' },
  { name: 'Orange', hex: '#fb923c' },
  { name: 'Red', hex: '#f87171' },
  { name: 'Green', hex: '#4ade80' },
  { name: 'Blue', hex: '#60a5fa' },
  { name: 'Black', hex: '#e2e8f0' },
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

export default function PdfReader({ doc, onClose, onSaved }) {
  const baseCanvasRef = useRef(null)
  const overlayCanvasRef = useRef(null)
  const pdfDocRef = useRef(null)       // pdf.js document proxy (for viewing)
  const drawingRef = useRef(false)
  const currentStrokeRef = useRef(null)
  const viewerContainerRef = useRef(null) // the stable, full-width scroll area — NOT the canvas wrapper

  const [libsReady, setLibsReady] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [numPages, setNumPages] = useState(0)
  const [pageNum, setPageNum] = useState(1)
  const [zoom, setZoom] = useState(1) // multiplier on top of the fit-to-width base scale
  const [tool, setTool] = useState('pen') // 'pen' | 'marker' | 'eraser'
  const [color, setColor] = useState(COLORS[0].hex)
  const [annotations, setAnnotations] = useState({}) // { [pageNum]: Stroke[] }
  const [saving, setSaving] = useState(false)
  const [dirty, setDirty] = useState(false) // any unsaved strokes since last save
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
        setPageNum(1)
        setError(false)
      })
      .catch((err) => {
        // eslint-disable-next-line no-console
        console.error('PDF load failed:', err.message, '— check Cloudinary Settings → Security → "PDF and ZIP files delivery" if this is a 401/403.')
        if (!cancelled) setError(true)
      })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [libsReady, sourceUrl])

  // ── Render the current page onto the base canvas ────────────────────────
  const renderPage = useCallback(async () => {
    const pdf = pdfDocRef.current
    if (!pdf || !baseCanvasRef.current || !overlayCanvasRef.current || !viewerContainerRef.current) return
    const page = await pdf.getPage(pageNum)

    // Measure the STABLE outer container, not the canvas's immediate
    // wrapper — that wrapper shrink-wraps to the canvas's own size, which
    // was the bug: it kept measuring the canvas's default ~300px width
    // right back at itself instead of the actual available screen space.
    const available = viewerContainerRef.current.clientWidth - 32 // minus container padding
    const unscaledViewport = page.getViewport({ scale: 1 })
    const fitScale = Math.min(available, 1100) / unscaledViewport.width
    const viewport = page.getViewport({ scale: fitScale * zoom })

    for (const canvas of [baseCanvasRef.current, overlayCanvasRef.current]) {
      canvas.width = viewport.width
      canvas.height = viewport.height
      canvas.style.width = `${viewport.width}px`
      canvas.style.height = `${viewport.height}px`
    }

    await page.render({ canvasContext: baseCanvasRef.current.getContext('2d'), viewport }).promise
    redrawOverlay()
  }, [pageNum, zoom]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { renderPage() }, [renderPage])

  // Re-fit when the window/panel is resized (e.g. rotating a tablet, or
  // resizing the browser) — otherwise the page stays sized for the old width.
  useEffect(() => {
    function onResize() { renderPage() }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [renderPage])

  // ── Redraw the overlay canvas from stored strokes for this page ─────────
  function redrawOverlay() {
    const canvas = overlayCanvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    const strokes = annotations[pageNum] || []
    for (const stroke of strokes) drawStroke(ctx, stroke, canvas.width, canvas.height)
  }

  useEffect(() => { redrawOverlay() }, [annotations, pageNum]) // eslint-disable-line react-hooks/exhaustive-deps

  function drawStroke(ctx, stroke, w, h) {
    if (stroke.points.length < 2) return
    ctx.save()
    ctx.lineJoin = 'round'
    ctx.lineCap = 'round'
    ctx.strokeStyle = stroke.color
    ctx.globalAlpha = stroke.tool === 'marker' ? 0.35 : 1
    ctx.lineWidth = stroke.tool === 'marker' ? 16 : 3
    ctx.beginPath()
    stroke.points.forEach((p, i) => {
      const x = p.x * w, y = p.y * h
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y)
    })
    ctx.stroke()
    ctx.restore()
  }

  // ── Pointer handlers: pen/marker draw, eraser removes the nearest stroke ─
  function getNormalizedPoint(e) {
    const canvas = overlayCanvasRef.current
    const rect = canvas.getBoundingClientRect()
    return { x: (e.clientX - rect.left) / rect.width, y: (e.clientY - rect.top) / rect.height }
  }

  function handlePointerDown(e) {
    e.preventDefault()
    const pt = getNormalizedPoint(e)
    if (tool === 'eraser') {
      eraseNearStroke(pt)
      return
    }
    drawingRef.current = true
    currentStrokeRef.current = { tool, color, points: [pt] }
    overlayCanvasRef.current.setPointerCapture(e.pointerId)
  }

  function handlePointerMove(e) {
    if (!drawingRef.current) return
    const pt = getNormalizedPoint(e)
    currentStrokeRef.current.points.push(pt)
    // live preview: draw just the new segment instead of a full redraw for performance
    const ctx = overlayCanvasRef.current.getContext('2d')
    const w = overlayCanvasRef.current.width, h = overlayCanvasRef.current.height
    const pts = currentStrokeRef.current.points
    const last2 = { points: pts.slice(-2), tool, color }
    drawStroke(ctx, last2, w, h)
  }

  function handlePointerUp() {
    if (!drawingRef.current) return
    drawingRef.current = false
    const stroke = currentStrokeRef.current
    currentStrokeRef.current = null
    if (stroke && stroke.points.length > 1) {
      setAnnotations((prev) => ({ ...prev, [pageNum]: [...(prev[pageNum] || []), stroke] }))
      setDirty(true)
    }
  }

  function eraseNearStroke(pt) {
    const strokes = annotations[pageNum] || []
    const threshold = 0.02 // ~2% of page dimension
    let nearestIdx = -1, nearestDist = Infinity
    strokes.forEach((s, idx) => {
      for (const p of s.points) {
        const d = Math.hypot(p.x - pt.x, p.y - pt.y)
        if (d < nearestDist) { nearestDist = d; nearestIdx = idx }
      }
    })
    if (nearestIdx >= 0 && nearestDist < threshold * 3) {
      setAnnotations((prev) => {
        const next = [...(prev[pageNum] || [])]
        next.splice(nearestIdx, 1)
        return { ...prev, [pageNum]: next }
      })
      setDirty(true)
    }
  }

  // ── Export: builds on top of the current editing base (original or the
  // existing annotated copy) so previous markup isn't lost — new strokes
  // just add to it. The base is only ever READ here, never modified; the
  // export always goes out as a brand new blob to the SAME annotated slot
  // (server overwrites it in place — see routes/pdfs.js), so re-saving
  // never creates extra files, just updates the one "annotated" copy.
  async function handleSaveAnnotated() {
    setSaving(true)
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
              thickness: stroke.tool === 'marker' ? 16 : 3,
              color: rgb(r, g, b),
              opacity: stroke.tool === 'marker' ? 0.35 : 1,
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
    } catch {
      alert('Save nahi ho paya, dobara try karo')
    } finally {
      setSaving(false)
    }
  }

  function switchSource(next) {
    if (next === editingSource) return
    if (dirty && !confirm('Abhi ke unsaved marks chhoot jayenge agar switch karo. Continue?')) return
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

  const currentPageHasAnnotations = (annotations[pageNum] || []).length > 0

  return (
    <div className="fixed inset-0 z-[110] bg-black/95 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800 gap-3">
        <div className="min-w-0 flex items-center gap-2">
          <button onClick={onClose} className="text-slate-400 hover:text-white w-9 h-9 rounded-lg hover:bg-slate-800 flex items-center justify-center shrink-0">
            <i className="ti ti-arrow-left text-xl" />
          </button>
          <p className="text-sm text-slate-200 truncate">{doc.title}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {doc.annotatedUrl && (
            <div className="hidden sm:flex items-center rounded-lg bg-slate-800 border border-slate-700 p-0.5 text-xs">
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
          <button
            onClick={handleDownload}
            disabled={downloading}
            title="Download"
            className="w-9 h-9 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 disabled:opacity-50 flex items-center justify-center"
          >
            {downloading ? <div className="w-3.5 h-3.5 rounded-full border-2 border-white/40 border-t-white animate-spin" /> : <i className="ti ti-download text-base" />}
          </button>
          <button
            onClick={handleSaveAnnotated}
            disabled={saving || !dirty}
            className="px-3 sm:px-4 py-2 rounded-lg bg-orange-500 hover:bg-orange-600 disabled:opacity-40 text-white text-xs sm:text-sm font-semibold flex items-center gap-1.5"
          >
            {saving ? <div className="w-3.5 h-3.5 rounded-full border-2 border-white/50 border-t-white animate-spin" /> : <i className="ti ti-device-floppy" />}
            Save
          </button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-1.5 px-3 py-2 border-b border-slate-800 overflow-x-auto no-scrollbar">
        {[
          { id: 'pen', icon: 'ti-pencil', label: 'Pen' },
          { id: 'marker', icon: 'ti-highlight', label: 'Marker' },
          { id: 'eraser', icon: 'ti-eraser', label: 'Eraser' },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setTool(t.id)}
            title={t.label}
            className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 border transition-colors ${
              tool === t.id ? 'bg-orange-500/20 border-orange-500/50 text-orange-400' : 'bg-slate-800/60 border-slate-700 text-slate-400'
            }`}
          >
            <i className={`ti ${t.icon} text-base`} />
          </button>
        ))}
        <div className="w-px h-6 bg-slate-700 mx-1 shrink-0" />
        {tool !== 'eraser' && COLORS.map((c) => (
          <button
            key={c.hex}
            onClick={() => setColor(c.hex)}
            title={c.name}
            className={`w-7 h-7 rounded-full shrink-0 border-2 transition-transform ${color === c.hex ? 'border-white scale-110' : 'border-transparent'}`}
            style={{ backgroundColor: c.hex }}
          />
        ))}
        <div className="flex-1" />
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
        {currentPageHasAnnotations && (
          <button
            onClick={() => { setAnnotations((prev) => ({ ...prev, [pageNum]: [] })); setDirty(true) }}
            className="text-[11px] text-slate-500 hover:text-red-400 px-2 shrink-0"
          >
            Page clear karo
          </button>
        )}
      </div>

      {/* Page canvas */}
      <div ref={viewerContainerRef} className="flex-1 overflow-auto flex items-start justify-center p-3 sm:p-6">
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
        <div className="relative" style={{ display: loading || error ? 'none' : 'block' }}>
          <canvas ref={baseCanvasRef} className="rounded-lg shadow-xl" />
          <canvas
            ref={overlayCanvasRef}
            className="absolute inset-0 touch-none"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerUp}
          />
        </div>
      </div>

      {/* Page nav */}
      {numPages > 1 && (
        <div className="flex items-center justify-center gap-4 px-4 py-3 border-t border-slate-800">
          <button
            onClick={() => setPageNum((p) => Math.max(1, p - 1))}
            disabled={pageNum <= 1}
            className="w-9 h-9 rounded-lg bg-slate-800 border border-slate-700 disabled:opacity-30 text-slate-300 flex items-center justify-center"
          >
            <i className="ti ti-chevron-left" />
          </button>
          <span className="text-xs text-slate-400 tabular-nums">Page {pageNum} / {numPages}</span>
          <button
            onClick={() => setPageNum((p) => Math.min(numPages, p + 1))}
            disabled={pageNum >= numPages}
            className="w-9 h-9 rounded-lg bg-slate-800 border border-slate-700 disabled:opacity-30 text-slate-300 flex items-center justify-center"
          >
            <i className="ti ti-chevron-right" />
          </button>
        </div>
      )}
    </div>
  )
}