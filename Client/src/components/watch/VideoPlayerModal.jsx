// src/components/watch/VideoPlayerModal.jsx
// Distraction-free embedded player: modestbranding + rel=0 (no random related
// videos), progress auto-saved every 15s in the background, and marked
// complete automatically when the video ends. No extra on-screen controls —
// just the title bar, the video with YouTube's own native controls, and close.

import { useEffect, useRef, useState } from 'react'
import { updateWatchProgress, toggleWatchComplete } from '@/api/watch'
import { useAutoLandscapeFullscreen } from '@/hooks/useAutoLandscapeFullscreen'
import { useTimerStore } from '@/store/timerStore'
import useSubjectStore from '@/store/subjectStore'
import useWatchPlayerStore from '@/store/watchPlayerStore'
import StartTimerPrompt from './StartTimerPrompt'

const PROGRESS_SAVE_INTERVAL_MS = 15000
const TIMER_PROMPT_AFTER_SECONDS = 30 // of actual PLAYING time, not just "video open"

export default function VideoPlayerModal({ item, queue = [], minimized = false, onClose, onCompleted, onPlayNext, onMinimize, onExpand }) {
  const containerRef = useRef(null)
  const playerRef = useRef(null)
  const lastSavedRef = useRef(0)
  const lastSaveWallClockRef = useRef(Date.now()) // real-world clock, to clamp deltaSeconds
  const intervalRef = useRef(null)
  const [ready, setReady] = useState(false)

  // ── Nudge to start the study timer after 30s of actually watching ────────
  const playingTicksRef = useRef(null)     // setInterval handle, only runs while state === PLAYING
  const playedSecondsRef = useRef(0)       // cumulative PLAYING time for this video, resets per item
  const [showTimerPrompt, setShowTimerPrompt] = useState(false)
  const promptDecidedRef = useRef(false)   // user already picked a subject or hit Skip for this video
  const subjects = useSubjectStore((s) => s.subjects)

  // Auto-landscape-fullscreen only makes sense for the full player, not
  // while it's a small floating corner box.
  useAutoLandscapeFullscreen()

  useEffect(() => {
    if (!item) return
    setReady(false)
    // Fresh 30s countdown + prompt state for every new video.
    playedSecondsRef.current = 0
    promptDecidedRef.current = false
    setShowTimerPrompt(false)
    // Resume from where the user left off — but only for a video that
    // isn't already marked complete (a finished video should replay from
    // the start). Back up a couple seconds so we don't drop the last bit
    // of context the user actually saw.
    const resumeAt = (!item.completed && item.watchedSeconds > 5)
      ? Math.max(0, Math.floor(item.watchedSeconds) - 2)
      : 0
    lastSavedRef.current = resumeAt
    lastSaveWallClockRef.current = Date.now()

    function createPlayer() {
      playerRef.current = new window.YT.Player(containerRef.current, {
        videoId: item.youtubeId,
        playerVars: {
          modestbranding: 1,
          rel: 0,           // limits related videos to same channel — no random suggestions
          fs: 1,
          playsinline: 1,
          start: resumeAt,
        },
        events: {
          onReady: () => setReady(true),
          onStateChange: (e) => {
            clearInterval(intervalRef.current) // avoid stacking intervals on repeated play events
            clearInterval(playingTicksRef.current)
            if (e.data === window.YT.PlayerState.PLAYING) {
              intervalRef.current = setInterval(saveProgress, PROGRESS_SAVE_INTERVAL_MS)
              // Only counts while genuinely PLAYING — pausing or buffering
              // stops this tick, so "30s" means 30s actually watched, not
              // 30s since the modal opened.
              playingTicksRef.current = setInterval(() => {
                if (promptDecidedRef.current || useTimerStore.getState().isRunning) {
                  clearInterval(playingTicksRef.current)
                  return
                }
                playedSecondsRef.current += 1
                if (playedSecondsRef.current >= TIMER_PROMPT_AFTER_SECONDS) {
                  clearInterval(playingTicksRef.current)
                  setShowTimerPrompt(true)
                }
              }, 1000)
            }
            if (e.data === window.YT.PlayerState.ENDED) {
              saveProgress() // capture the last few seconds before marking complete
              handleComplete()
            }
          },
        },
      })
    }

    if (window.YT && window.YT.Player) {
      createPlayer()
    } else {
      const prevReady = window.onYouTubeIframeAPIReady
      window.onYouTubeIframeAPIReady = () => { prevReady?.(); createPlayer() }
      if (!document.querySelector('script[src*="iframe_api"]')) {
        const tag = document.createElement('script')
        tag.src = 'https://www.youtube.com/iframe_api'
        document.body.appendChild(tag)
      }
    }

    return () => {
      clearInterval(intervalRef.current)
      clearInterval(playingTicksRef.current)
      saveProgress()
      playerRef.current?.destroy?.()
      playerRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item?._id])

  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') onClose?.() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  function saveProgress() {
    if (!playerRef.current?.getCurrentTime) return

    const now = Date.now()
    const wallClockElapsed = (now - lastSaveWallClockRef.current) / 1000
    lastSaveWallClockRef.current = now

    const currentTime = Math.floor(playerRef.current.getCurrentTime())
    let delta = Math.max(0, currentTime - lastSavedRef.current)
    // Hard safety cap: we can never have genuinely watched more seconds
    // than have actually elapsed in real time since the last save. This
    // catches any getCurrentTime() glitch (buffering, seeking, a stray
    // read right at video end) that would otherwise inflate watch stats
    // — e.g. reporting a full video's length after only a 2-minute open.
    delta = Math.min(delta, Math.ceil(wallClockElapsed) + 2)
    lastSavedRef.current = currentTime
    if (delta > 0) {
      updateWatchProgress(item._id, { watchedSeconds: currentTime, deltaSeconds: delta }).catch(() => {})
    }
  }

  async function handleComplete() {
    try {
      await toggleWatchComplete(item._id, true)
      onCompleted?.(item)
    } catch {}
  }

  function handleTimerPromptPick(subject) {
    useTimerStore.getState().start(subject)
    useWatchPlayerStore.getState().setTimerStartedForVideo(true) // so closing this video can offer to stop it too
    promptDecidedRef.current = true
    setShowTimerPrompt(false)
  }

  function handleTimerPromptSkip() {
    promptDecidedRef.current = true
    setShowTimerPrompt(false)
  }

  if (!item) return null

  const currentIndex = queue.findIndex((q) => q._id === item._id)
  const next = currentIndex >= 0 ? queue[currentIndex + 1] : null

  return (
    <div
      className={
        minimized
          ? 'fixed bottom-4 right-4 z-[110] w-64 sm:w-80 rounded-xl overflow-hidden shadow-2xl shadow-black/60 border border-slate-800 bg-black'
          : 'fixed inset-0 z-[110] bg-black/95 flex flex-col'
      }
    >
      <div className={minimized ? 'flex items-center justify-between px-2 py-1.5 bg-slate-900 gap-2' : 'flex items-center justify-between px-4 py-3 border-b border-slate-800 gap-3'}>
        <div className="min-w-0">
          <p className={minimized ? 'text-xs text-slate-300 truncate' : 'text-sm text-slate-200 truncate'}>{item.title}</p>
          {!minimized && item.channelTitle && <p className="text-xs text-slate-500 truncate">{item.channelTitle}</p>}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {minimized ? (
            <button onClick={onExpand} title="Expand" className="text-slate-400 hover:text-white w-7 h-7 rounded-md hover:bg-slate-800 flex items-center justify-center">
              <i className="ti ti-arrows-maximize text-base" />
            </button>
          ) : (
            <button onClick={onMinimize} title="Minimize — video chalta rahega" className="text-slate-400 hover:text-white w-9 h-9 rounded-lg hover:bg-slate-800 flex items-center justify-center">
              <i className="ti ti-minus text-2xl" />
            </button>
          )}
          <button onClick={onClose} title="Close" className={minimized ? 'text-slate-400 hover:text-white w-7 h-7 rounded-md hover:bg-slate-800 flex items-center justify-center' : 'text-slate-400 hover:text-white shrink-0 w-9 h-9 rounded-lg hover:bg-slate-800 flex items-center justify-center'}>
            <i className={minimized ? 'ti ti-x text-base' : 'ti ti-x text-2xl'} />
          </button>
        </div>
      </div>

      <div className={minimized ? 'w-full' : 'flex-1 flex items-center justify-center p-2 sm:p-6 min-h-0'}>
        <div className={minimized ? 'w-full aspect-video bg-black relative' : 'w-full max-w-4xl aspect-video bg-black relative'}>
          <div ref={containerRef} className="w-full h-full" />
          {!ready && (
            <div className="absolute inset-0 flex items-center justify-center bg-slate-900">
              <div className="w-8 h-8 rounded-full border-2 border-orange-500 border-t-transparent animate-spin" />
            </div>
          )}
        </div>
      </div>

      {!minimized && next && (
        <div className="flex items-center justify-center px-4 py-3 border-t border-slate-800">
          <button
            onClick={() => onPlayNext(next)}
            className="px-4 py-2 rounded-lg bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium flex items-center gap-1.5"
          >
            Next in list <i className="ti ti-player-track-next" />
          </button>
        </div>
      )}

      {showTimerPrompt && (
        <StartTimerPrompt
          subjects={subjects}
          minimized={minimized}
          onPick={handleTimerPromptPick}
          onSkip={handleTimerPromptSkip}
        />
      )}
    </div>
  )
}