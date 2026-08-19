// src/components/channels/FeedVideoPlayerModal.jsx
// Lightweight in-app player for Channel Feed videos — just plays the video
// right here, no watchlist/progress tracking involved (that only applies
// to items the user has explicitly added to their watchlist).
//
// For LIVE videos, also shows YouTube's own live chat panel alongside the
// player (YouTube's `/live_chat` embed). Viewing always works; commenting
// works too as long as the person is (or signs in as) their YouTube/Google
// account inside that embedded panel — that's YouTube's own sign-in flow
// running inside the iframe, not something this app can force or fake.
import { useEffect, useState } from 'react'
import { useAutoLandscapeFullscreen } from '@/hooks/useAutoLandscapeFullscreen'

export default function FeedVideoPlayerModal({ video, onClose }) {
  useAutoLandscapeFullscreen()
  const [showChat, setShowChat] = useState(true) // mobile: toggle between video/chat

  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') onClose?.() }
    if (video) document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [video, onClose])

  useEffect(() => { setShowChat(true) }, [video?.videoId]) // reset per video

  if (!video) return null

  const src = `https://www.youtube.com/embed/${video.videoId}?autoplay=1&modestbranding=1&rel=0`
  const chatSrc = `https://www.youtube.com/live_chat?v=${video.videoId}&embed_domain=${window.location.hostname}`
  const isLive = !!video.isLive

  return (
    <div
      className="fixed inset-0 z-[110] bg-black/95 flex flex-col"
      onClick={(e) => { if (e.target === e.currentTarget) onClose?.() }}
    >
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800 gap-3">
        <div className="min-w-0 flex items-center gap-2">
          <p className="text-sm text-slate-200 truncate">{video.title}</p>
          {isLive && (
            <span className="shrink-0 px-1.5 py-0.5 rounded bg-red-600 text-[10px] text-white font-bold flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" /> LIVE
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {isLive && (
            <button
              onClick={() => setShowChat((s) => !s)}
              className="px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-xs text-slate-300 flex items-center gap-1.5"
            >
              <i className={`ti ${showChat ? 'ti-message-off' : 'ti-message-circle'} text-sm`} />
              <span className="lg:hidden">{showChat ? 'Video' : 'Live Chat'}</span>
              <span className="hidden lg:inline">{showChat ? 'Chat band karo' : 'Chat dikhao'}</span>
            </button>
          )}
          <button onClick={onClose} className="text-slate-400 hover:text-white shrink-0 w-9 h-9 rounded-lg hover:bg-slate-800 flex items-center justify-center">
            <i className="ti ti-x text-2xl" />
          </button>
        </div>
      </div>
      {video.channelTitle && <p className="px-4 pt-2 text-xs text-slate-500 truncate lg:hidden">{video.channelTitle}</p>}

      <div className="flex-1 flex flex-col lg:flex-row items-stretch justify-center gap-0 lg:gap-4 p-2 sm:p-4 lg:p-6 min-h-0">
        {/* Player — hidden on mobile while chat is showing (no room for both); on
            desktop it's hidden only if chat has been expanded to take over. */}
        <div className={`flex-1 flex items-center justify-center min-h-0 ${showChat ? 'hidden lg:flex' : 'flex'}`}>
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

        {isLive && showChat && (
          <div className="w-full lg:w-[340px] shrink-0 flex flex-col min-h-0">
            <div className="flex items-center justify-between px-1 pb-2">
              <span className="flex items-center gap-1.5 text-xs text-slate-400">
                <i className="ti ti-message-circle text-orange-400" /> Live Chat
              </span>
              <button onClick={() => setShowChat(false)} className="text-slate-500 hover:text-white w-6 h-6 rounded-md hover:bg-slate-800 flex items-center justify-center">
                <i className="ti ti-x text-sm" />
              </button>
            </div>
            <div className="flex-1 min-h-0 rounded-lg overflow-hidden border border-slate-800 bg-[#0f0f0f]">
              <iframe
                key={`chat-${video.videoId}`}
                src={chatSrc}
                title="Live chat"
                className="w-full h-full"
              />
            </div>
            <p className="text-[10px] text-slate-600 mt-1.5 px-1">
              Comment karne ke liye chat ke andar apne Google/YouTube account se sign in karo
            </p>
          </div>
        )}
      </div>
    </div>
  )
}