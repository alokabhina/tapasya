// src/pages/PdfLibrary.jsx
// Personal PDF library: upload study PDFs (single or bulk), organize them
// into folders (e.g. "Quant", "English"), and open them to read/mark up
// (see PdfReader.jsx) without ever touching the original file.
import { useEffect, useMemo, useRef, useState } from 'react'
import { getPdfs, uploadPdfsBulk, updatePdf, deletePdf, checkPdfAdmin, renamePdfFolder } from '@/api/pdfs'
import PdfReader from '@/components/pdf/PdfReader'

const UNGROUPED = '__ungrouped__' // sentinel for docs with no folder

function formatSize(bytes = 0) {
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

// Live "Xd Yh Zm" (or "Yh Zm Ss" once under a day) countdown to a target
// Date. Ticks every second while under an hour left so the last stretch
// feels alive, otherwise every minute is plenty. Calls onUnlock() once,
// the instant it crosses zero, so the card can refresh from the server.
function useCountdown(targetIso, onUnlock) {
  const [msLeft, setMsLeft] = useState(() => (targetIso ? new Date(targetIso).getTime() - Date.now() : 0))
  const firedRef = useRef(false)

  useEffect(() => {
    if (!targetIso) return undefined
    firedRef.current = false
    function tick() {
      const left = new Date(targetIso).getTime() - Date.now()
      setMsLeft(left)
      if (left <= 0 && !firedRef.current) {
        firedRef.current = true
        onUnlock?.()
      }
    }
    tick()
    const everySec = new Date(targetIso).getTime() - Date.now() < 3600 * 1000
    const id = setInterval(tick, everySec ? 1000 : 30000)
    return () => clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetIso])

  if (!targetIso || msLeft <= 0) return '0s'
  const s = Math.floor(msLeft / 1000)
  const d = Math.floor(s / 86400)
  const h = Math.floor((s % 86400) / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  if (d > 0) return `${d}d ${h}h`
  if (h > 0) return `${h}h ${m}m`
  if (m > 0) return `${m}m ${sec}s`
  return `${sec}s`
}

// ── PDF grid card — handles its own scheduled-unlock countdown (needs its
// own hook instance, hence a separate component rather than inline JSX) ────
function PdfCard({ doc, activeFolder, folders, moveMenuDoc, setMoveMenuDoc, handleMoveTo, handleDelete, setOpenDoc, startEditUnlock, onUnlocked }) {
  const isLocked = doc.locked === true
  const countdown = useCountdown(doc.unlockAt, () => { if (isLocked) onUnlocked?.() })
  // Owner still sees their own scheduled-but-not-yet-live doc marked, just
  // never blocked from opening it.
  const stillScheduled = !isLocked && doc.unlockAt && new Date(doc.unlockAt).getTime() > Date.now()

  return (
    <div
      className={`group relative rounded-2xl overflow-hidden bg-slate-800/60 border border-slate-700/60 transition-colors ${isLocked ? 'cursor-not-allowed' : 'cursor-pointer hover:border-orange-500/50'}`}
      onClick={() => !isLocked && setOpenDoc(doc)}
    >
      <div className="aspect-[3/4] bg-slate-900 flex items-center justify-center relative">
        <i className={`ti ti-file-type-pdf text-5xl ${isLocked ? 'text-red-400/20' : 'text-red-400/70'}`} />

        {isLocked && (
          <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-[1px] flex flex-col items-center justify-center gap-2 px-3 text-center">
            <i className="ti ti-lock text-2xl text-orange-400" />
            <p className="text-[11px] text-slate-300 font-medium">Unlocks in</p>
            <p className="text-sm text-orange-400 font-bold tabular-nums">{countdown}</p>
          </div>
        )}

        <div className="absolute top-2 left-2 flex flex-col gap-1 items-start">
          {doc.isGlobal && (
            <span className="px-1.5 py-0.5 rounded bg-blue-500/90 text-[10px] text-white font-semibold flex items-center gap-1">
              <i className="ti ti-world text-[10px]" /> Global
            </span>
          )}
          {doc.annotatedUrl && !isLocked && (
            <span className="px-1.5 py-0.5 rounded bg-orange-500/90 text-[10px] text-white font-semibold flex items-center gap-1">
              <i className="ti ti-pencil text-[10px]" /> Marked
            </span>
          )}
          {stillScheduled && (
            <span className="px-1.5 py-0.5 rounded bg-slate-950/90 border border-orange-500/40 text-[10px] text-orange-400 font-semibold flex items-center gap-1" title={new Date(doc.unlockAt).toLocaleString()}>
              <i className="ti ti-clock text-[10px]" /> {countdown}
            </span>
          )}
        </div>

        {!isLocked && (
          <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {doc.isMine !== false && (
              <button
                onClick={(e) => { e.stopPropagation(); startEditUnlock(doc) }}
                className="w-7 h-7 rounded-md bg-black/60 hover:bg-slate-700 flex items-center justify-center text-white"
                title="Unlock time set/badlo"
              >
                <i className="ti ti-clock text-xs" />
              </button>
            )}
            {doc.isMine !== false && (
              <button
                onClick={(e) => { e.stopPropagation(); setMoveMenuDoc(moveMenuDoc?._id === doc._id ? null : doc) }}
                className="w-7 h-7 rounded-md bg-black/60 hover:bg-slate-700 flex items-center justify-center text-white"
                title="Doosre folder mein le jao"
              >
                <i className="ti ti-folder-symlink text-xs" />
              </button>
            )}
            {(doc.isMine !== false || doc.annotatedUrl) && (
              <button
                onClick={(e) => { e.stopPropagation(); handleDelete(doc) }}
                className="w-7 h-7 rounded-md bg-black/60 hover:bg-red-600/80 flex items-center justify-center text-white"
              >
                <i className="ti ti-trash text-xs" />
              </button>
            )}
          </div>
        )}

        {moveMenuDoc?._id === doc._id && (
          <div
            onClick={(e) => e.stopPropagation()}
            className="absolute top-11 right-2 z-10 w-40 max-h-48 overflow-y-auto rounded-lg border border-slate-700 bg-slate-900 shadow-xl py-1"
          >
            {activeFolder !== UNGROUPED && (
              <button onClick={() => handleMoveTo(doc, UNGROUPED)} className="w-full text-left px-3 py-1.5 text-[11px] text-slate-300 hover:bg-slate-800">Ungrouped</button>
            )}
            {folders.real.filter((f) => f.name !== activeFolder).map((f) => (
              <button key={f.name} onClick={() => handleMoveTo(doc, f.name)} className="w-full text-left px-3 py-1.5 text-[11px] text-slate-300 hover:bg-slate-800 truncate">{f.name}</button>
            ))}
            {folders.real.length === 0 && activeFolder === UNGROUPED && (
              <p className="px-3 py-1.5 text-[10px] text-slate-600">Koi aur folder nahi hai</p>
            )}
          </div>
        )}
      </div>
      <div className="p-2.5">
        <p className="text-xs text-slate-200 line-clamp-2 leading-snug">{doc.title}</p>
        <p className="text-[10px] text-slate-500 mt-1">{isLocked ? 'Locked' : formatSize(doc.fileSizeBytes)}</p>
      </div>
    </div>
  )
}

export default function PdfLibrary() {
  const [docs, setDocs] = useState([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(null) // { done, total }
  const [openDoc, setOpenDoc] = useState(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [uploadAsGlobal, setUploadAsGlobal] = useState(false)
  const [uploadUnlockAt, setUploadUnlockAt] = useState('') // datetime-local string — optional schedule applied to the whole upcoming batch
  const [unlockEditDoc, setUnlockEditDoc] = useState(null) // doc currently showing its "set unlock time" inline editor
  const [unlockEditValue, setUnlockEditValue] = useState('')
  const [activeFolder, setActiveFolder] = useState(null) // null = folder grid view
  const [showNewFolder, setShowNewFolder] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')
  const [moveMenuDoc, setMoveMenuDoc] = useState(null) // doc currently showing its "move to folder" menu
  const [renamingFolder, setRenamingFolder] = useState(false) // true while the "rename this folder" input is showing
  const [renameFolderValue, setRenameFolderValue] = useState('')
  const [renamingFolderBusy, setRenamingFolderBusy] = useState(false)
  const fileInputRef = useRef(null)
  const newFolderInputRef = useRef(null)
  const pendingUploadFolder = useRef('') // folder the next file-picker selection should land in

  useEffect(() => {
    load()
    checkPdfAdmin().then(setIsAdmin).catch(() => {})
  }, [])

  function load() {
    setLoading(true)
    getPdfs().then(setDocs).catch(() => {}).finally(() => setLoading(false))
  }

  // --- Folder grouping (derived purely from docs — no separate Folder
  // collection; a folder simply exists because a PDF references it) ------
  const folders = useMemo(() => {
    const map = new Map() // name -> count
    for (const d of docs) {
      const key = d.folder || UNGROUPED
      map.set(key, (map.get(key) || 0) + 1)
    }
    const real = [...map.entries()]
      .filter(([name]) => name !== UNGROUPED)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([name, count]) => ({ name, count }))
    const ungroupedCount = map.get(UNGROUPED) || 0
    return { real, ungroupedCount }
  }, [docs])

  const docsInActiveFolder = useMemo(() => {
    if (activeFolder == null) return []
    const wanted = activeFolder === UNGROUPED ? null : activeFolder
    return docs.filter((d) => (d.folder || null) === wanted)
  }, [docs, activeFolder])

  // --- Upload -------------------------------------------------------------
  function openFilePicker(folder) {
    pendingUploadFolder.current = folder || ''
    fileInputRef.current?.click()
  }

  async function handleFileChange(e) {
    const files = Array.from(e.target.files || [])
    e.target.value = '' // allow re-selecting the same file(s) later
    if (!files.length) return

    const nonPdf = files.filter((f) => f.type !== 'application/pdf')
    const pdfFiles = files.filter((f) => f.type === 'application/pdf')
    if (nonPdf.length) alert(`${nonPdf.length} file(s) skip ki gayi — sirf PDF allowed hai`)
    if (!pdfFiles.length) return

    setUploading(true)
    setUploadProgress({ done: 0, total: pdfFiles.length })
    const results = await uploadPdfsBulk(pdfFiles, uploadAsGlobal, pendingUploadFolder.current, (done, total) => setUploadProgress({ done, total }), uploadUnlockAt)
    setUploading(false)
    setUploadProgress(null)

    const succeeded = results.filter((r) => r.doc)
    const failed = results.filter((r) => r.error)
    if (succeeded.length) setDocs((prev) => [...succeeded.map((r) => r.doc), ...prev])
    if (failed.length) alert(`${failed.length} file(s) upload nahi ho payi:\n${failed.map((f) => `• ${f.file.name}`).join('\n')}`)
  }

  // --- Folders --------------------------------------------------------------
  function handleCreateFolder() {
    const name = newFolderName.trim()
    if (!name) return
    setShowNewFolder(false)
    setNewFolderName('')
    // A folder only "exists" once it has a PDF in it, so creating one
    // immediately opens the picker targeting that folder name — matches
    // the natural "make folder, put files in it" flow in one motion.
    openFilePicker(name)
  }

  async function handleMoveTo(doc, folderName) {
    setMoveMenuDoc(null)
    const updated = await updatePdf(doc._id, { folder: folderName === UNGROUPED ? '' : folderName })
    setDocs((prev) => prev.map((d) => (d._id === doc._id ? { ...d, folder: updated.folder } : d)))
  }

  // --- Scheduled unlock time (per PDF, owner only) --------------------------
  function startEditUnlock(doc) {
    setMoveMenuDoc(null)
    // datetime-local wants "YYYY-MM-DDTHH:mm" in LOCAL time, not UTC ISO.
    if (doc.unlockAt) {
      const d = new Date(doc.unlockAt)
      const pad = (n) => String(n).padStart(2, '0')
      setUnlockEditValue(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`)
    } else {
      setUnlockEditValue('')
    }
    setUnlockEditDoc(doc)
  }

  async function saveUnlockTime() {
    const doc = unlockEditDoc
    setUnlockEditDoc(null)
    if (!doc) return
    const updated = await updatePdf(doc._id, { unlockAt: unlockEditValue || '' })
    setDocs((prev) => prev.map((d) => (d._id === doc._id ? { ...d, unlockAt: updated.unlockAt, locked: false } : d)))
  }

  // --- Rename folder (bulk-moves every PDF currently in it to the new name) --
  function startRenameFolder() {
    if (activeFolder == null || activeFolder === UNGROUPED) return
    setRenameFolderValue(activeFolder)
    setRenamingFolder(true)
  }

  async function handleRenameFolder() {
    const newName = renameFolderValue.trim()
    if (!newName || newName === activeFolder) { setRenamingFolder(false); return }
    if (folders.real.some((f) => f.name.toLowerCase() === newName.toLowerCase() && f.name !== activeFolder)) {
      alert('Ye naam pehle se ek folder mein use ho raha hai')
      return
    }
    setRenamingFolderBusy(true)
    try {
      await renamePdfFolder(activeFolder, newName)
      setDocs((prev) => prev.map((d) => (d.folder === activeFolder ? { ...d, folder: newName } : d)))
      setActiveFolder(newName)
      setRenamingFolder(false)
    } catch {
      alert('Folder rename nahi ho paya, dobara try karo')
    } finally {
      setRenamingFolderBusy(false)
    }
  }

  // --- Delete ---------------------------------------------------------------
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
      setDocs((prev) => prev.map((d) => (d._id === doc._id ? { ...d, annotatedUrl: null, annotatedAt: null } : d)))
    }
  }

  const activeFolderLabel = activeFolder === UNGROUPED ? 'Ungrouped' : activeFolder

  return (
    <div className="p-3 sm:p-6 max-w-6xl mx-auto pb-24">
      <div className="relative mb-5 rounded-2xl overflow-hidden border border-slate-800 bg-gradient-to-br from-slate-900 via-slate-900 to-orange-950/30">
        <div className="absolute -top-10 -right-10 w-48 h-48 rounded-full bg-orange-500/10 blur-3xl pointer-events-none" />
        <div className="relative px-4 sm:px-6 py-4 sm:py-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-orange-500/15 border border-orange-500/20 flex items-center justify-center shrink-0">
              <i className={`ti ${activeFolder != null ? 'ti-folder' : 'ti-file-text'} text-orange-400 text-2xl`} />
            </div>
            <div className="min-w-0">
              {activeFolder != null ? (
                <button onClick={() => setActiveFolder(null)} className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-300 mb-0.5">
                  <i className="ti ti-arrow-left text-sm" /> Folders
                </button>
              ) : null}
              {renamingFolder ? (
                <div className="flex items-center gap-1.5">
                  <input
                    autoFocus
                    value={renameFolderValue}
                    onChange={(e) => setRenameFolderValue(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleRenameFolder(); if (e.key === 'Escape') setRenamingFolder(false) }}
                    className="px-2 py-1 rounded-lg bg-slate-800 border border-orange-500/60 text-sm text-slate-100 focus:outline-none w-40 sm:w-56"
                  />
                  <button
                    onClick={handleRenameFolder}
                    disabled={renamingFolderBusy || !renameFolderValue.trim()}
                    className="w-7 h-7 rounded-lg bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white flex items-center justify-center shrink-0"
                    title="Save"
                  >
                    {renamingFolderBusy ? <div className="w-3 h-3 rounded-full border-2 border-white/50 border-t-white animate-spin" /> : <i className="ti ti-check text-sm" />}
                  </button>
                  <button onClick={() => setRenamingFolder(false)} className="w-7 h-7 rounded-lg text-slate-400 hover:text-slate-200 flex items-center justify-center shrink-0" title="Cancel">
                    <i className="ti ti-x text-sm" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 min-w-0">
                  <h2 className="text-lg sm:text-xl font-bold text-slate-100 truncate">{activeFolder != null ? activeFolderLabel : 'PDF Library'}</h2>
                  {activeFolder != null && activeFolder !== UNGROUPED && (
                    <button onClick={startRenameFolder} title="Folder ka naam badlo" className="text-slate-500 hover:text-orange-400 shrink-0">
                      <i className="ti ti-pencil text-sm" />
                    </button>
                  )}
                </div>
              )}
              <p className="text-xs text-slate-500">{activeFolder != null ? `${docsInActiveFolder.length} PDF` : 'Apne PDFs padho, organize karo, mark-up karo'}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
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
            {isAdmin && uploadAsGlobal && (
              <label className="flex items-center gap-1.5 text-xs text-slate-400" title="Optional — is batch ke saare PDFs is time pe unlock honge. Baad mein har PDF ka time alag se bhi badal sakte ho.">
                <i className="ti ti-clock text-orange-400" />
                <input
                  type="datetime-local"
                  value={uploadUnlockAt}
                  onChange={(e) => setUploadUnlockAt(e.target.value)}
                  className="px-2 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-200 text-xs focus:outline-none focus:border-orange-500/60"
                />
                {uploadUnlockAt && (
                  <button onClick={() => setUploadUnlockAt('')} title="Clear" className="text-slate-500 hover:text-slate-300">
                    <i className="ti ti-x text-xs" />
                  </button>
                )}
              </label>
            )}
            {activeFolder == null && (
              <button
                onClick={() => { setShowNewFolder(true); setTimeout(() => newFolderInputRef.current?.focus(), 50) }}
                className="px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-sm font-medium flex items-center gap-2"
              >
                <i className="ti ti-folder-plus" /> Naya Folder
              </button>
            )}
            <button
              onClick={() => openFilePicker(activeFolder != null && activeFolder !== UNGROUPED ? activeFolder : '')}
              disabled={uploading}
              className="px-4 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-white text-sm font-semibold flex items-center gap-2"
            >
              {uploading ? (
                <><div className="w-4 h-4 rounded-full border-2 border-white/50 border-t-white animate-spin" /> {uploadProgress ? `${uploadProgress.done}/${uploadProgress.total} ho gaye` : 'Upload ho raha...'}</>
              ) : (
                <><i className="ti ti-upload" /> Upload karo</>
              )}
            </button>
          </div>
          <input ref={fileInputRef} type="file" accept="application/pdf" multiple onChange={handleFileChange} className="hidden" />
        </div>
      </div>

      {/* New-folder mini modal */}
      {showNewFolder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setShowNewFolder(false)}>
          <div className="w-full max-w-sm rounded-2xl border border-slate-800 bg-slate-900 p-5" onClick={(e) => e.stopPropagation()}>
            <p className="text-sm font-semibold text-slate-200 mb-1">Naya Folder</p>
            <p className="text-xs text-slate-500 mb-3">Naam do — folder banate hi PDFs upload karne ka option aayega</p>
            <input
              ref={newFolderInputRef}
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreateFolder()}
              placeholder="Jaise Quant, English, Reasoning..."
              className="w-full px-3 py-2.5 rounded-lg bg-slate-800 border border-slate-700 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-orange-500/60 mb-4"
            />
            <div className="flex items-center gap-2 justify-end">
              <button onClick={() => setShowNewFolder(false)} className="px-3.5 py-2 rounded-lg text-xs text-slate-400 hover:text-slate-200">Cancel</button>
              <button onClick={handleCreateFolder} disabled={!newFolderName.trim()} className="px-4 py-2 rounded-lg bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white text-xs font-semibold">Banao & Upload</button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <div key={i} className="aspect-[3/4] rounded-2xl bg-slate-800/60 animate-pulse" />)}
        </div>
      ) : activeFolder == null ? (
        // ---- Folder grid (home view) ----
        docs.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 rounded-2xl bg-slate-800/60 border border-slate-700/60 flex items-center justify-center mx-auto mb-3">
              <i className="ti ti-file-upload text-3xl text-slate-500" />
            </div>
            <p className="text-sm font-medium text-slate-400">Abhi koi PDF nahi hai</p>
            <p className="text-xs text-slate-600 mt-1">Upload karke shuru karo, ya pehle folder banao</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {folders.real.map((f) => (
              <button
                key={f.name}
                onClick={() => setActiveFolder(f.name)}
                className="group rounded-2xl border border-slate-800 hover:border-orange-500/50 bg-slate-800/40 p-4 flex flex-col items-start gap-3 text-left transition-colors"
              >
                <div className="w-11 h-11 rounded-xl bg-orange-500/15 border border-orange-500/20 flex items-center justify-center group-hover:bg-orange-500/25">
                  <i className="ti ti-folder text-orange-400 text-xl" />
                </div>
                <div className="min-w-0 w-full">
                  <p className="text-sm text-slate-200 truncate font-medium">{f.name}</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">{f.count} PDF{f.count !== 1 ? 's' : ''}</p>
                </div>
              </button>
            ))}
            {folders.ungroupedCount > 0 && (
              <button
                onClick={() => setActiveFolder(UNGROUPED)}
                className="group rounded-2xl border border-dashed border-slate-700 hover:border-slate-600 bg-slate-800/20 p-4 flex flex-col items-start gap-3 text-left transition-colors"
              >
                <div className="w-11 h-11 rounded-xl bg-slate-700/40 flex items-center justify-center">
                  <i className="ti ti-folder-question text-slate-400 text-xl" />
                </div>
                <div className="min-w-0 w-full">
                  <p className="text-sm text-slate-300 truncate font-medium">Ungrouped</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">{folders.ungroupedCount} PDF{folders.ungroupedCount !== 1 ? 's' : ''}</p>
                </div>
              </button>
            )}
          </div>
        )
      ) : (
        // ---- Inside a folder — the existing PDF grid, filtered ----
        docsInActiveFolder.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 rounded-2xl bg-slate-800/60 border border-slate-700/60 flex items-center justify-center mx-auto mb-3">
              <i className="ti ti-file-upload text-3xl text-slate-500" />
            </div>
            <p className="text-sm font-medium text-slate-400">Is folder mein abhi koi PDF nahi hai</p>
            <p className="text-xs text-slate-600 mt-1">Upload karke shuru karo</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {docsInActiveFolder.map((doc) => (
              <PdfCard
                key={doc._id}
                doc={doc}
                activeFolder={activeFolder}
                folders={folders}
                moveMenuDoc={moveMenuDoc}
                setMoveMenuDoc={setMoveMenuDoc}
                handleMoveTo={handleMoveTo}
                handleDelete={handleDelete}
                setOpenDoc={setOpenDoc}
                startEditUnlock={startEditUnlock}
                onUnlocked={load}
              />
            ))}
          </div>
        )
      )}

      {/* Set / change scheduled unlock time — mini modal */}
      {unlockEditDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setUnlockEditDoc(null)}>
          <div className="w-full max-w-sm rounded-2xl border border-slate-800 bg-slate-900 p-5" onClick={(e) => e.stopPropagation()}>
            <p className="text-sm font-semibold text-slate-200 mb-1 flex items-center gap-1.5"><i className="ti ti-clock text-orange-400" /> Unlock Time</p>
            <p className="text-xs text-slate-500 mb-3 truncate">"{unlockEditDoc.title}" is time tak lock rahega, uske baad khud unlock ho jayega. Khaali chhodo agar abhi hi unlock rakhna hai.</p>
            <input
              type="datetime-local"
              value={unlockEditValue}
              onChange={(e) => setUnlockEditValue(e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg bg-slate-800 border border-slate-700 text-sm text-slate-100 focus:outline-none focus:border-orange-500/60 mb-4"
            />
            <div className="flex items-center gap-2 justify-end">
              {unlockEditValue && (
                <button onClick={() => setUnlockEditValue('')} className="px-3.5 py-2 rounded-lg text-xs text-slate-400 hover:text-slate-200 mr-auto">Abhi unlock karo</button>
              )}
              <button onClick={() => setUnlockEditDoc(null)} className="px-3.5 py-2 rounded-lg text-xs text-slate-400 hover:text-slate-200">Cancel</button>
              <button onClick={saveUnlockTime} className="px-4 py-2 rounded-lg bg-orange-500 hover:bg-orange-600 text-white text-xs font-semibold">Save</button>
            </div>
          </div>
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