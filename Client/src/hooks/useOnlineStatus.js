// src/hooks/useOnlineStatus.js
// Online/offline detector + auto-flush on reconnect

import { useEffect, useState, useCallback } from 'react'
import { flushQueue, getPendingCount } from '@/utils/syncQueue'

export function useOnlineStatus() {
  const [isOnline,  setIsOnline]  = useState(navigator.onLine)
  const [pending,   setPending]   = useState(getPendingCount())
  const [syncing,   setSyncing]   = useState(false)

  const flush = useCallback(async () => {
    if (!navigator.onLine) return
    const count = getPendingCount()
    if (count === 0) return
    setSyncing(true)
    try {
      await flushQueue()
    } finally {
      setSyncing(false)
      setPending(getPendingCount())
    }
  }, [])

  useEffect(() => {
    function onOnline() {
      setIsOnline(true)
      flush()
    }
    function onOffline() {
      setIsOnline(false)
    }

    window.addEventListener('online',  onOnline)
    window.addEventListener('offline', onOffline)

    // Also flush on mount if online and have pending
    if (navigator.onLine) flush()

    return () => {
      window.removeEventListener('online',  onOnline)
      window.removeEventListener('offline', onOffline)
    }
  }, [flush])

  // Refresh pending count periodically
  useEffect(() => {
    const id = setInterval(() => setPending(getPendingCount()), 5000)
    return () => clearInterval(id)
  }, [])

  return { isOnline, pending, syncing }
}

export default useOnlineStatus