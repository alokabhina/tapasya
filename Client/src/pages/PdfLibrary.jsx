// src/pages/PdfLibrary.jsx
// Personal PDF library: upload study PDFs, open them to read, and mark
// them up (see PdfReader.jsx) without ever touching the original file.
import { useEffect, useRef, useState } from 'react'
import { getPdfs, uploadPdf, deletePdf, checkPdfAdmin } from '@/api/pdfs'
import PdfReader from '@/components/pdf/PdfReader'

function formatSize(bytes = 0) {
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export default function PdfLibrary() {
  const [docs, setDocs] = useState([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [openDoc, setOpenDoc] = useState(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [uploadAsGlobal, setUploadAsGlobal] = useState(false)
  const fileInputRef = useRef(null)

  useEffect(() => {
    load()
    checkPdfAdmin().then(setIsAdmin).catch(() => {})
  }, [])

  function load() {
    setLoading(true)
    getPdfs().then(setDocs).catch(() => {}).finally(() => setLoading(false))
  }

  async function handleFileChange(e) {
    const file = e.target.files?.[0]
    e.target.value = '' // allow re-selecting the same file later
    if (!file) return
    if (file.type !== 'application/pdf') { alert('Sirf PDF files allowed hain'); return }
    setUploading(true)
    try {
      const doc = await uploadPdf(file, file.name.replace(/\.pdf$/i, ''), uploadAsGlobal)
      setDocs((prev) => [doc, ...prev])
    } catch {
      alert('Upload nahi ho paya, dobara try karo')
    } finally {
      setUploading(false)
    }
  }

  async function handleDelete(doc) {
    const isOwnUpload = doc.isMine !== false
    const msg = isOwnUpload
      ? `"${doc.title}" delete karna hai?${doc.isGlobal ? ' (Ye global hai — sabke liye hat jayega)' : ''}`
      : `"${doc.title}" global PDF hai — sirf tumhara khud ka markup hatega, sabke liye file rahegi. Theek hai?`
    if (!confirm(msg)) return

    await deletePdf(doc._id)
    if (isOwnUpload) {
      setDocs((prev) => prev.filter((d) => d._id !== doc._id))
    } else {
      // Shared doc stays in everyone's list — just clear my own markup badge.
      setDocs((prev) => prev.map((d) => (d._id === doc._id ? { ...d, annotatedUrl: null, annotatedAt: null } : d)))
    }
  }

  return (
    <div className="p-3 sm:p-6 max-w-6xl mx-auto pb-24">
      <div className="relative mb-5 rounded-2xl overflow-hidden border border-slate-800 bg-gradient-to-br from-slate-900 via-slate-900 to-orange-950/30">
        <div className="absolute -top-10 -right-10 w-48 h-48 rounded-full bg-orange-500/10 blur-3xl pointer-events-none" />
        <div className="relative px-4 sm:px-6 py-4 sm:py-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-orange-500/15 border border-orange-500/20 flex items-center justify-center shrink-0">
              <i className="ti ti-file-text text-orange-400 text-2xl" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-slate-100">PDF Library</h2>
              <p className="text-xs text-slate-500">Apne PDFs padho aur mark-up karo</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {isAdmin && (
              <label className="flex items-center gap-1.5 text-xs text-slate-400 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={uploadAsGlobal}
                  onChange={(e) => setUploadAsGlobal(e.target.checked)}
                  className="w-4 h-4 rounded accent-orange-500"
                />
                <i className="ti ti-world text-orange-400" /> Sabke liye (global)
              </label>
            )}
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="px-4 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-white text-sm font-semibold flex items-center gap-2"
            >
              {uploading ? (
                <><div className="w-4 h-4 rounded-full border-2 border-white/50 border-t-white animate-spin" /> Upload ho raha...</>
              ) : (
                <><i className="ti ti-upload" /> PDF Upload karo</>
              )}
            </button>
          </div>
          <input ref={fileInputRef} type="file" accept="application/pdf" onChange={handleFileChange} className="hidden" />
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="aspect-[3/4] rounded-2xl bg-slate-800/60 animate-pulse" />
          ))}
        </div>
      ) : docs.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-16 h-16 rounded-2xl bg-slate-800/60 border border-slate-700/60 flex items-center justify-center mx-auto mb-3">
            <i className="ti ti-file-upload text-3xl text-slate-500" />
          </div>
          <p className="text-sm font-medium text-slate-400">Abhi koi PDF nahi hai</p>
          <p className="text-xs text-slate-600 mt-1">Upload karke shuru karo</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {docs.map((doc) => (
            <div
              key={doc._id}
              className="group relative rounded-2xl overflow-hidden bg-slate-800/60 border border-slate-700/60 hover:border-orange-500/50 transition-colors cursor-pointer"
              onClick={() => setOpenDoc(doc)}
            >
              <div className="aspect-[3/4] bg-slate-900 flex items-center justify-center relative">
                <i className="ti ti-file-type-pdf text-5xl text-red-400/70" />
                <div className="absolute top-2 left-2 flex flex-col gap-1 items-start">
                  {doc.isGlobal && (
                    <span className="px-1.5 py-0.5 rounded bg-blue-500/90 text-[10px] text-white font-semibold flex items-center gap-1">
                      <i className="ti ti-world text-[10px]" /> Global
                    </span>
                  )}
                  {doc.annotatedUrl && (
                    <span className="px-1.5 py-0.5 rounded bg-orange-500/90 text-[10px] text-white font-semibold flex items-center gap-1">
                      <i className="ti ti-pencil text-[10px]" /> Marked
                    </span>
                  )}
                </div>
                {(doc.isMine !== false || doc.annotatedUrl) && (
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDelete(doc) }}
                    className="absolute top-2 right-2 w-7 h-7 rounded-md bg-black/60 hover:bg-red-600/80 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity"
                  >
                    <i className="ti ti-trash text-xs" />
                  </button>
                )}
              </div>
              <div className="p-2.5">
                <p className="text-xs text-slate-200 line-clamp-2 leading-snug">{doc.title}</p>
                <p className="text-[10px] text-slate-500 mt-1">{formatSize(doc.fileSizeBytes)}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {openDoc && (
        <PdfReader
          doc={openDoc}
          onClose={() => setOpenDoc(null)}
          onSaved={(updated) => {
            setDocs((prev) => prev.map((d) => (d._id === updated._id ? updated : d)))
            setOpenDoc(updated)
          }}
        />
      )}
    </div>
  )
}