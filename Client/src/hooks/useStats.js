import { useState, useEffect } from 'react'
// ✅ FIX: '@/firebase/sessions' → '@/api/sessions'
import { getSessions } from '@/api/sessions'
import useUserStore from '@/store/userStore'
import {
  aggregateBySubject, aggregateByDay, getCumulative,
  getScatterData, getHeatmapData, calculateStreak,
} from '@/utils/stats'
import { getTodayString, getWeekStart, getMonthStart, getDateString } from '@/utils/time'

export function useStats(period = 'week', customStart = null, customEnd = null) {
  const { uid, setStreak, setTotalHours } = useUserStore()
  const [sessions, setSessions]       = useState([])
  const [loading, setLoading]         = useState(true)
  const [donutData, setDonutData]     = useState([])
  const [barData, setBarData]         = useState([])
  const [stepData, setStepData]       = useState([])
  const [scatterData, setScatterData] = useState([])
  const [heatmapData, setHeatmapData] = useState({})
  const [totalSeconds, setTotalSeconds] = useState(0)

  useEffect(() => {
    if (!uid) return
    fetchAndProcess()
  }, [uid, period, customStart, customEnd])

  async function fetchAndProcess() {
    setLoading(true)
    try {
      let startDate, endDate
      endDate = getTodayString()

      if (period === 'day')         startDate = getTodayString()
      else if (period === 'week')   startDate = getDateString(getWeekStart())
      else if (period === 'month')  startDate = getDateString(getMonthStart())
      else if (period === 'custom' && customStart && customEnd) {
        startDate = customStart; endDate = customEnd
      } else {
        const d = new Date(); d.setFullYear(d.getFullYear() - 1)
        startDate = getDateString(d)
      }

      // ✅ FIX: getSessions(uid, startDate, endDate) → getSessions(startDate, endDate)
      // uid JWT se aata hai — server side handle karta hai
      const data = await getSessions(startDate, endDate)
      setSessions(data)

      setDonutData(aggregateBySubject(data))
      setBarData(aggregateByDay(data, period === 'week' ? 7 : period === 'month' ? 30 : 7))
      setStepData(getCumulative(data))
      setScatterData(getScatterData(data))
      setHeatmapData(getHeatmapData(data))
      setTotalSeconds(data.reduce((sum, s) => sum + s.duration, 0))

      // Streak + total hours update karo
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

  return { sessions, loading, donutData, barData, stepData, scatterData, heatmapData, totalSeconds, refetch: fetchAndProcess }
}
export default useStats
