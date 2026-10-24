// src/hooks/useReadTracker.js
// Reports how long a person actually spends reading a (global) PDF / pics item,
// so the admins can see who read what and for how long.
//
// Only ACTIVE time is counted: the tab must be visible AND there must have been
// some scroll / touch / mouse / key activity in the last few minutes — so a PDF
// left open overnight, or a phone locked with the reader still on screen, doesn't
// add up. Time is sent in small batches (every ~20s, plus once when the reader
// closes); if the network is down the unsent seconds just wait for the next try.
import { useEffect } from 'react'
import { pingPdfRead } from '@/api/pdfs'

const TICK_MS = 5000
const FLUSH_EVERY_TICKS = 4 // → every ~20s
const IDLE_MS = 3 * 60 * 1000 // no activity for 3 min → stop counting (people do read a dense page for a while)

export default function useReadTracker(docId, { kind = 'pdf', enabled = true } = {}) {
  useEffect(() => {
    if (!docId || !enabled) return undefined

    let accrued = 0
    let ticks = 0
    let lastActivity = Date.now()
    let inFlight = false

    const bump = () => { lastActivity = Date.now() }
    const events = ['pointerdown', 'pointermove', 'scroll', 'wheel', 'keydown', 'touchstart', 'touchmove']
    events.forEach((ev) => window.addEventListener(ev, bump, { passive: true, capture: true }))

    async function flush() {
      if (inFlight || accrued < 1) return
      const seconds = Math.min(Math.floor(accrued), 60) // the server caps one ping at 60s
      inFlight = true
      try {
        await pingPdfRead(docId, { seconds, kind })
        accrued -= seconds
      } catch {
        /* offline / server hiccup — keep the seconds, try again next flush */
      } finally {
        inFlight = false
      }
    }

    pingPdfRead(docId, { kind, start: true }).catch(() => {}) // counts one "open"

    const timer = setInterval(() => {
      if (document.visibilityState === 'visible' && Date.now() - lastActivity < IDLE_MS) {
        accrued += TICK_MS / 1000
      }
      ticks += 1
      if (ticks % FLUSH_EVERY_TICKS === 0) flush()
    }, TICK_MS)

    return () => {
      clearInterval(timer)
      events.forEach((ev) => window.removeEventListener(ev, bump, { capture: true }))
      // final batch when the reader is closed
      const seconds = Math.min(Math.floor(accrued), 60)
      if (seconds >= 1) pingPdfRead(docId, { seconds, kind }).catch(() => {})
    }
  }, [docId, kind, enabled])
}