// src/pages/PdfLibrary.jsx
// Personal PDF library: upload study PDFs (single or bulk), organize them
// into folders (e.g. "Quant", "English"), and open them to read/mark up
// (see PdfReader.jsx) without ever touching the original file.
import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { getPdfs, uploadBundle, updatePdf, deletePdf, checkPdfAdmin, renamePdfFolder, addPdfImages, removePdfImage, isoToLocalInput } from '@/api/pdfs'
import PdfReader from '@/components/pdf/PdfReader'
import ImageViewer from '@/components/pdf/ImageViewer'
import { getPdfsOffline, savePdfsOffline, getPdfFileOffline, savePdfFileOffline, deletePdfFileOffline, deletePdfOffline } from '@/utils/offlineDB'

const UNGROUPED = '__ungrouped__' // sentinel for docs with no folder

const MAX_PICS = 10

// Cloudinary delivery transforms: tiny crisp thumbs for the edit modal, and
// auto-format/quality (WebP/AVIF, smaller bytes) for the full-screen viewer.
function thumbUrl(url = '') {
  return url.includes('/upload/') ? url.replace('/upload/', '/upload/c_fill,w_160,h_160,q_auto,f_auto/') : url
}
function viewUrl(url = '') {
  return url.includes('/upload/') ? url.replace('/upload/', '/upload/q_auto,f_auto/') : url
}

