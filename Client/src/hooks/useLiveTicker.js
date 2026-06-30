// src/hooks/useLiveTicker.js
// FIX: group members ka liveElapsed sirf poll/heartbeat pe update hota tha
// (8-10s ke jumps mein) — ye hook har second locally +1 karta hai jab tak
// agla fresh server value na aa jaaye, taaki timer sec-by-sec smooth dikhe.

import { useEffect, useRef, useState } from 'react'

export function useLiveTicker(members = []) {
  const baseRef = useRef({}) // userId -> { liveElapsed, receivedAt }
  const [, forceTick] = useState(0)

  // Jab bhi naya server data aaye, baseline reset karo
  useEffect(() => {
    members.forEach((m) => {
      const id = m.userId?.toString()
      if (!id) return
      baseRef.current[id] = {
        liveElapsed: m.liveElapsed || 0,
        receivedAt: Date.now(),
      }
    })
  }, [members])

  // Har second re-render trigger karo taaki interpolated value update ho
  useEffect(() => {
    const id = setInterval(() => forceTick((t) => t + 1), 1000)
    return () => clearInterval(id)
  }, [])

  return members.map((m) => {
    const id = m.userId?.toString()
    const base = id && baseRef.current[id]
    if (!m.isStudying || !base) return m
    const extra = Math.max(0, Math.floor((Date.now() - base.receivedAt) / 1000))
    return { ...m, liveElapsed: base.liveElapsed + extra }
  })
}

export default useLiveTicker