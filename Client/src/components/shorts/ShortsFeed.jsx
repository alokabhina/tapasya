// src/components/shorts/ShortsFeed.jsx
// Curated motivation/education-only Shorts feed (see server routes/channels.js
// for the query curation — nothing random or entertainment-y gets in).
//
// Behaviour:
// - Mobile (<768px): full-screen, one Short per screen, vertical scroll-snap
//   swipe like reels. Only the visible slide gets a live player (created via
//   IntersectionObserver), everything else is just a thumbnail.
// - Desktop (>=768px): a single 9:16 player, sized like a real Shorts reel
//   (not the whole page), with a manual "next" arrow beside it.
// - Both: when the current Short ends, it auto-advances — and loops within
//   the current 10-video batch. Once the whole batch has been watched
//   through, the NEXT batch of 10 only becomes available after a 2-hour
//   cooldown (enforced server-side, not just a frontend delay).
// - Every 5th Short, a motivational "get back to studying" interstitial
//   pops up and pauses playback until dismissed.
import { useEffect, useRef, useState, useCallback } from 'react'
import { getShorts, getShortsUsage, incrementShortsUsage } from '@/api/channels'

const DAILY_LIMIT = 40
const MOTIVATION_EVERY = 5

const MOTIVATION_MESSAGES = [
  'Bas thodi der aur — ab wapas padhai pe chalte hain, tum kar loge! 💪',
  '5 Shorts ho gaye. Ek chhota sa break tha, ab focus wapas kitaab pe 📚',
  'Motivation mil gaya na? Ab usse action mein badlo — padhai shuru karo!',
  'Thoda scroll ho gaya, ab thoda syllabus bhi ho jaaye. Tum kar loge!',
  'Break achha tha. Ab 25 minute ka focused study session laga do 🔥',
]

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

// Module-level so it survives every player being torn down/recreated —
// currently-playing player, used by the motivation popup to pause/resume.
let activePlayer = null
// Also module-level: once unmuted this session, stay unmuted for every
// Short after that instead of resetting to muted each time.
let sessionMuted = true

export default function ShortsFeed({ onBack }) {
  const [shorts, setShorts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [usage, setUsage] = useState({ count: 0, limit: DAILY_LIMIT })
  const [blocked, setBlocked] = useState(false)
  const [cooldownUntil, setCooldownUntil] = useState(null)
  const [showMotivation, setShowMotivation] = useState(false)
  const viewsSinceBreakRef = useRef(0)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    Promise.all([getShortsUsage().catch(() => null), getShorts()])
      .then(([u, list]) => {
        if (cancelled) return
        if (u) setUsage(u)
        setShorts(list)
        setError(false)
      })
      .catch((err) => {
        if (cancelled) return
        const data = err.response?.data
        if (err.response?.status === 429 && data) {
          setUsage((p) => ({ ...p, count: data.count ?? p.count, limit: data.limit ?? p.limit }))
          if (data.limitReached) setBlocked(true)
          else if (data.batchOnCooldown) setCooldownUntil(data.nextBatchAt)
        } else {
          setError(true)
        }
      })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  // Called whenever a NEW Short starts playing. Handles the daily cap AND
  // the every-5th motivational break. Returns whether it's allowed to play.
  const registerView = useCallback(async () => {
    const res = await incrementShortsUsage()
    setUsage({ count: res.count, limit: res.limit })
    if (res.limitReached) { setBlocked(true); return false }

    viewsSinceBreakRef.current += 1
    if (viewsSinceBreakRef.current >= MOTIVATION_EVERY) {
      viewsSinceBreakRef.current = 0
      setShowMotivation(true)
      activePlayer?.pauseVideo?.()
    }
    return true
  }, [])

  // Called by mobile/desktop once the current 10-video batch has been
  // fully cycled through. Tries to fetch the next batch — the server
  // enforces the 2-hour cooldown, we just relay whatever it decides.
  const loadNextBatch = useCallback(async () => {
    try {
      const list = await getShorts()
      setShorts(list)
      return 'ok'
    } catch (err) {
      const data = err.response?.data
      if (err.response?.status === 429 && data) {
        setUsage((p) => ({ ...p, count: data.count ?? p.count }))
        if (data.limitReached) { setBlocked(true); return 'limit' }
        if (data.batchOnCooldown) { setCooldownUntil(data.nextBatchAt); return 'cooldown' }
      }
      return 'error'
    }
  }, [])

  function dismissMotivation() {
    setShowMotivation(false)
    activePlayer?.playVideo?.()
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-slate-500">
        <div className="w-8 h-8 rounded-full border-2 border-slate-700 border-t-orange-500 animate-spin mb-3" />
        <p className="text-sm">Motivation shorts la rahe hain...</p>
      </div>
    )
  }

  if (blocked) {
    return <LimitReachedScreen count={usage.count} limit={usage.limit} onBack={onBack} />
  }

  if (cooldownUntil) {
    return <BatchCooldownScreen nextBatchAt={cooldownUntil} onBack={onBack} onReady={() => setCooldownUntil(null)} />
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
      <div className="md:hidden">
        <MobileReels shorts={shorts} onBack={onBack} usage={usage} registerView={registerView} loadNextBatch={loadNextBatch} />
      </div>
      <div className="hidden md:block">
        <DesktopShortsPlayer shorts={shorts} usage={usage} registerView={registerView} loadNextBatch={loadNextBatch} />
      </div>
      {showMotivation && <MotivationPopup onContinue={dismissMotivation} onStudy={onBack} />}
    </>
  )
}

