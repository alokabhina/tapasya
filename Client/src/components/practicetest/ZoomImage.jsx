// src/components/practicetest/ZoomImage.jsx
// Diagram image with tap-to-zoom. Puzzle / DI / Direction-Sense figures are
// unreadably small inside a phone's directions panel, so a tap opens a
// full-screen viewer (pinch-zoom + pan work natively via touch-action).
// Used by the live engine, Solutions and the admin preview.

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'

export default function ZoomImage({ src, alt = '', className = '' }) {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!open) return undefined
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  if (!src) return null

  return (
    <>
      <img
        src={src}
        alt={alt}
        loading="lazy"
        draggable={false}
        onClick={() => setOpen(true)}
        title="Tap to zoom"
        className={`block max-w-full h-auto rounded-lg bg-white border border-slate-200 cursor-zoom-in ${className}`}
      />
      {open && createPortal(
        <div
          className="fixed inset-0 z-[300] bg-black/85 overflow-auto p-3"
          onClick={(e) => { if (e.target === e.currentTarget) setOpen(false) }}
        >
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="fixed top-3 right-3 z-[301] w-9 h-9 rounded-full bg-white/90 text-slate-800 flex items-center justify-center shadow"
            aria-label="Close"
          >
            <i className="ti ti-x" />
          </button>
          <img
            src={src}
            alt={alt}
            style={{ touchAction: 'pan-x pan-y pinch-zoom' }}
            className="mx-auto block max-w-full md:max-h-[94vh] object-contain bg-white rounded-lg"
          />
        </div>,
        document.body,
      )}
    </>
  )
}