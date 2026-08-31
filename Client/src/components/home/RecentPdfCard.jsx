// src/components/home/RecentPdfCard.jsx
// Shows the most recently uploaded (or otherwise available) PDF right on
// the home page, next to Continue Watching — one tap jumps straight into
// PDF Library with that PDF already open. Offline-first: falls back to
// whatever's cached in IndexedDB if there's no internet, same as the PDF
// Library page itself.
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getPdfs } from '@/api/pdfs'
import { getPdfsOffline } from '@/utils/offlineDB'

function formatSize(bytes = 0) {
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function pickMostRecent(docs) {
  // Only ever show something actually open-able right now — a PDF that's
  // still on its unlock timer doesn't belong on the home page shortcut at
  // all (nothing to jump into yet), so it's excluded outright rather than
  // falling back to it.
  const openable = docs.filter((d) => !d.locked)
  return [...openable].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0] || null
}

export default function RecentPdfCard({ refreshKey }) {
  const [doc, setDoc] = useState(null)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    let cancelled = false
    setLoading(true)

    async function load() {
      // Offline-first, same pattern as PdfLibrary itself: show cached
      // instantly, then upgrade to the live list if we're online.
      try {
        const cached = await getPdfsOffline()
        if (!cancelled && cached.length) setDoc(pickMostRecent(cached))
      } catch { /* IndexedDB unavailable — fall through to network */ }

      if (!navigator.onLine) { if (!cancelled) setLoading(false); return }

      try {
        const fresh = await getPdfs()
        if (!cancelled) setDoc(pickMostRecent(fresh))
      } catch { /* network blip — keep showing whatever was cached */ }
      finally { if (!cancelled) setLoading(false) }
    }

    load()
    return () => { cancelled = true }
  }, [refreshKey])

  if (loading || !doc) return null

  return (
    <button
      onClick={() => navigate('/pdf-library', { state: { openDocId: doc._id } })}
      className="w-full flex items-center gap-3 bg-[#141d2e] rounded-2xl border border-slate-800 hover:border-orange-500/40 transition-colors p-2.5 mb-5 text-left group"
    >
      <div className="relative w-16 sm:w-20 aspect-[3/4] rounded-xl overflow-hidden bg-slate-900 shrink-0 flex items-center justify-center">
        <i className="ti ti-file-type-pdf text-3xl text-red-400/70" />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5 mb-0.5">
          <i className="ti ti-file-text text-orange-400 text-xs" />
          <span className="text-[10px] uppercase tracking-wide text-orange-400 font-medium">Recent PDF</span>
        </div>
        <p className="text-sm text-slate-200 line-clamp-2 leading-snug">{doc.title}</p>
        <p className="text-xs text-slate-500 truncate mt-0.5">
          {formatSize(doc.fileSizeBytes)}
          {doc.folder ? ` · ${doc.folder}` : ''}
        </p>
      </div>

      <i className="ti ti-chevron-right text-slate-600 text-lg shrink-0" />
    </button>
  )
}