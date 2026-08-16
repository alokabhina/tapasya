// src/components/channels/FeedVideoPlayerModal.jsx
// Lightweight in-app player for Channel Feed videos — just plays the video
// right here, no watchlist/progress tracking involved (that only applies
// to items the user has explicitly added to their watchlist).
import { useEffect } from 'react'

export default function FeedVideoPlayerModal({ video, onClose }) {
  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') onClose?.() }
    if (video) document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [video, onClose])

  if (!video) return null

  const src = `https://www.youtube.com/embed/${video.videoId}?autoplay=1&modestbranding=1&rel=0`

  return (
    <div
      className="fixed inset-0 z-[110] bg-black/95 flex flex-col"
      onClick={(e) => { if (e.target === e.currentTarget) onClose?.() }}
    >
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
        <div className="min-w-0">
          <p className="text-sm text-slate-200 truncate pr-4">{video.title}</p>
          {video.channelTitle && <p className="text-xs text-slate-500 truncate">{video.channelTitle}</p>}
        </div>
        <button onClick={onClose} className="text-slate-400 hover:text-white shrink-0 w-9 h-9 rounded-lg hover:bg-slate-800 flex items-center justify-center">
          <i className="ti ti-x text-2xl" />
        </button>
      </div>

      <div className="flex-1 flex items-center justify-center p-2 sm:p-6">
        <div className="w-full max-w-4xl aspect-video bg-black">
          <iframe
            key={video.videoId}
            src={src}
            title={video.title}
            className="w-full h-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      </div>
    </div>
  )
}