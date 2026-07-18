import { useState, useEffect } from 'react'
import { getStudyDayString } from '@/utils/time'

const STORAGE_KEY = 'tapasya_wellbeing'

export function useWellbeing() {
  const [screenTime, setScreenTime] = useState(0) // minutes
  const [studyTime, setStudyTime] = useState(0) // minutes
  const [isNative, setIsNative] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadWellbeingData()
  }, [])

  async function loadWellbeingData() {
    setLoading(true)
    const today = getStudyDayString()

    // Cache check karo pehle
    try {
      const cached = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}')
      if (cached.date === today) {
        setScreenTime(cached.screenTime || 0)
        setStudyTime(cached.studyTime || 0)
        setIsNative(cached.isNative || false)
        setLoading(false)
        return
      }
    } catch {}

    // Android TWA native bridge try karo
    if (window?.TapasyaNative?.getWellbeing) {
      try {
        const data = await window.TapasyaNative.getWellbeing()
        setScreenTime(data.screenTime)
        setIsNative(true)
        cacheData(today, data.screenTime, 0, true)
        setLoading(false)
        return
      } catch {}
    }

    // Fallback — manual input
    setIsNative(false)
    setLoading(false)
  }

  // Manual screen time set karo (web fallback)
  function setManualScreenTime(minutes) {
    setScreenTime(minutes)
    cacheData(getStudyDayString(), minutes, studyTime, false)
  }

  function setManualStudyTime(minutes) {
    setStudyTime(minutes)
    cacheData(getStudyDayString(), screenTime, minutes, false)
  }

  function cacheData(date, screen, study, native) {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ date, screenTime: screen, studyTime: study, isNative: native })
    )
  }

  return {
    screenTime,
    studyTime,
    isNative,
    loading,
    setManualScreenTime,
    setManualStudyTime,
  }
}
export default useWellbeing