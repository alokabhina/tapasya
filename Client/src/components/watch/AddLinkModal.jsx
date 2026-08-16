// src/components/watch/AddLinkModal.jsx
import { useEffect, useRef, useState } from 'react'
import { addWatchLink } from '@/api/watch'
import { getFolders } from '@/api/folders'
import FolderSelect from './FolderSelect'

// crude client-side heuristic just to adjust the UI copy — the backend
// (utils/youtube.js parseYoutubeUrl) is the real source of truth
function looksLikePlaylist(url) {
  return /[?&]list=/.test(url) && !/[?&]v=/.test(url)
}
function looksLikeYoutubeUrl(url) {
  return /youtu\.?be/.test(url)
}

export default function AddLinkModal({ open, onClose, onAdded, defaultFolderId, onToast }) {
  const [folders, setFolders] = useState([])
  const [url, setUrl] = useState('')
  const [folderId, setFolderId] = useState(defaultFolderId || '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState(null)
  const inputRef = useRef(null)

  useEffect(() => {
    if (!open) return
    setError('')
    setResult(null)
    getFolders().then((f) => {
      setFolders(f)
      if (!folderId && f.length) setFolderId(f[0]._id)
    }).catch(() => {})

    // Auto-focus + try to prefill from clipboard if it already looks like a YT link
    setTimeout(() => inputRef.current?.focus(), 50)
    if (navigator.clipboard?.readText) {
      navigator.clipboard.readText().then((text) => {
        if (text && looksLikeYoutubeUrl(text)) setUrl((prev) => prev || text)
      }).catch(() => {})
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') onClose?.() }
    if (open) document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  const isPlaylist = looksLikePlaylist(url)
  const isValidLooking = !url.trim() || looksLikeYoutubeUrl(url)

  async function handlePasteClick() {
    try {
      const text = await navigator.clipboard.readText()
      if (text) setUrl(text)
    } catch {
      onToast?.('Clipboard access allowed nahi hai', 'error')
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setResult(null)
    if (!url.trim()) return setError('Link paste karo pehle')
    if (!isPlaylist && !folderId) return setError('Folder select karo')

    setLoading(true)
    try {
      const data = await addWatchLink({ url: url.trim(), folderId: isPlaylist ? undefined : folderId })
      setResult(data)
      onAdded?.(data)
      onToast?.(
        `${data.added} video${data.added !== 1 ? 's' : ''} added${data.folder ? ` to "${data.folder.name}"` : ''}`,
        'success'
      )
      setUrl('')
    } catch (err) {
      const code = err?.response?.data?.code
      if (code === 'SHORTS_REJECTED') setError('Shorts allowed nahi hai — sirf video ya playlist link')
      else setError(err?.response?.data?.error || 'Kuch galat ho gaya, link check karo')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose?.() }}
    >
      <div className="w-full sm:max-w-md bg-slate-900 border border-slate-700 rounded-t-2xl sm:rounded-2xl p-5 animate-fade-in-up max-h-[90dvh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-orange-500/15 flex items-center justify-center">
              <i className="ti ti-brand-youtube text-orange-400 text-lg" />
            </div>
            <h3 className="text-lg font-semibold text-slate-100">Add Video / Playlist</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-200 w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-800">
            <i className="ti ti-x text-xl" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="text-xs text-slate-400 mb-1 block">YouTube link (video ya playlist)</label>
            <div className="relative">
              <input
                ref={inputRef}
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://youtube.com/watch?v=... ya playlist link"
                className={`w-full pl-3 pr-20 py-2.5 rounded-lg bg-slate-800 border text-slate-100 text-sm focus:outline-none ${
                  isValidLooking ? 'border-slate-700 focus:border-orange-500' : 'border-red-500/50'
                }`}
              />
              <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
                {url && (
                  <button
                    type="button"
                    onClick={() => setUrl('')}
                    className="w-6 h-6 flex items-center justify-center text-slate-500 hover:text-slate-300"
                  >
                    <i className="ti ti-x text-sm" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={handlePasteClick}
                  className="px-2 py-1 rounded-md bg-slate-700/70 hover:bg-slate-700 text-slate-300 text-[11px] font-medium flex items-center gap-1"
                >
                  <i className="ti ti-clipboard text-xs" /> Paste
                </button>
              </div>
            </div>
          </div>

          {isPlaylist ? (
            <div className="text-xs text-orange-400 bg-orange-500/10 border border-orange-500/20 rounded-lg px-3 py-2 flex items-center gap-1.5">
              <i className="ti ti-folder-plus" />
              Playlist ka apna khud ka folder ban jayega (playlist ke naam se)
            </div>
          ) : (
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Folder</label>
              <FolderSelect
                folders={folders}
                value={folderId}
                onChange={setFolderId}
                onFolderCreated={(f) => setFolders((prev) => [...prev, f])}
                onError={(msg) => onToast?.(msg, 'error')}
              />
            </div>
          )}

          {error && (
            <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2 flex items-center gap-1.5">
              <i className="ti ti-alert-circle shrink-0" /> {error}
            </div>
          )}

          {result && (
            <div className="text-sm text-green-400 bg-green-500/10 border border-green-500/20 rounded-lg px-3 py-2 flex items-center gap-1.5">
              <i className="ti ti-circle-check shrink-0" />
              <span>
                {result.added} video{result.added !== 1 ? 's' : ''} add ho gayi
                {result.skipped > 0 && ` (${result.skipped} pehle se the)`}
                {result.folder && ` — folder "${result.folder.name}" bana`}
              </span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !url.trim()}
            className="w-full py-2.5 rounded-lg bg-orange-500 hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium text-sm transition-colors flex items-center justify-center gap-2"
          >
            {loading
              ? <><div className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin" /> Adding...</>
              : <><i className="ti ti-plus" /> Add to Watchlist</>}
          </button>
        </form>
      </div>
    </div>
  )
}