// src/components/channels/ChannelFeedGrid.jsx
// Grid of a subscribed channel's recent full videos (Shorts filtered out
// server-side). Clicking a card plays it right here via onPlay. A quick
// "+" button lets the user add the video straight to their watchlist
// (into the channel's default folder) without leaving the feed.
import { useState } from 'react'
import { addFeedVideoToWatchlist } from '@/api/channels'

function timeAgo(dateStr) {
  if (!dateStr) return ''
  const diff = Date.now() - new Date(dateStr).getTime()
  const hrs = Math.floor(diff / 3600000)
  if (hrs < 1) return 'abhi'
  if (hrs < 24) return `${hrs}h pehle`
  const days = Math.floor(hrs / 24)
  return `${days}d pehle`
}

export default function ChannelFeedGrid({ feed, onPlay, onAddedToWatchlist }) {
  const [addingId, setAddingId] = useState(null)
  const [addedIds, setAddedIds] = useState(new Set())

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

  async function handleAdd(e, v) {
    e.stopPropagation()
    if (!v.folderId || addedIds.has(v.videoId)) return
    setAddingId(v.videoId)
    try {
      await addFeedVideoToWatchlist(v.videoId, {
        folderId: v.folderId, title: v.title, thumbnail: v.thumbnail, channelTitle: v.channelTitle,
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
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
      {feed.map((v, idx) => {
        const isAdded = addedIds.has(v.videoId)
        return (
          <div
            key={v.videoId}
            className="animate-fade-in-up group relative rounded-xl overflow-hidden bg-slate-800/60 border border-slate-700/60 hover:border-orange-500/50 transition-colors"
            style={{ animationDelay: `${Math.min(idx, 8) * 30}ms` }}
          >
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
                <span className="absolute bottom-1.5 right-1.5 px-1.5 py-0.5 rounded bg-black/80 text-[11px] text-white">
                  {v.isLive ? 'LIVE' : timeAgo(v.publishedAt)}
                </span>
              </div>
              <div className="p-2">
                <p className="text-xs text-slate-200 line-clamp-2 leading-snug">{v.title}</p>
                {v.channelTitle && (
                  <p className="text-[11px] text-slate-500 truncate mt-1">{v.channelTitle}</p>
                )}
              </div>
            </button>

            {v.folderId && (
              <button
                type="button"
                onClick={(e) => handleAdd(e, v)}
                disabled={addingId === v.videoId || isAdded}
                title={isAdded ? 'Added to watchlist' : 'Add to watchlist'}
                className={`absolute top-1.5 right-1.5 w-7 h-7 rounded-md flex items-center justify-center border transition-colors ${
                  isAdded
                    ? 'bg-green-500/90 border-green-400'
                    : 'bg-black/70 border-white/20 hover:bg-orange-500/90 opacity-0 group-hover:opacity-100'
                }`}
              >
                {addingId === v.videoId ? (
                  <div className="w-3 h-3 rounded-full border-2 border-white/50 border-t-white animate-spin" />
                ) : (
                  <i className={`ti ${isAdded ? 'ti-check' : 'ti-plus'} text-white text-sm`} />
                )}
              </button>
            )}
          </div>
        )
      })}
    </div>
  )
}