import { useState, useEffect, useRef } from 'react'
import { getSessions } from '@/api/sessions'
import useUserStore from '@/store/userStore'
import {
  aggregateBySubject, getCumulative,
  getScatterData, getHeatmapData, calculateStreak,
} from '@/utils/stats'
import { getTodayString, get4amDayString } from '@/utils/time'

// period = { period, startDate, endDate }
export function useStats(period = {}) {
  const { uid, setStreak, setTotalHours } = useUserStore()
  const [sessions, setSessions]         = useState([])
  const [loading, setLoading]           = useState(true)
  const [donutData, setDonutData]       = useState([])
  const [stepData, setStepData]         = useState([])
  const [scatterData, setScatterData]   = useState([])
  const [heatmapData, setHeatmapData]   = useState({})
  const [totalSeconds, setTotalSeconds] = useState(0)

  const prevKey = useRef(null)

  useEffect(() => {
    if (!uid) return
    const key = JSON.stringify(period)
    if (key === prevKey.current) return
    prevKey.current = key
    fetchAndProcess()
  }, [uid, JSON.stringify(period)])

  async function fetchAndProcess() {
    setLoading(true)
    try {
      const { startDate, endDate } = period
      const start = startDate || get4amDayString()
      const end   = endDate   || get4amDayString()

      const data = await getSessions(start, end)
      setSessions(data)

      setDonutData(aggregateBySubject(data))
      setStepData(getCumulative(data))
      setScatterData(getScatterData(data))
      setHeatmapData(getHeatmapData(data))
      setTotalSeconds(data.reduce((sum, s) => sum + s.duration, 0))

      // Streak + total hours (from all sessions)
      const allSessions = await getSessions('2020-01-01', getTodayString())
      const streak = calculateStreak(allSessions)
      const totalHrs = allSessions.reduce((sum, s) => sum + s.duration, 0) / 3600
      setStreak(streak)
      setTotalHours(totalHrs)
    } catch (err) {
      console.error('Stats fetch error:', err)
    } finally {
      setLoading(false)
    }
  }

  return { sessions, loading, donutData, stepData, scatterData, heatmapData, totalSeconds, refetch: fetchAndProcess }
}

export default useStats