// Interstitial shown every 5th Short — a deliberate nudge back to studying.
function MotivationPopup({ onContinue, onStudy }) {
  const [message] = useState(() => MOTIVATION_MESSAGES[Math.floor(Math.random() * MOTIVATION_MESSAGES.length)])
  return (
    <div className="fixed inset-0 z-[70] bg-black/80 backdrop-blur-sm flex items-center justify-center p-6">
      <div className="w-full max-w-sm bg-slate-900 border border-orange-500/30 rounded-2xl p-6 text-center animate-fade-in-up">
        <div className="w-14 h-14 rounded-2xl bg-orange-500/15 border border-orange-500/20 flex items-center justify-center mx-auto mb-4">
          <i className="ti ti-bulb text-2xl text-orange-400" />
        </div>
        <p className="text-sm text-slate-200 leading-relaxed mb-5">{message}</p>
        <div className="flex flex-col gap-2">
          <button onClick={onStudy} className="py-2.5 rounded-lg bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold">
            Padhai shuru karta hoon
          </button>
          <button onClick={onContinue} className="py-2.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-400 text-sm">
            2 min aur dekhta hoon
          </button>
        </div>
      </div>
    </div>
  )
}

// Full-block screen shown once today's cap is used up.
function LimitReachedScreen({ count, limit, onBack }) {
  return (
    <div className="text-center py-16 px-6">
      <div className="w-16 h-16 rounded-2xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center mx-auto mb-4">
        <i className="ti ti-hourglass-high text-3xl text-orange-400" />
      </div>
      <p className="text-sm font-semibold text-slate-200 mb-1">Aaj ke {limit} Shorts dekh liye ({count}/{limit})</p>
      <p className="text-xs text-slate-500 max-w-xs mx-auto">
        Kal phir se dekh sakte ho — abhi padhai pe wapas chalte hain 📚
      </p>
      {onBack && (
        <button onClick={onBack} className="mt-4 px-4 py-2 rounded-lg bg-slate-800 border border-slate-700 text-xs text-slate-300">
          Watchlist pe wapas jao
        </button>
      )}
    </div>
  )
}

// Shown once a batch of 10 is fully watched — live countdown to the next.
function BatchCooldownScreen({ nextBatchAt, onBack, onReady }) {
  const [remainingMs, setRemainingMs] = useState(() => new Date(nextBatchAt).getTime() - Date.now())

  useEffect(() => {
    const id = setInterval(() => {
      const ms = new Date(nextBatchAt).getTime() - Date.now()
      setRemainingMs(ms)
      if (ms <= 0) { clearInterval(id); onReady() }
    }, 1000)
    return () => clearInterval(id)
  }, [nextBatchAt, onReady])

  const totalSec = Math.max(0, Math.floor(remainingMs / 1000))
  const h = Math.floor(totalSec / 3600)
  const m = Math.floor((totalSec % 3600) / 60)
  const s = totalSec % 60

  return (
    <div className="text-center py-16 px-6">
      <div className="w-16 h-16 rounded-2xl bg-slate-800/60 border border-slate-700/60 flex items-center justify-center mx-auto mb-4">
        <i className="ti ti-clock-hour-4 text-3xl text-orange-400" />
      </div>
      <p className="text-sm font-semibold text-slate-200 mb-1">10 Shorts dekh liye — agla batch thodi der mein</p>
      <p className="text-2xl font-bold text-orange-400 tabular-nums my-3">
        {String(h).padStart(2, '0')}:{String(m).padStart(2, '0')}:{String(s).padStart(2, '0')}
      </p>
      <p className="text-xs text-slate-500 max-w-xs mx-auto">
        Tab tak padhai pe focus karo — agla batch apne aap yahin aa jayega
      </p>
      {onBack && (
        <button onClick={onBack} className="mt-4 px-4 py-2 rounded-lg bg-slate-800 border border-slate-700 text-xs text-slate-300">
          Watchlist pe wapas jao
        </button>
      )}
    </div>
  )
}

