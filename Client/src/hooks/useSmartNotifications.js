// src/hooks/useSmartNotifications.js

import { useEffect, useRef } from 'react'
import useUserStore from '@/store/userStore'
import {
  requestPermission,
  hasPermission,
  checkGoalMilestone,
  sendHourlyProgress,
  sendTodoReminder,
  sendMorningMotivation,
  sendEveningReminder,
  schedulePersonalNudges,
  resetMilestones,
} from '@/utils/notifications'

const HOURLY_MS = 60 * 60 * 1000
const TODO_MS   = 2 * 60 * 60 * 1000

function nowHour() { return new Date().getHours() }
function isInWindow(s, e) { const h = nowHour(); return h >= s && h < e }

export function useSmartNotifications({
  todaySeconds = 0,
  goalSeconds  = 0,
  streakDays   = 0,
  pendingTodos = [],
}) {
  const displayName = useUserStore((s) => s.displayName)

  // ── refs ──────────────────────────────────────────────────────────────────
  const lastDayRef     = useRef(null)
  const hourlyRef      = useRef(null)
  const todoRef        = useRef(null)
  const morningDoneRef = useRef(false)
  const eveningDoneRef = useRef(false)
  const nudgeSetupRef  = useRef(false)

  // Always-fresh refs for use inside timers
  const todayRef   = useRef(todaySeconds)
  const goalRef    = useRef(goalSeconds)
  const streakRef  = useRef(streakDays)
  const pendingRef = useRef(pendingTodos)
  const nameRef    = useRef(displayName)

  useEffect(() => { todayRef.current   = todaySeconds  }, [todaySeconds])
  useEffect(() => { goalRef.current    = goalSeconds   }, [goalSeconds])
  useEffect(() => { streakRef.current  = streakDays    }, [streakDays])
  useEffect(() => { pendingRef.current = pendingTodos  }, [pendingTodos])
  useEffect(() => { nameRef.current    = displayName   }, [displayName])

  // ── 1. Permission ─────────────────────────────────────────────────────────
  useEffect(() => { requestPermission() }, [])

  // ── 2. Day reset — naya din detect karo ──────────────────────────────────
  useEffect(() => {
    const today = new Date().toDateString()
    if (lastDayRef.current !== today) {
      lastDayRef.current     = today
      morningDoneRef.current = false
      eveningDoneRef.current = false
      nudgeSetupRef.current  = false
      resetMilestones()
    }
  }, [todaySeconds])

  // ── 3. Goal milestones — 25/50/75/100% ───────────────────────────────────
  useEffect(() => {
    if (!hasPermission() || goalSeconds <= 0) return
    checkGoalMilestone(todaySeconds, goalSeconds, displayName)
  }, [todaySeconds, goalSeconds, displayName])

  // ── 4. Morning — 6am–9am, ek baar ────────────────────────────────────────
  // FIX: sirf app open pe nahi — interval se check karo
  useEffect(() => {
    if (!hasPermission()) return

    function checkMorning() {
      if (morningDoneRef.current) return
      if (isInWindow(6, 9)) {
        morningDoneRef.current = true
        sendMorningMotivation(goalRef.current, streakRef.current, nameRef.current)
      }
    }

    checkMorning() // turant check
    const id = setInterval(checkMorning, 5 * 60 * 1000) // har 5 min check
    return () => clearInterval(id)
  }, [])

  // ── 5. Evening — 8pm–11pm, ek baar, sirf agar incomplete ─────────────────
  // FIX: interval se check karo
  useEffect(() => {
    if (!hasPermission()) return

    function checkEvening() {
      if (eveningDoneRef.current) return
      if (isInWindow(20, 23) && todayRef.current < goalRef.current) {
        eveningDoneRef.current = true
        sendEveningReminder(todayRef.current, goalRef.current, nameRef.current)
      }
    }

    checkEvening()
    const id = setInterval(checkEvening, 5 * 60 * 1000)
    return () => clearInterval(id)
  }, [])

  // ── 6. Hourly progress — har 60 min ──────────────────────────────────────
  useEffect(() => {
    if (!hasPermission()) return

    function tick() {
      hourlyRef.current = setTimeout(async () => {
        await sendHourlyProgress(
          todayRef.current,
          goalRef.current,
          streakRef.current,
          nameRef.current,
        )
        tick()
      }, HOURLY_MS)
    }

    tick()
    return () => clearTimeout(hourlyRef.current)
  }, [])

  // ── 7. Todo reminder — 30min baad pehla, phir har 2hr ────────────────────
  useEffect(() => {
    if (!hasPermission()) return

    async function sendTodo() {
      if (pendingRef.current.length > 0) {
        await sendTodoReminder(pendingRef.current, nameRef.current)
      }
    }

    // Pehla: 30 min baad
    const firstId = setTimeout(async () => {
      await sendTodo()
      // Phir har 2hr
      function loop() {
        todoRef.current = setTimeout(async () => { await sendTodo(); loop() }, TODO_MS)
      }
      loop()
    }, 30 * 60 * 1000)

    return () => {
      clearTimeout(firstId)
      clearTimeout(todoRef.current)
    }
  }, [])

  // ── 8. Personal name nudges — din mein 3 baar random ─────────────────────
  useEffect(() => {
    if (!hasPermission() || nudgeSetupRef.current) return
    nudgeSetupRef.current = true
    schedulePersonalNudges(displayName)
  }, [displayName])
}

export default useSmartNotifications