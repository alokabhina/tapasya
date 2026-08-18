// src/components/channels/ChannelFeedGrid.jsx
// Grid of a subscribed channel's recent full videos (Shorts filtered out
// server-side). Clicking a card plays it right here via onPlay. A quick
// "+" button opens a small folder-picker popover so the user chooses which
// watchlist folder the video goes into (defaulting to the channel's own
// folder, but any folder — or a brand new one — can be picked instead).
import { useState, useRef, useEffect } from 'react'
import { addFeedVideoToWatchlist } from '@/api/channels'
import { createFolder } from '@/api/folders'

function timeAgo(dateStr) {
  if (!dateStr) return ''
  const diff = Date.now() - new Date(dateStr).getTime()
  const hrs = Math.floor(diff / 3600000)
  if (hrs < 1) return 'abhi'
  if (hrs < 24) return `${hrs}h pehle`
  const days = Math.floor(hrs / 24)
  return `${days}d pehle`
}

function formatScheduled(dateStr) {
  if (!dateStr) return 'Scheduled'
  const diff = new Date(dateStr).getTime() - Date.now()
  const days = Math.round(diff / 86400000)
  if (days <= 0) return 'Aaj/kal'
  if (days === 1) return 'Kal'
  return `${days}d mein`
}

// Small popover: pick an existing folder or create a new one on the fly.
function FolderPickerPopover({ video, folders, onPick, onFolderCreated, onClose }) {
  const ref = useRef(null)
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    function onDocClick(e) { if (ref.current && !ref.current.contains(e.target)) onClose() }
    function onKey(e) { if (e.key === 'Escape') onClose() }
    document.addEventListener('mousedown', onDocClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDocClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [onClose])

  // Channel's default folder (if any) bubbled to the top for a quick tap.
  const ordered = [...folders].sort((a, b) => {
    if (a._id === video.folderId) return -1
    if (b._id === video.folderId) return 1
    return 0
  })

  async function handleCreate() {
    if (!newName.trim()) return
    setSaving(true)
    try {
      const folder = await createFolder(newName.trim())
      onFolderCreated?.(folder)
      onPick(folder._id)
    } catch {
      // leave the popover open so the user can retry
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      ref={ref}
      onClick={(e) => e.stopPropagation()}
      className="absolute top-9 right-1.5 z-20 w-48 rounded-lg bg-slate-900 border border-slate-700 shadow-xl shadow-black/40 overflow-hidden animate-fade-in-up"
    >
      <div className="px-2.5 py-1.5 text-[10px] font-semibold text-slate-500 uppercase tracking-wide border-b border-slate-800">
        Konse folder mein add karein?
      </div>
      <div className="max-h-48 overflow-y-auto py-1">
        {ordered.length === 0 && (
          <p className="px-2.5 py-2 text-xs text-slate-500">Koi folder nahi hai</p>
        )}
        {ordered.map((f) => (
          <button
            key={f._id}
            type="button"
            onClick={() => onPick(f._id)}
            className="w-full flex items-center gap-2 px-2.5 py-2 text-left text-xs text-slate-200 hover:bg-slate-800 transition-colors"
          >
            <i className="ti ti-folder text-orange-400 text-sm" />
            <span className="truncate flex-1">{f.name}</span>
            {f._id === video.folderId && (
              <span className="text-[9px] text-orange-400 shrink-0">default</span>
            )}
          </button>
        ))}
      </div>
      <div className="border-t border-slate-800 p-1.5">
        {creating ? (
          <div className="flex gap-1">
            <input
              autoFocus
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleCreate() } }}
              placeholder="Folder ka naam"
              className="flex-1 min-w-0 px-2 py-1.5 rounded-md bg-slate-800 border border-orange-500/50 text-slate-100 text-xs focus:outline-none"
            />
            <button
              type="button"
              onClick={handleCreate}
              disabled={saving || !newName.trim()}
              className="px-2 py-1.5 rounded-md bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white text-xs"
            >
              {saving ? '...' : 'OK'}
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setCreating(true)}
            className="w-full flex items-center gap-1.5 px-2 py-1.5 rounded-md text-xs text-orange-400 hover:bg-slate-800 transition-colors"
          >
            <i className="ti ti-folder-plus" /> Naya folder banao
          </button>
        )}
      </div>
    </div>
  )
}