// ── Mobile: full-screen vertical swipe reels ──────────────────────────────
function MobileReels({ shorts, onBack, usage, registerView, loadNextBatch }) {
  const scrollerRef = useRef(null)
  const slideRefs = useRef([])
  const registeredRef = useRef(new Set()) // indices already counted, avoid double-count
  const [activeIndex, setActiveIndex] = useState(0)
  const [count, setCount] = useState(usage.count)
  const [canPlay, setCanPlay] = useState(true)
  const [advancing, setAdvancing] = useState(false)

  // New batch arrived (different array reference) — snap back to the top.
  useEffect(() => {
    setActiveIndex(0)
    registeredRef.current.clear()
    scrollerRef.current?.scrollTo({ top: 0, behavior: 'auto' })
  }, [shorts])

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

  // Count this Short as "watched" the moment it becomes the active slide.
  useEffect(() => {
    if (registeredRef.current.has(activeIndex)) return
    registeredRef.current.add(activeIndex)
    registerView().then((allowed) => {
      setCount((c) => c + 1)
      if (!allowed) setCanPlay(false)
    })
  }, [activeIndex, registerView])

  async function handleEnded() {
    if (!canPlay || advancing) return
    if (activeIndex >= shorts.length - 1) {
      // End of this batch — try for the next one (server enforces cooldown).
      setAdvancing(true)
      await loadNextBatch()
      setAdvancing(false)
      return // if a new batch arrived, the effect above resets to slide 0
    }
    slideRefs.current[activeIndex + 1]?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <div className="fixed inset-0 z-[60] bg-black">
      <button
        onClick={onBack}
        className="absolute top-3 left-3 z-[61] w-9 h-9 rounded-full bg-black/50 backdrop-blur flex items-center justify-center text-white"
      >
        <i className="ti ti-arrow-left text-lg" />
      </button>
      <div className="absolute top-3 right-3 z-[61] px-2.5 py-1.5 rounded-full bg-black/50 backdrop-blur text-white text-[11px] font-medium tabular-nums">
        {count}/{usage.limit} dekhe
      </div>

      <div
        ref={scrollerRef}
        className="h-[100dvh] overflow-y-scroll snap-y snap-mandatory no-scrollbar"
        style={{ scrollSnapType: 'y mandatory', scrollBehavior: 'smooth' }}
      >
        {shorts.map((s, i) => (
          <div
            key={s.youtubeId}
            ref={(el) => (slideRefs.current[i] = el)}
            data-index={i}
            className="h-[100dvh] w-full snap-start relative flex items-center justify-center bg-black"
          >
            {activeIndex === i && canPlay ? (
              <ShortPlayer video={s} onEnded={handleEnded} fill />
            ) : (
              <img src={s.thumbnail} alt="" className="w-full h-full object-cover opacity-70" />
            )}
            <div className="absolute bottom-0 left-0 right-0 p-4 pb-8 bg-gradient-to-t from-black/80 via-black/30 to-transparent pointer-events-none">
              <p className="text-white text-sm font-medium line-clamp-2">{s.title}</p>
              {s.channelTitle && <p className="text-white/60 text-xs mt-1">{s.channelTitle}</p>}
            </div>
            {activeIndex === i && (
              <button
                onClick={handleEnded}
                title="Next"
                className="absolute right-3 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-black/50 backdrop-blur flex items-center justify-center text-white animate-bounce"
              >
                <i className="ti ti-chevron-down text-xl" />
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Desktop: single reel-sized player, auto-advances within the batch ────
function DesktopShortsPlayer({ shorts, usage, registerView, loadNextBatch }) {
  const [index, setIndex] = useState(0)
  const registeredRef = useRef(new Set())
  const [count, setCount] = useState(usage.count)
  const [canPlay, setCanPlay] = useState(true)
  const [advancing, setAdvancing] = useState(false)
  const current = shorts[index]

  // New batch arrived — start from the top of it.
  useEffect(() => {
    setIndex(0)
    registeredRef.current.clear()
  }, [shorts])

  useEffect(() => {
    if (registeredRef.current.has(index)) return
    registeredRef.current.add(index)
    registerView().then((allowed) => {
      setCount((c) => c + 1)
      if (!allowed) setCanPlay(false)
    })
  }, [index, registerView])

  async function handleEnded() {
    if (!canPlay || advancing) return
    if (index >= shorts.length - 1) {
      setAdvancing(true)
      await loadNextBatch()
      setAdvancing(false)
      return
    }
    setIndex((i) => i + 1)
  }

  return (
    <div className="flex items-center justify-center gap-3">
      <div className="flex flex-col items-center">
        <div className="w-full max-w-[300px] flex items-center justify-end mb-2">
          <span className="px-2.5 py-1 rounded-full bg-slate-800/70 border border-slate-700 text-[11px] text-slate-400 tabular-nums">
            {count}/{usage.limit} dekhe
          </span>
        </div>

        {/* Single reel-sized player — no "up next" list, feels like a
            random auto-feed rather than a pre-spoiled queue. Re-keyed per
            video so the slide-up transition retriggers on every change. */}
        <div key={current.youtubeId} className="w-full max-w-[300px] aspect-[9/16] rounded-2xl overflow-hidden bg-slate-900 border border-slate-800 relative animate-fade-in-up">
          {canPlay ? (
            <ShortPlayer video={current} onEnded={handleEnded} fill />
          ) : (
            <img src={current.thumbnail} alt="" className="w-full h-full object-cover opacity-60" />
          )}
        </div>

        <div className="w-full max-w-[300px] mt-2 text-center">
          <p className="text-xs text-slate-300 line-clamp-2">{current.title}</p>
          {current.channelTitle && <p className="text-[11px] text-slate-500 mt-0.5">{current.channelTitle}</p>}
        </div>
      </div>

      {/* "Next" sits beside the player, vertically centered — not
          overlapping the video itself. */}
      <button
        onClick={handleEnded}
        title="Next"
        className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 hover:border-orange-500/50 flex items-center justify-center text-slate-300 hover:text-orange-400 transition-colors shrink-0"
      >
        <i className="ti ti-chevron-down text-lg" />
      </button>
    </div>
  )
}

// ── Shared player: mounts a real YT.Player, autoplays muted (browser
// requirement), tap anywhere to unmute — stays unmuted for later Shorts
// too, once toggled. Fires onEnded to advance/loop. ──────────────────────
function ShortPlayer({ video, onEnded, fill }) {
  const containerRef = useRef(null)
  const playerRef = useRef(null)
  const [muted, setMuted] = useState(sessionMuted)

  useEffect(() => {
    let cancelled = false
    loadYouTubeAPI().then(() => {
      if (cancelled || !containerRef.current) return
      playerRef.current = new window.YT.Player(containerRef.current, {
        videoId: video.youtubeId,
        playerVars: {
          autoplay: 1,
          // Request the ACTUAL desired mute state up front, not always
          // muted-then-unmuted-after — far more reliable with browser
          // autoplay policy once the user has unmuted once this session.
          mute: sessionMuted ? 1 : 0,
          playsinline: 1,
          controls: 0, // hide YouTube's own overlapping mute/CC icons — ours is the only control
          rel: 0,
          modestbranding: 1,
        },
        events: {
          onReady: (e) => {
            if (!sessionMuted) { e.target.unMute(); e.target.setVolume(100) }
            setMuted(sessionMuted)
            activePlayer = e.target // for the motivation-popup pause/resume
          },
          onStateChange: (e) => {
            if (e.data === window.YT.PlayerState.ENDED) onEnded?.()
            if (e.data === window.YT.PlayerState.PLAYING && !sessionMuted && e.target.isMuted?.()) {
              e.target.unMute(); e.target.setVolume(100)
            }
          },
        },
      })
    })
    return () => {
      cancelled = true
      if (activePlayer === playerRef.current) activePlayer = null
      try { playerRef.current?.destroy?.() } catch { /* ignore */ }
    }
  }, [video.youtubeId]) // eslint-disable-line react-hooks/exhaustive-deps

  function toggleMute() {
    const p = playerRef.current
    if (!p) return
    const next = !muted
    if (next === false) { p.unMute(); p.setVolume(100) } else { p.mute() }
    sessionMuted = next // remember for every Short that plays after this one
    setMuted(next)
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