// Only these fields may be merged from a PATCH/pics response into the list —
// never annotatedUrl etc., because for a global doc the response could carry
// the OWNER's annotation, not the viewer's own.
function pickMeta(u = {}) {
  const out = {}
  for (const k of ['title', 'summary', 'folder', 'unlockAt', 'images', 'imageCount', 'hasPdf', 'canEdit']) {
    if (u[k] !== undefined) out[k] = u[k]
  }
  return out
}

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
function PdfCard({ doc, activeFolder, folders, moveMenuDoc, setMoveMenuDoc, handleMoveTo, handleDelete, openItem, startEdit, onUnlocked }) {
  const isLocked = doc.locked === true
  const hasPdf = doc.hasPdf ?? !!doc.originalUrl
  const picCount = doc.imageCount ?? doc.images?.length ?? 0
  const canEdit = doc.canEdit ?? doc.isMine !== false // older cached docs don't have canEdit yet
  const summary = (doc.summary || '').trim()
  const countdown = useCountdown(doc.unlockAt, () => { if (isLocked) onUnlocked?.() })
  // Owner still sees their own scheduled-but-not-yet-live doc marked, just
  // never blocked from opening it.
  const stillScheduled = !isLocked && doc.unlockAt && new Date(doc.unlockAt).getTime() > Date.now()

  return (
    <div
      className={`group relative rounded-2xl overflow-hidden bg-slate-800/60 border border-slate-700/60 transition-colors ${isLocked ? 'cursor-not-allowed' : 'cursor-pointer hover:border-orange-500/50'}`}
      onClick={() => !isLocked && openItem(doc)}
    >
      <div className="aspect-[3/4] bg-slate-900 flex items-center justify-center relative">
        <i className={`ti ${hasPdf ? 'ti-file-type-pdf' : 'ti-photo'} text-5xl ${hasPdf ? (isLocked ? 'text-red-400/20' : summary ? 'text-red-400/25' : 'text-red-400/70') : (isLocked ? 'text-sky-400/20' : summary ? 'text-sky-400/25' : 'text-sky-400/70')}`} />

        {/* What's inside / what got covered — straight on the card, no need to open it */}
        {summary && !isLocked && (
          <div className="absolute inset-x-0 bottom-0 p-2.5 pt-8 bg-gradient-to-t from-slate-950 via-slate-950/90 to-transparent">
            <p className="text-[11px] leading-[1.45] text-slate-200 line-clamp-6 whitespace-pre-line break-words">{summary}</p>
          </div>
        )}

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
          {picCount > 0 && (
            <span className="px-1.5 py-0.5 rounded bg-sky-500/90 text-[10px] text-white font-semibold flex items-center gap-1">
              <i className="ti ti-photo text-[10px]" /> {hasPdf ? `+${picCount} pic${picCount !== 1 ? 's' : ''}` : `${picCount} pic${picCount !== 1 ? 's' : ''}`}
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
          <div className={`absolute top-2 right-2 flex items-center gap-1 transition-opacity [@media(hover:none)]:opacity-100 ${moveMenuDoc?._id === doc._id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
            {canEdit && (
              <button
                onClick={(e) => { e.stopPropagation(); startEdit(doc) }}
                className="w-8 h-8 sm:w-7 sm:h-7 rounded-md bg-black/60 hover:bg-slate-700 flex items-center justify-center text-white"
                title="Naam, summary, pics, unlock time badlo"
              >
                <i className="ti ti-pencil text-xs" />
              </button>
            )}
            {canEdit && (
              <button
                onClick={(e) => { e.stopPropagation(); setMoveMenuDoc(moveMenuDoc?._id === doc._id ? null : doc) }}
                className="w-8 h-8 sm:w-7 sm:h-7 rounded-md bg-black/60 hover:bg-slate-700 flex items-center justify-center text-white"
                title="Doosre folder mein le jao"
              >
                <i className="ti ti-folder-symlink text-xs" />
              </button>
            )}
            {(canEdit || doc.annotatedUrl) && (
              <button
                onClick={(e) => { e.stopPropagation(); handleDelete(doc) }}
                className="w-8 h-8 sm:w-7 sm:h-7 rounded-md bg-black/60 hover:bg-red-600/80 flex items-center justify-center text-white"
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
        <p className="text-[10px] text-slate-500 mt-1">
          {isLocked ? 'Locked' : [hasPdf && formatSize(doc.fileSizeBytes), picCount > 0 && `${picCount} pic${picCount !== 1 ? 's' : ''}`].filter(Boolean).join(' · ')}
        </p>
        {isLocked && summary && <p className="text-[10px] text-slate-400 mt-1 line-clamp-3 leading-snug whitespace-pre-line">{summary}</p>}
      </div>
    </div>
  )
}

export default function PdfLibrary() {
  const location = useLocation()
  const navigate = useNavigate()
  const [docs, setDocs] = useState([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(null) // { done, total }
  const [openDoc, setOpenDoc] = useState(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [uploadAsGlobal, setUploadAsGlobal] = useState(false)
  const [uploadUnlockAt, setUploadUnlockAt] = useState('') // datetime-local string — optional schedule applied to the whole upcoming batch
  const [editDocId, setEditDocId] = useState(null) // item whose edit modal (title / summary / pics / unlock) is open
  const [editTitle, setEditTitle] = useState('')
  const [editSummary, setEditSummary] = useState('')
  const [editUnlock, setEditUnlock] = useState('')
  const [editBusy, setEditBusy] = useState(false)
  const [editError, setEditError] = useState('')
  const [chooserDoc, setChooserDoc] = useState(null) // item that has BOTH a PDF and pics → ask which to open
  const [viewer, setViewer] = useState(null) // { doc, index } → full-screen pics viewer
  const editPicsInputRef = useRef(null)
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
  const [isOnline, setIsOnline] = useState(navigator.onLine)

  useEffect(() => {
    function goOnline() { setIsOnline(true); load() } // back online — pull the real list + resume background caching
    function goOffline() { setIsOnline(false) }
    window.addEventListener('online', goOnline)
    window.addEventListener('offline', goOffline)
    return () => {
      window.removeEventListener('online', goOnline)
      window.removeEventListener('offline', goOffline)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    load()
    checkPdfAdmin().then(setIsAdmin).catch(() => {})
  }, [])

  // Auto-open a PDF handed off from elsewhere (e.g. tapping the "Recent
  // PDF" card on the home page passes { openDocId } via navigation state).
  // Waits for docs to actually be loaded (offline cache or server) so the
  // match can succeed, then clears the state so it doesn't re-fire if the
  // user navigates back to this page later.
  useEffect(() => {
    const targetId = location.state?.openDocId
    if (!targetId || !docs.length) return
    const match = docs.find((d) => d._id === targetId)
    if (match) openItem(match)
    navigate(location.pathname, { replace: true, state: {} })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [docs, location.state])

  // Offline-first: show whatever's cached in IndexedDB instantly (works
  // with zero internet), then if we're online, get the real list from the
  // server, show that instead, refresh the cache, and quietly start
  // downloading every PDF's actual file in the background so the whole
  // library — not just ones you've opened before — stays readable offline.
  function load() {
    setLoading(true)
    getPdfsOffline()
      .then((cached) => { if (cached.length) setDocs(cached) })
      .catch(() => {})
      .finally(() => {
        if (!navigator.onLine) { setLoading(false); return }
        getPdfs()
          .then((fresh) => {
            setDocs(fresh)
            savePdfsOffline(fresh).catch(() => {})
            cachePdfFilesInBackground(fresh)
          })
          .catch(() => { /* network blip — keep showing whatever was cached above */ })
          .finally(() => setLoading(false))
      })
  }

  // Sequentially downloads each not-yet-cached, unlocked PDF's bytes into
  // IndexedDB — one at a time (not Promise.all) so it doesn't hammer
  // Cloudinary or hog a slow/metered connection all at once. Silently
  // skips locked PDFs (no file URL to fetch yet anyway) and anything that
  // fails, and just moves on to the next.
  async function cachePdfFilesInBackground(docsToCache) {
    for (const d of docsToCache) {
      if (!d.originalUrl || d.locked) continue
      try {
        const already = await getPdfFileOffline(d._id)
        if (already) continue
        const res = await fetch(d.originalUrl)
        if (!res.ok) continue
        const blob = await res.blob()
        await savePdfFileOffline(d._id, blob)
      } catch {
        // offline mid-batch, or this one file failed — just move on
      }
    }
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

    const isPdf = (f) => f.type === 'application/pdf' || /\.pdf$/i.test(f.name)
    const isImg = (f) => f.type.startsWith('image/')
    const pdfFiles = files.filter(isPdf)
    const imgFiles = files.filter((f) => !isPdf(f) && isImg(f))
    const skipped = files.length - pdfFiles.length - imgFiles.length
    if (skipped) alert(`${skipped} file(s) skip ki gayi — sirf PDF ya photo allowed hai`)
    if (!pdfFiles.length && !imgFiles.length) return
    if (imgFiles.length > MAX_PICS) { alert(`Ek item mein max ${MAX_PICS} pics ho sakti hain — ${imgFiles.length} chuni hain`); return }

    // One library item = optional PDF + its revision pics:
    //  • 1 PDF + pics  → ONE item (PDF and pics together; chooser on tap)
    //  • only PDFs     → one item per PDF, exactly like before
    //  • only pics     → one pics-only item
    //  • many PDFs + pics → PDFs stay separate, pics become their own item
    //    (attach them to a specific PDF afterwards with ✏️ → "Pics add karo")
    const picsTitle = `Revision Pics — ${new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`
    const jobs = []
    if (pdfFiles.length === 1 && imgFiles.length) jobs.push({ pdf: pdfFiles[0], images: imgFiles })
    else {
      pdfFiles.forEach((f) => jobs.push({ pdf: f, images: [] }))
      if (imgFiles.length) jobs.push({ pdf: null, images: imgFiles })
    }

    setUploading(true)
    setUploadProgress({ done: 0, total: jobs.length })
    const succeeded = []
    const failed = []
    // Sequential on purpose — big batches shouldn't all hit Cloudinary at once,
    // and one failure shouldn't take the rest down.
    for (let i = 0; i < jobs.length; i++) {
      const job = jobs[i]
      try {
        const doc = await uploadBundle({
          pdf: job.pdf,
          images: job.images,
          title: job.pdf ? job.pdf.name.replace(/\.pdf$/i, '') : picsTitle,
          isGlobal: uploadAsGlobal,
          folder: pendingUploadFolder.current,
          unlockAt: uploadUnlockAt,
        })
        succeeded.push(doc)
      } catch (err) {
        failed.push(`${job.pdf ? job.pdf.name : `${job.images.length} pic(s)`} — ${err?.response?.data?.error || 'upload fail'}`)
      }
      setUploadProgress({ done: i + 1, total: jobs.length })
    }
    setUploading(false)
    setUploadProgress(null)

    if (succeeded.length) setDocs((prev) => [...succeeded, ...prev])
    if (failed.length) alert(`${failed.length} upload nahi ho paye:\n${failed.map((f) => `• ${f}`).join('\n')}`)
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

  // --- Open an item: PDF → reader, pics → viewer, both → chooser ---------------
  function openItem(doc) {
    if (doc.locked) return
    const hasPdf = doc.hasPdf ?? !!doc.originalUrl
    const picCount = doc.images?.length ?? 0
    if (hasPdf && picCount) setChooserDoc(doc)
    else if (hasPdf) setOpenDoc(doc)
    else if (picCount) setViewer({ doc, index: 0 })
  }

  // --- Edit an item (owner, or either admin for a global item) ----------------
  const editDoc = editDocId ? docs.find((d) => d._id === editDocId) : null

  function patchDoc(id, updated) {
    setDocs((prev) => prev.map((d) => (d._id === id ? { ...d, ...pickMeta(updated), locked: false } : d)))
  }

  function startEdit(doc) {
    setMoveMenuDoc(null)
    setEditTitle(doc.title || '')
    setEditSummary(doc.summary || '')
    setEditUnlock(isoToLocalInput(doc.unlockAt)) // datetime-local wants LOCAL "YYYY-MM-DDTHH:mm"
    setEditError('')
    setEditDocId(doc._id)
  }

  async function saveEdit() {
    if (!editDoc) return
    setEditBusy(true)
    setEditError('')
    try {
      const updated = await updatePdf(editDoc._id, { title: editTitle.trim() || editDoc.title, summary: editSummary.trim(), unlockAt: editUnlock || '' })
      patchDoc(editDoc._id, updated)
      setEditDocId(null)
    } catch (e) {
      setEditError(e?.response?.data?.error || 'Save nahi ho paya, dobara try karo')
    } finally {
      setEditBusy(false)
    }
  }

  async function handleAddPics(e) {
    const files = Array.from(e.target.files || []).filter((f) => f.type.startsWith('image/'))
    e.target.value = ''
    if (!editDoc || !files.length) return
    if ((editDoc.images?.length || 0) + files.length > MAX_PICS) { setEditError(`Ek item mein max ${MAX_PICS} pics ho sakti hain`); return }
    setEditBusy(true)
    setEditError('')
    try {
      patchDoc(editDoc._id, await addPdfImages(editDoc._id, files))
    } catch (err) {
      setEditError(err?.response?.data?.error || 'Pics upload nahi ho payi')
    } finally {
      setEditBusy(false)
    }
  }

  async function handleRemovePic(img) {
    if (!editDoc || !confirm('Ye pic hata dein?')) return
    setEditBusy(true)
    setEditError('')
    try {
      patchDoc(editDoc._id, await removePdfImage(editDoc._id, img.publicId))
    } catch (err) {
      setEditError(err?.response?.data?.error || 'Pic hat nahi payi')
    } finally {
      setEditBusy(false)
    }
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
    const isOwnUpload = doc.canEdit ?? doc.isMine !== false // uploader, or an admin on a global item → deletes the real thing for everyone
    const msg = isOwnUpload
      ? `"${doc.title}" delete karna hai?${doc.isGlobal ? ' (Ye global hai — sabke liye hat jayega)' : ''}`
      : `"${doc.title}" global PDF hai — sirf tumhara khud ka markup hatega, sabke liye file rahegi. Theek hai?`
    if (!confirm(msg)) return

    await deletePdf(doc._id)
    if (isOwnUpload) {
      setDocs((prev) => prev.filter((d) => d._id !== doc._id))
      deletePdfFileOffline(doc._id).catch(() => {})
      deletePdfOffline(doc._id).catch(() => {})
    } else {
      setDocs((prev) => prev.map((d) => (d._id === doc._id ? { ...d, annotatedUrl: null, annotatedAt: null } : d)))
    }
  }

  const activeFolderLabel = activeFolder === UNGROUPED ? 'Ungrouped' : activeFolder

  return (
    <div className="p-3 sm:p-6 max-w-6xl mx-auto pb-24">
      {!isOnline && (
        <div className="mb-3 px-3.5 py-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs flex items-center gap-2">
          <i className="ti ti-wifi-off text-sm" /> Offline ho — pehle jo PDFs cache ho chuke the wahi dikh rahe hain. Naye upload/changes internet aane pe sync ho jayenge.
        </div>
      )}
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
              <p className="text-xs text-slate-500">{activeFolder != null ? `${docsInActiveFolder.length} item${docsInActiveFolder.length !== 1 ? 's' : ''}` : 'Apne PDFs padho, organize karo, mark-up karo'}</p>
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
          <input ref={fileInputRef} type="file" accept="application/pdf,image/*" multiple onChange={handleFileChange} className="hidden" />
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
                  <p className="text-[11px] text-slate-500 mt-0.5">{f.count} item{f.count !== 1 ? 's' : ''}</p>
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
                  <p className="text-[11px] text-slate-500 mt-0.5">{folders.ungroupedCount} item{folders.ungroupedCount !== 1 ? 's' : ''}</p>
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
                openItem={openItem}
                startEdit={startEdit}
                onUnlocked={load}
              />
            ))}
          </div>
        )
      )}

      {/* Edit item — title, summary shown on the card, pics, unlock time */}
      {editDoc && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 sm:p-4" onClick={() => !editBusy && setEditDocId(null)}>
          <div className="w-full sm:max-w-md max-h-[92vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl border border-slate-800 bg-slate-900 p-5" onClick={(e) => e.stopPropagation()}>
            <p className="text-sm font-semibold text-slate-200 mb-3 flex items-center gap-1.5"><i className="ti ti-pencil text-orange-400" /> Item edit karo</p>

            <label className="block text-[11px] text-slate-500 mb-1">Naam</label>
            <input
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg bg-slate-800 border border-slate-700 text-sm text-slate-100 focus:outline-none focus:border-orange-500/60 mb-3"
            />

            <label className="flex items-center justify-between text-[11px] text-slate-500 mb-1">
              <span>Summary — card pe direct dikhegi (4-5 line)</span>
              <span className="tabular-nums">{editSummary.length}/500</span>
            </label>
            <textarea
              value={editSummary}
              onChange={(e) => setEditSummary(e.target.value.slice(0, 500))}
              rows={5}
              placeholder={'Jaise: Aaj ke CA mein kya cover hua —\n• RBI repo rate\n• G20 summit\n• Sports awards'}
              className="w-full px-3 py-2.5 rounded-lg bg-slate-800 border border-slate-700 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-orange-500/60 mb-3 resize-none"
            />

            <label className="block text-[11px] text-slate-500 mb-1">Revision pics ({editDoc.images?.length || 0}/{MAX_PICS})</label>
            <div className="flex flex-wrap gap-2 mb-3">
              {(editDoc.images || []).map((img) => (
                <div key={img.publicId} className="relative w-16 h-16 rounded-lg overflow-hidden border border-slate-700 bg-slate-800">
                  <img src={thumbUrl(img.url)} alt="" className="w-full h-full object-cover" />
                  <button
                    onClick={() => handleRemovePic(img)}
                    disabled={editBusy}
                    className="absolute top-0.5 right-0.5 w-5 h-5 rounded-full bg-black/70 hover:bg-red-600 text-white flex items-center justify-center disabled:opacity-50"
                    title="Pic hatao"
                  >
                    <i className="ti ti-x text-[10px]" />
                  </button>
                </div>
              ))}
              {(editDoc.images?.length || 0) < MAX_PICS && (
                <button
                  onClick={() => editPicsInputRef.current?.click()}
                  disabled={editBusy}
                  className="w-16 h-16 rounded-lg border border-dashed border-slate-600 hover:border-orange-500/60 text-slate-400 hover:text-orange-400 flex flex-col items-center justify-center gap-0.5 disabled:opacity-50"
                >
                  <i className="ti ti-photo-plus text-lg" />
                  <span className="text-[9px]">Pics add</span>
                </button>
              )}
              <input ref={editPicsInputRef} type="file" accept="image/*" multiple onChange={handleAddPics} className="hidden" />
            </div>

            <label className="text-[11px] text-slate-500 mb-1 flex items-center gap-1"><i className="ti ti-clock text-orange-400" /> Unlock time (optional)</label>
            <div className="flex items-center gap-2 mb-1">
              <input
                type="datetime-local"
                value={editUnlock}
                onChange={(e) => setEditUnlock(e.target.value)}
                className="flex-1 min-w-0 px-3 py-2.5 rounded-lg bg-slate-800 border border-slate-700 text-sm text-slate-100 focus:outline-none focus:border-orange-500/60"
              />
              {editUnlock && (
                <button onClick={() => setEditUnlock('')} className="px-2.5 py-2 rounded-lg text-xs text-slate-400 hover:text-slate-200 shrink-0">Abhi unlock</button>
              )}
            </div>
            <p className="text-[10px] text-slate-600 mb-4">Is time tak sabke liye lock rahega (global item ho to), phir khud unlock ho jayega.</p>

            {editError && <p className="text-xs text-red-400 mb-3">{editError}</p>}

            <div className="flex items-center gap-2 justify-end">
              <button onClick={() => setEditDocId(null)} disabled={editBusy} className="px-3.5 py-2 rounded-lg text-xs text-slate-400 hover:text-slate-200 disabled:opacity-50">Cancel</button>
              <button onClick={saveEdit} disabled={editBusy || !editTitle.trim()} className="px-4 py-2 rounded-lg bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-1.5">
                {editBusy && <div className="w-3 h-3 rounded-full border-2 border-white/50 border-t-white animate-spin" />} Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PDF + pics item → pick what to open */}
      {chooserDoc && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 sm:p-4" onClick={() => setChooserDoc(null)}>
          <div className="w-full sm:max-w-sm rounded-t-2xl sm:rounded-2xl border border-slate-800 bg-slate-900 p-5" onClick={(e) => e.stopPropagation()}>
            <p className="text-sm font-semibold text-slate-200 line-clamp-2 mb-1">{chooserDoc.title}</p>
            <p className="text-xs text-slate-500 mb-4">Kya kholna hai?</p>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => { const d = chooserDoc; setChooserDoc(null); setOpenDoc(d) }}
                className="rounded-xl border border-slate-700 hover:border-orange-500/60 bg-slate-800/60 p-4 flex flex-col items-center gap-2"
              >
                <i className="ti ti-file-type-pdf text-3xl text-red-400" />
                <span className="text-xs text-slate-200 font-medium">PDF</span>
              </button>
              <button
                onClick={() => { const d = chooserDoc; setChooserDoc(null); setViewer({ doc: d, index: 0 }) }}
                className="rounded-xl border border-slate-700 hover:border-sky-500/60 bg-slate-800/60 p-4 flex flex-col items-center gap-2"
              >
                <i className="ti ti-photo text-3xl text-sky-400" />
                <span className="text-xs text-slate-200 font-medium">Revision Pics ({chooserDoc.images?.length || 0})</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {viewer && (
        <ImageViewer
          images={(viewer.doc.images || []).map((im) => ({ ...im, url: viewUrl(im.url) }))}
          startIndex={viewer.index}
          title={viewer.doc.title}
          onClose={() => setViewer(null)}
        />
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