// src/components/home/ContinueWatchingCard.jsx
// Shows the most recently watched YT Study Pathsala video right at the
// top of the home page, so the user can jump back in with one tap.
// Clicking it opens VideoPlayerModal, which resumes from the saved
// watchedSeconds (see VideoPlayerModal.jsx).
import { useEffect, useState } from 'react'
import { getRecentWatchItem } from '@/api/watch'

function formatDuration(sec = 0) {
  if (!sec) return ''
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  const s = Math.floor(sec % 60)
  if (h) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return `${m}:${String(s).padStart(2, '0')}`
}

export default function ContinueWatchingCard({ onPlay, refreshKey }) {
  const [item, setItem] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    getRecentWatchItem()
      .then((v) => { if (!cancelled) setItem(v) })
      .catch(() => { if (!cancelled) setItem(null) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [refreshKey])

  if (loading || !item) return null

  const progressPct = item.durationSec > 0
    ? Math.min(100, Math.round(((item.watchedSeconds || 0) / item.durationSec) * 100))
    : 0

  return (
    <button
      onClick={() => onPlay(item)}
      className="w-full flex items-center gap-3 bg-[#141d2e] rounded-2xl border border-slate-800 hover:border-orange-500/40 transition-colors p-2.5 mb-5 text-left group"
    >
      <div className="relative w-28 sm:w-32 aspect-video rounded-xl overflow-hidden bg-slate-900 shrink-0">
        {item.thumbnail ? (
          <img src={item.thumbnail} alt={item.title} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-slate-600">
            <i className="ti ti-video text-2xl" />
          </div>
        )}
        <div className="absolute inset-0 flex items-center justify-center bg-black/25 opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="w-9 h-9 rounded-full bg-orange-500/90 flex items-center justify-center">
            <i className="ti ti-player-play-filled text-base text-white" />
          </div>
        </div>
        {progressPct > 0 && (
          <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-black/50">
            <div className="h-full bg-orange-500" style={{ width: `${progressPct}%` }} />
          </div>
        )}
        {item.durationSec > 0 && (
          <span className="absolute bottom-1.5 right-1.5 px-1 py-0.5 rounded bg-black/80 text-[9px] text-white font-medium tabular-nums">
            {formatDuration(item.durationSec)}
          </span>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5 mb-0.5">
          <i className="ti ti-player-play text-orange-400 text-xs" />
          <span className="text-[10px] uppercase tracking-wide text-orange-400 font-medium">Continue Watching</span>
        </div>
        <p className="text-sm text-slate-200 line-clamp-2 leading-snug">{item.title}</p>
        {item.channelTitle && <p className="text-xs text-slate-500 truncate mt-0.5">{item.channelTitle}</p>}
        {progressPct > 0 && (
          <p className="text-[11px] text-slate-600 mt-1">{progressPct}% dekh liya — yahin se aage badhao</p>
        )}
      </div>

      <i className="ti ti-chevron-right text-slate-600 text-lg shrink-0" />
    </button>
  )
}