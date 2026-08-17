// src/components/shorts/ShortsFeed.jsx
// Curated motivation/education-only Shorts feed (see server routes/channels.js
// for the query curation — nothing random or entertainment-y gets in).
//
// Behaviour:
// - Mobile (<768px): full-screen, one Short per screen, vertical scroll-snap
//   swipe like reels. Only the visible slide gets a live player (created via
//   IntersectionObserver), everything else is just a thumbnail.
// - Desktop (>=768px): a single 16:9 player + a thumbnail rail to jump around.
// - Both: when the current Short ends, it auto-advances to the next one —
//   and loops back to the first after the last, so it just keeps playing.
import { useEffect, useRef, useState, useCallback } from 'react'
import { getShorts } from '@/api/channels'

function loadYouTubeAPI() {
  return new Promise((resolve) => {
    if (window.YT && window.YT.Player) return resolve()
    const prev = window.onYouTubeIframeAPIReady
    window.onYouTubeIframeAPIReady = () => { prev?.(); resolve() }
    if (!document.querySelector('script[src*="iframe_api"]')) {
      const tag = document.createElement('script')
      tag.src = 'https://www.youtube.com/iframe_api'
      document.head.appendChild(tag)
    }
  })
}

export default function ShortsFeed({ onBack }) {
  const [shorts, setShorts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    getShorts()
      .then((list) => { if (!cancelled) { setShorts(list); setError(false) } })
      .catch(() => { if (!cancelled) setError(true) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-slate-500">
        <div className="w-8 h-8 rounded-full border-2 border-slate-700 border-t-orange-500 animate-spin mb-3" />
        <p className="text-sm">Motivation shorts la rahe hain...</p>
      </div>
    )
  }

  if (error || !shorts.length) {
    return (
      <div className="text-center py-16 text-slate-500">
        <div className="w-16 h-16 rounded-2xl bg-slate-800/60 border border-slate-700/60 flex items-center justify-center mx-auto mb-3">
          <i className="ti ti-mood-empty text-3xl" />
        </div>
        <p className="text-sm font-medium text-slate-400">Abhi koi Shorts nahi mile</p>
        <p className="text-xs text-slate-600 mt-1">Thodi der baad try karo</p>
      </div>
    )
  }

  return (
    <>
      <div className="md:hidden"><MobileReels shorts={shorts} onBack={onBack} /></div>
      <div className="hidden md:block"><DesktopShortsPlayer shorts={shorts} /></div>
    </>
  )
}

// ── Mobile: full-screen vertical swipe reels ──────────────────────────────
function MobileReels({ shorts, onBack }) {
  const scrollerRef = useRef(null)
  const slideRefs = useRef([])
  const [activeIndex, setActiveIndex] = useState(0)

  const goTo = useCallback((idx) => {
    const el = slideRefs.current[idx]
    el?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [])

  useEffect(() => {
    const scroller = scrollerRef.current
    if (!scroller) return
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && entry.intersectionRatio > 0.6) {
            const idx = Number(entry.target.dataset.index)
            setActiveIndex(idx)
          }
        })
      },
      { root: scroller, threshold: 0.6 }
    )
    slideRefs.current.forEach((el) => el && observer.observe(el))
    return () => observer.disconnect()
  }, [shorts.length])

  function handleEnded() {
    const next = (activeIndex + 1) % shorts.length // loop back to first after last
    goTo(next)
  }

  return (
    <div className="fixed inset-0 z-[60] bg-black">
      <button
        onClick={onBack}
        className="absolute top-3 left-3 z-[61] w-9 h-9 rounded-full bg-black/50 backdrop-blur flex items-center justify-center text-white"
      >
        <i className="ti ti-arrow-left text-lg" />
      </button>

      <div
        ref={scrollerRef}
        className="h-[100dvh] overflow-y-scroll snap-y snap-mandatory no-scrollbar"
        style={{ scrollSnapType: 'y mandatory' }}
      >
        {shorts.map((s, i) => (
          <div
            key={s.youtubeId}
            ref={(el) => (slideRefs.current[i] = el)}
            data-index={i}
            className="h-[100dvh] w-full snap-start relative flex items-center justify-center bg-black"
          >
            {activeIndex === i ? (
              <ShortPlayer video={s} onEnded={handleEnded} autoplay fill />
            ) : (
              <img src={s.thumbnail} alt="" className="w-full h-full object-cover opacity-70" />
            )}
            <div className="absolute bottom-0 left-0 right-0 p-4 pb-8 bg-gradient-to-t from-black/80 via-black/30 to-transparent pointer-events-none">
              <p className="text-white text-sm font-medium line-clamp-2">{s.title}</p>
              {s.channelTitle && <p className="text-white/60 text-xs mt-1">{s.channelTitle}</p>}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Desktop: 16:9 player + thumbnail rail, auto-advances & loops ─────────
function DesktopShortsPlayer({ shorts }) {
  const [index, setIndex] = useState(0)
  const current = shorts[index]

  function handleEnded() {
    setIndex((i) => (i + 1) % shorts.length) // loop back to first after last
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-4">
      {/* Player takes whatever space its 9:16 short naturally needs — capped
          to a sensible max height so it doesn't dominate a wide desktop screen. */}
      <div className="flex justify-center">
        <div className="w-full max-w-[380px] aspect-[9/16] rounded-2xl overflow-hidden bg-slate-900 border border-slate-800 relative">
          <ShortPlayer key={current.youtubeId} video={current} onEnded={handleEnded} autoplay fill />
        </div>
      </div>

      <div className="max-h-[600px] overflow-y-auto space-y-2 pr-1">
        {shorts.map((s, i) => (
          <button
            key={s.youtubeId}
            onClick={() => setIndex(i)}
            className={`w-full flex items-center gap-2 p-1.5 rounded-xl border transition-colors text-left ${
              i === index ? 'bg-orange-500/10 border-orange-500/40' : 'bg-slate-800/40 border-slate-800 hover:border-slate-700'
            }`}
          >
            <div className="w-12 h-16 rounded-lg overflow-hidden bg-slate-900 shrink-0">
              <img src={s.thumbnail} alt="" className="w-full h-full object-cover" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-slate-200 line-clamp-2 leading-snug">{s.title}</p>
              {s.channelTitle && <p className="text-[11px] text-slate-500 truncate mt-0.5">{s.channelTitle}</p>}
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}

// ── Shared player: mounts a real YT.Player, autoplays muted (browser
// requirement), tap anywhere to unmute, fires onEnded to advance/loop ──────
function ShortPlayer({ video, onEnded, fill }) {
  const containerRef = useRef(null)
  const playerRef = useRef(null)
  const [muted, setMuted] = useState(true)

  useEffect(() => {
    let cancelled = false
    loadYouTubeAPI().then(() => {
      if (cancelled || !containerRef.current) return
      playerRef.current = new window.YT.Player(containerRef.current, {
        videoId: video.youtubeId,
        playerVars: { autoplay: 1, mute: 1, playsinline: 1, controls: 1, rel: 0, modestbranding: 1 },
        events: {
          onStateChange: (e) => {
            if (e.data === window.YT.PlayerState.ENDED) onEnded?.()
          },
        },
      })
    })
    return () => {
      cancelled = true
      try { playerRef.current?.destroy?.() } catch { /* ignore */ }
    }
  }, [video.youtubeId]) // eslint-disable-line react-hooks/exhaustive-deps

  function toggleMute() {
    const p = playerRef.current
    if (!p) return
    if (muted) { p.unMute(); p.setVolume(100); setMuted(false) }
    else { p.mute(); setMuted(true) }
  }

  return (
    <div className={fill ? 'absolute inset-0' : 'relative w-full aspect-[9/16]'}>
      <div ref={containerRef} className="w-full h-full" />
      <button
        onClick={toggleMute}
        className="absolute top-3 right-3 z-10 w-8 h-8 rounded-full bg-black/50 backdrop-blur flex items-center justify-center text-white"
      >
        <i className={`ti ${muted ? 'ti-volume-3' : 'ti-volume'} text-sm`} />
      </button>
    </div>
  )
}