import { useState, useEffect, useRef } from 'react'
import { getSessions } from '@/api/sessions'
import useUserStore from '@/store/userStore'
import {
  aggregateBySubject, getCumulative,
  getScatterData, getHeatmapData, calculateStreak,
} from '@/utils/stats'
import { getTodayString, get4amDayString } from '@/utils/time'

// period = { period, startDate, endDate }, refreshKey = optional counter to force refetch
export function useStats(period = {}, refreshKey = 0) {
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
    const key = JSON.stringify(period) + '|' + refreshKey
    if (key === prevKey.current) return
    prevKey.current = key
    fetchAndProcess()
  }, [uid, JSON.stringify(period), refreshKey])

  async function fetchAndProcess() {
    setLoading(true)
    try {
      const { startDate, endDate } = period
      const start = startDate || get4amDayString()
      const end   = endDate   || get4amDayString()

      const data = await getSessions(start, end)
      setSessions(data)

      // Always update derived state — even if data is empty array
      setDonutData(aggregateBySubject(data))
      setStepData(getCumulative(data))
      setScatterData(getScatterData(data))
      setHeatmapData(getHeatmapData(data))
      setTotalSeconds(data.reduce((sum, s) => sum + (s.duration || 0), 0))

      // Streak + total hours (from all sessions)
      const allSessions = await getSessions('2020-01-01', getTodayString())
      const streak = calculateStreak(allSessions)
      const totalHrs = allSessions.reduce((sum, s) => sum + (s.duration || 0), 0) / 3600
      setStreak(streak)
      setTotalHours(totalHrs)
    } catch (err) {
      console.error('Stats fetch error:', err)
      // On error, clear data so UI shows empty state instead of infinite spinner
      setSessions([])
      setDonutData([])
      setStepData([])
      setScatterData([])
      setHeatmapData({})
      setTotalSeconds(0)
    } finally {
      setLoading(false)  // always resolves — no infinite spinner
    }
  }

  return { sessions, loading, donutData, stepData, scatterData, heatmapData, totalSeconds, refetch: fetchAndProcess }
}

export default useStats