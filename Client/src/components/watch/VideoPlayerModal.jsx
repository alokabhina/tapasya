// src/components/watch/VideoPlayerModal.jsx
// Distraction-free embedded player: modestbranding + rel=0 (no random related
// videos), progress auto-saved every 15s in the background, and marked
// complete automatically when the video ends. No extra on-screen controls —
// just the title bar, the video with YouTube's own native controls, and close.

import { useEffect, useRef, useState } from 'react'
import { updateWatchProgress, toggleWatchComplete } from '@/api/watch'
import { useAutoLandscapeFullscreen } from '@/hooks/useAutoLandscapeFullscreen'

const PROGRESS_SAVE_INTERVAL_MS = 15000

export default function VideoPlayerModal({ item, queue = [], onClose, onCompleted, onPlayNext }) {
  const containerRef = useRef(null)
  const playerRef = useRef(null)
  const lastSavedRef = useRef(0)
  const intervalRef = useRef(null)
  const [ready, setReady] = useState(false)

  useAutoLandscapeFullscreen()

  useEffect(() => {
    if (!item) return
    setReady(false)
    lastSavedRef.current = 0

    function createPlayer() {
      playerRef.current = new window.YT.Player(containerRef.current, {
        videoId: item.youtubeId,
        playerVars: {
          modestbranding: 1,
          rel: 0,           // limits related videos to same channel — no random suggestions
          fs: 1,
          playsinline: 1,
        },
        events: {
          onReady: () => setReady(true),
          onStateChange: (e) => {
            if (e.data === window.YT.PlayerState.PLAYING) {
              intervalRef.current = setInterval(saveProgress, PROGRESS_SAVE_INTERVAL_MS)
            } else {
              clearInterval(intervalRef.current)
            }
            if (e.data === window.YT.PlayerState.ENDED) {
              handleComplete()
            }
          },
        },
      })
    }

    if (window.YT && window.YT.Player) {
      createPlayer()
    } else {
      const tag = document.createElement('script')
      tag.src = 'https://www.youtube.com/iframe_api'
      document.body.appendChild(tag)
      window.onYouTubeIframeAPIReady = createPlayer
    }

    return () => {
      clearInterval(intervalRef.current)
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
    const currentTime = Math.floor(playerRef.current.getCurrentTime())
    const delta = Math.max(0, currentTime - lastSavedRef.current)
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

  if (!item) return null

  const currentIndex = queue.findIndex((q) => q._id === item._id)
  const next = currentIndex >= 0 ? queue[currentIndex + 1] : null

  return (
    <div className="fixed inset-0 z-[110] bg-black/95 flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800 gap-3">
        <div className="min-w-0">
          <p className="text-sm text-slate-200 truncate">{item.title}</p>
          {item.channelTitle && <p className="text-xs text-slate-500 truncate">{item.channelTitle}</p>}
        </div>
        <button onClick={onClose} className="text-slate-400 hover:text-white shrink-0 w-9 h-9 rounded-lg hover:bg-slate-800 flex items-center justify-center">
          <i className="ti ti-x text-2xl" />
        </button>
      </div>

      <div className="flex-1 flex items-center justify-center p-2 sm:p-6 min-h-0">
        <div className="w-full max-w-4xl aspect-video bg-black relative">
          <div ref={containerRef} className="w-full h-full" />
          {!ready && (
            <div className="absolute inset-0 flex items-center justify-center bg-slate-900">
              <div className="w-8 h-8 rounded-full border-2 border-orange-500 border-t-transparent animate-spin" />
            </div>
          )}
        </div>
      </div>

      {next && (
        <div className="flex items-center justify-center px-4 py-3 border-t border-slate-800">
          <button
            onClick={() => onPlayNext(next)}
            className="px-4 py-2 rounded-lg bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium flex items-center gap-1.5"
          >
            Next in list <i className="ti ti-player-track-next" />
          </button>
        </div>
      )}
    </div>
  )
}