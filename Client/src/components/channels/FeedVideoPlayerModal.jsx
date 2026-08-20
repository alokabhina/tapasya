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
//
// YouTube's chat iframe renders its OWN white-background UI — we can't
// theme it. The blank-white-panel-with-no-text symptom is almost always the
// embed getting silently blocked (Brave Shields, strict third-party-cookie
// browsers, ad blockers) rather than a real load error, and cross-origin JS
// can't detect that. So: style the panel to expect a white surface instead
// of clashing with it, show a loading state until the iframe actually fires
// `onLoad`, and always offer a "open on YouTube" link as a guaranteed
// working fallback if the embed stays blank.
import { useEffect, useState } from 'react'
import { useAutoLandscapeFullscreen } from '@/hooks/useAutoLandscapeFullscreen'

export default function FeedVideoPlayerModal({ video, onClose }) {
  useAutoLandscapeFullscreen()
  const [showChat, setShowChat] = useState(true) // mobile: toggle between video/chat
  const [chatLoaded, setChatLoaded] = useState(false)
  const [chatStuck, setChatStuck] = useState(false) // still blank after a while → likely blocked by the browser

  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') onClose?.() }
    if (video) document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [video, onClose])

  useEffect(() => { setShowChat(true); setChatLoaded(false); setChatStuck(false) }, [video?.videoId]) // reset per video

  useEffect(() => {
    if (!video?.isLive || chatLoaded) return undefined
    const t = setTimeout(() => setChatStuck(true), 5000)
    return () => clearTimeout(t)
  }, [video?.videoId, video?.isLive, chatLoaded])

  if (!video) return null

  const src = `https://www.youtube.com/embed/${video.videoId}?autoplay=1&modestbranding=1&rel=0`
  const chatSrc = `https://www.youtube.com/live_chat?v=${video.videoId}&embed_domain=${window.location.hostname}`
  const chatDirectUrl = `https://www.youtube.com/live_chat?v=${video.videoId}&is_popout=1`
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

            {/* YouTube's chat UI is white with dark text — the panel is
                built to match that instead of fighting it with a dark
                wrapper, and shows a loading shimmer until the iframe
                actually fires onLoad (a blocked/stuck embed just stays on
                this shimmer instead of turning into a mystery blank box). */}
            <div className="relative flex-1 min-h-0 rounded-lg overflow-hidden border border-slate-800 bg-white">
              {!chatLoaded && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-slate-100">
                  <div className="w-6 h-6 rounded-full border-2 border-slate-300 border-t-orange-500 animate-spin" />
                  <p className="text-[11px] text-slate-500">Chat load ho raha hai...</p>
                </div>
              )}
              <iframe
                key={`chat-${video.videoId}`}
                src={chatSrc}
                title="Live chat"
                className="w-full h-full"
                onLoad={() => setChatLoaded(true)}
              />
            </div>

            <div className="flex items-center justify-between gap-2 mt-1.5 px-1">
              <p className="text-[10px] text-slate-600">
                Comment karne ke liye chat ke andar apne Google/YouTube account se sign in karo
              </p>
              <a
                href={chatDirectUrl}
                target="_blank"
                rel="noreferrer"
                className="shrink-0 text-[10px] text-orange-400 hover:text-orange-300 flex items-center gap-0.5 whitespace-nowrap"
              >
                YouTube pe kholo <i className="ti ti-external-link text-[11px]" />
              </a>
            </div>
            {chatStuck && (
              <p className="text-[10px] text-amber-500/80 px-1 mt-1">
                Chat khaali dikh raha hai? Browser ki privacy/shield settings (Brave Shields, ad-blocker) is site ke liye off karke dekho, ya upar "YouTube pe kholo" use karo.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}