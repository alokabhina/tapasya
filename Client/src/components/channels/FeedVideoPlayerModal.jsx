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
  const [chatExpanded, setChatExpanded] = useState(false) // desktop: chat takes over most of the width — YouTube's chat embed switches to a cramped avatar-only view below a certain width, so giving it more room is a real fix, not just cosmetic

  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') onClose?.() }
    if (video) document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [video, onClose])

  useEffect(() => { setShowChat(true); setChatLoaded(false); setChatStuck(false); setChatExpanded(false) }, [video?.videoId]) // reset per video

  useEffect(() => {
    if (!video?.isLive || chatLoaded) return undefined
    const t = setTimeout(() => setChatStuck(true), 5000)
    return () => clearTimeout(t)
  }, [video?.videoId, video?.isLive, chatLoaded])

  if (!video) return null

  const src = `https://www.youtube.com/embed/${video.videoId}?autoplay=1&modestbranding=1&rel=0`
  const chatSrc = `https://www.youtube.com/live_chat?v=${video.videoId}&embed_domain=${window.location.hostname}&dark_theme=1`
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
        {/* Player — hidden on mobile while chat is showing (no room for both);
            on desktop it's hidden only if chat has been expanded to take over. */}
        <div className={`flex-1 flex items-center justify-center min-h-0 ${showChat ? 'hidden lg:flex' : 'flex'} ${chatExpanded ? 'lg:hidden' : ''}`}>
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
          <div className={`w-full shrink-0 flex flex-col min-h-0 transition-all ${chatExpanded ? 'lg:w-full lg:max-w-2xl' : 'lg:w-[400px]'}`}>
            <div className="flex items-center justify-between px-1 pb-2 gap-2">
              <span className="flex items-center gap-1.5 text-xs text-slate-400 min-w-0">
                <i className="ti ti-message-circle text-orange-400 shrink-0" /> Live Chat
              </span>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => setChatExpanded((s) => !s)}
                  className="hidden lg:flex text-slate-500 hover:text-white w-6 h-6 rounded-md hover:bg-slate-800 items-center justify-center"
                  title={chatExpanded ? 'Chat chota karo' : 'Chat bada karo'}
                >
                  <i className={`ti ${chatExpanded ? 'ti-arrows-minimize' : 'ti-arrows-maximize'} text-sm`} />
                </button>
                <button onClick={() => setShowChat(false)} className="text-slate-500 hover:text-white w-6 h-6 rounded-md hover:bg-slate-800 flex items-center justify-center">
                  <i className="ti ti-x text-sm" />
                </button>
              </div>
            </div>

            {/* Requesting YouTube's own dark chat theme above (dark_theme=1)
                so the panel matches this app's dark UI. If the surrounding
                OS/browser has a "force dark mode for web content" feature
                enabled (common on Edge/Chrome, sometimes via extensions like
                Dark Reader), it can double-recolor this cross-origin iframe
                and produce mismatched text/background colours (e.g. white
                text on a white background) — that's a browser-level effect
                on YouTube's own page, which this app has no way to reach
                into and override. The help text below calls that out. */}
            <div className="relative flex-1 min-h-[360px] rounded-lg overflow-hidden border border-slate-800 bg-slate-900">
              {!chatLoaded && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-slate-900">
                  <div className="w-6 h-6 rounded-full border-2 border-slate-700 border-t-orange-500 animate-spin" />
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

            <div className="mt-2 space-y-2">
              <a
                href={chatDirectUrl}
                target="_blank"
                rel="noreferrer"
                className="w-full py-2 rounded-lg bg-slate-800 border border-slate-700 text-xs text-slate-200 flex items-center justify-center gap-1.5 hover:border-slate-600"
              >
                <i className="ti ti-external-link text-sm" /> Chat YouTube pe poori tarah kholo
              </a>
              <p className="text-[10px] text-slate-600 px-1">
                Comment karne ke liye chat ke andar apne Google/YouTube account se sign in karo
              </p>
              {chatStuck && (
                <div className="text-[10px] text-amber-500/80 px-1 leading-relaxed space-y-1.5">
                  <p>
                    Agar text hi nahi dikh raha (jaise white background pe white text) — ye YouTube ke chat iframe ka apna rendering hai, jise ye app control nahi kar sakta. Iski sabse aam wajah browser ka "poore web content ko dark bana do" wala forced-dark-mode feature hota hai, jo YouTube ke chat ko bhi apne rang se overwrite kar deta hai aur text/background ka contrast bigad jaata hai.
                  </p>
                  <p>
                    Fix: Edge/Chrome mein — <span className="text-slate-400">Settings → Appearance → "Enhance the appearance of web content"</span> ko is site ke liye off karo (ya page pe right-click karke "Use dark mode for this site" band karo). Fir bhi na dikhe to "Chat YouTube pe poori tarah kholo" use karo — wahan hamesha sahi rangon mein dikhega.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}