export default function ChannelFeedGrid({ feed, folders = [], onPlay, onAddedToWatchlist, onFolderCreated }) {
  const [addingId, setAddingId] = useState(null)
  const [addedIds, setAddedIds] = useState(new Set())
  const [pickerVideoId, setPickerVideoId] = useState(null)

  if (!feed.length) {
    return (
      <div className="text-center py-16 text-slate-500">
        <div className="w-16 h-16 rounded-2xl bg-slate-800/60 border border-slate-700/60 flex items-center justify-center mx-auto mb-3">
          <i className="ti ti-rss text-3xl" />
        </div>
        <p className="text-sm font-medium text-slate-400">Feed abhi khali hai</p>
        <p className="text-xs text-slate-600 mt-1">Channels subscribe karo, thodi der mein videos aa jayengi</p>
      </div>
    )
  }

  function handleTogglePicker(e, v) {
    e.stopPropagation()
    if (addedIds.has(v.videoId)) return
    setPickerVideoId((prev) => (prev === v.videoId ? null : v.videoId))
  }

  async function handleAdd(v, folderId) {
    if (!folderId || addedIds.has(v.videoId)) return
    setPickerVideoId(null)
    setAddingId(v.videoId)
    try {
      await addFeedVideoToWatchlist(v.videoId, {
        folderId, title: v.title, thumbnail: v.thumbnail, channelTitle: v.channelTitle,
      })
      setAddedIds((prev) => new Set(prev).add(v.videoId))
      onAddedToWatchlist?.(v)
    } catch {
      // silent — user can retry
    } finally {
      setAddingId(null)
    }
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {feed.map((v, idx) => {
        const isAdded = addedIds.has(v.videoId)
        return (
          <div
            key={v.videoId}
            className="animate-fade-in-up group relative rounded-xl bg-slate-800/60 border border-slate-700/60 hover:border-orange-500/50 transition-colors"
            style={{ animationDelay: `${Math.min(idx, 8) * 30}ms` }}
          >
            {/* Inner wrapper clips the thumbnail to the rounded corners; the
                outer card stays overflow-visible so the folder popover can
                escape the card bounds without being clipped. */}
            <div className="rounded-xl overflow-hidden">
              <button type="button" onClick={() => onPlay?.(v)} className="text-left w-full block">
                <div className="relative aspect-video bg-slate-900">
                  {v.thumbnail ? (
                    <img src={v.thumbnail} alt={v.title} loading="lazy" className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-600">
                      <i className="ti ti-video text-3xl" />
                    </div>
                  )}
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="w-11 h-11 rounded-full bg-orange-500/90 flex items-center justify-center shadow-lg">
                      <i className="ti ti-player-play-filled text-xl text-white" />
                    </div>
                  </div>
                  {v.isLive && (
                    <span className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded bg-red-600 text-[10px] text-white font-bold flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" /> LIVE
                    </span>
                  )}
                  {!v.isLive && v.isUpcoming && (
                    <span className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded bg-slate-700/90 text-[10px] text-slate-200 font-medium flex items-center gap-1">
                      <i className="ti ti-calendar-event text-[10px]" /> {formatScheduled(v.scheduledStartTime)}
                    </span>
                  )}
                  <span className="absolute bottom-1.5 right-1.5 px-1.5 py-0.5 rounded bg-black/80 text-[11px] text-white">
                    {v.isLive ? 'LIVE' : v.isUpcoming ? 'Upcoming' : timeAgo(v.publishedAt)}
                  </span>
                </div>
                <div className="p-2">
                  <p className="text-xs text-slate-200 line-clamp-2 leading-snug">{v.title}</p>
                  {v.channelTitle && (
                    <p className="text-[11px] text-slate-500 truncate mt-1">{v.channelTitle}</p>
                  )}
                </div>
              </button>
            </div>

            <button
              type="button"
              onClick={(e) => handleTogglePicker(e, v)}
              disabled={addingId === v.videoId || isAdded}
              title={isAdded ? 'Added to watchlist' : 'Add to watchlist'}
              className={`absolute top-1.5 right-1.5 w-7 h-7 rounded-md flex items-center justify-center border transition-colors ${
                isAdded
                  ? 'bg-green-500/90 border-green-400'
                  : pickerVideoId === v.videoId
                    ? 'bg-orange-500/90 border-orange-400 opacity-100'
                    : 'bg-black/70 border-white/20 hover:bg-orange-500/90 opacity-0 group-hover:opacity-100'
              }`}
            >
              {addingId === v.videoId ? (
                <div className="w-3 h-3 rounded-full border-2 border-white/50 border-t-white animate-spin" />
              ) : (
                <i className={`ti ${isAdded ? 'ti-check' : 'ti-plus'} text-white text-sm`} />
              )}
            </button>

            {pickerVideoId === v.videoId && (
              <FolderPickerPopover
                video={v}
                folders={folders}
                onPick={(folderId) => handleAdd(v, folderId)}
                onFolderCreated={onFolderCreated}
                onClose={() => setPickerVideoId(null)}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}