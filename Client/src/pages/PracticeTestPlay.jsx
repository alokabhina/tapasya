// src/pages/PracticeTestPlay.jsx
// The live test-taking engine (plan doc Section 7). Full-screen, no
// sidebar — mounted outside AppShell in App.jsx like /timer is. Wires
// together TestHeader / SectionTabs / SplitQuestionView / CandidatePalette /
// ActionBar / PauseOverlay / SectionSubmitModal / FinalSubmitModal /
// OnScreenCalculator around usePracticeTestStore (runtime state) +
// api/practiceAttempts.js (server sync — see plan doc Section 13 for the
// autosave/resume contract this follows).

import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import useCountdown from '@/hooks/useCountdown'
import usePracticeTestStore from '@/store/practiceTestStore'
import { getPracticeAttempt, savePracticeProgress, submitPracticeSection, reportPracticeIssue } from '@/api/practiceAttempts'

import TestHeader from '@/components/practicetest/TestHeader'
import SectionTabs from '@/components/practicetest/SectionTabs'
import SplitQuestionView from '@/components/practicetest/SplitQuestionView'
import CandidatePalette from '@/components/practicetest/CandidatePalette'
import ActionBar from '@/components/practicetest/ActionBar'
import PauseOverlay from '@/components/practicetest/PauseOverlay'
import SectionSubmitModal from '@/components/practicetest/SectionSubmitModal'
import FinalSubmitModal from '@/components/practicetest/FinalSubmitModal'
import OnScreenCalculator from '@/components/practicetest/OnScreenCalculator'
import ReportQuestionModal from '@/components/practicetest/ReportQuestionModal'

const AUTOSAVE_INTERVAL_MS = 15000
const FONT_SCALE_KEY = 'practiceTestFontScale'

function countsFromResponses(responses) {
  const c = { answered: 0, notAnswered: 0, notVisited: 0, marked: 0, answeredMarked: 0 }
  for (const r of responses || []) {
    if (r.status === 'answered') c.answered++
    else if (r.status === 'not-answered') c.notAnswered++
    else if (r.status === 'not-visited') c.notVisited++
    else if (r.status === 'marked') c.marked++
    else if (r.status === 'answered-marked') c.answeredMarked++
  }
  return c
}

export default function PracticeTestPlay() {
  const { subjectId, testId, attemptId } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const store = usePracticeTestStore()

  const [ready, setReady] = useState(false)
  const [initialSeconds, setInitialSeconds] = useState(null)
  const [attemptSnapshot, setAttemptSnapshot] = useState(null) // last full attempt doc from server, for completed-section stats
  const [pauseMode, setPauseMode] = useState(null)             // null | 'confirm' | 'paused'
  const [submitModal, setSubmitModal] = useState(null)         // null | 'section' | 'final'
  const [submitting, setSubmitting] = useState(false)
  const [showCalculator, setShowCalculator] = useState(false)
  const [showReportModal, setShowReportModal] = useState(false)
  const [fontScale, setFontScale] = useState(() => {
    const saved = Number(localStorage.getItem(FONT_SCALE_KEY))
    return Number.isInteger(saved) && saved >= 0 && saved <= 3 ? saved : 1
  })

  function adjustFontScale(delta) {
    setFontScale((v) => {
      const next = Math.min(3, Math.max(0, v + delta))
      localStorage.setItem(FONT_SCALE_KEY, String(next))
      return next
    })
  }

  const submittingRef = useRef(false)
  const questionStartRef = useRef(Date.now())
  const syncedTimeRef = useRef({}) // qNo -> seconds already synced to server, reset per section
  const [, forceTick] = useState(0)

  // ── Load / resume ──────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false
    getPracticeAttempt(attemptId).then(({ attempt, test }) => {
      if (cancelled) return
      if (attempt.status !== 'in-progress') {
        navigate(`/practice-tests/result/${attemptId}`, { replace: true })
        return
      }
      store.loadAttempt(attempt, test)
      setAttemptSnapshot(attempt)
      const section = test.sections[attempt.currentSectionIndex]
      const startedAt = attempt.sectionState[attempt.currentSectionIndex]?.startedAt
      const secondsLeft = startedAt
        ? Math.max(0, section.durationSec - (Date.now() - new Date(startedAt).getTime()) / 1000)
        : section.durationSec
      setInitialSeconds(secondsLeft)
      questionStartRef.current = Date.now()
      setReady(true)
    }).catch(() => {
      if (cancelled) return
      // Load fail hua (network issue, invalid attempt, etc.) — Instructions
      // page pe bhej do taaki user confuse na ho aur wapas "Start Test" kar
      // sake, red error text dikhane ke bajaye (Round-2 Issue A).
      navigate(`/practice-tests/${subjectId}/${testId}`, { replace: true })
    })

    return () => { cancelled = true; store.reset() }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attemptId])

  // ── Live "Qn. Time" ticking display (doesn't write to store every tick) ─
  useEffect(() => {
    if (!ready || pauseMode === 'paused') return
    const id = setInterval(() => forceTick((t) => t + 1), 1000)
    return () => clearInterval(id)
  }, [ready, pauseMode])

  const commitQuestionTime = useCallback(() => {
    const q = store.currentQuestion()
    if (!q) return
    const elapsed = (Date.now() - questionStartRef.current) / 1000
    if (elapsed > 0.2) store.addTimeSpent(q.qNo, elapsed)
    questionStartRef.current = Date.now()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store.currentSectionIndex, store.currentQuestionIndex])

  const syncProgress = useCallback(async ({ full = false } = {}) => {
    if (!store.attemptId) return
    const section = store.currentSection()
    if (!section) return
    const responses = store.currentResponses()
    const qNos = full ? section.questions.map((q) => q.qNo) : store.dirtyQNos
    if (qNos.length === 0) return
    const payload = qNos.map((qNo) => {
      const r = responses[qNo] || {}
      const total = r.timeSpentSec || 0
      const already = syncedTimeRef.current[qNo] || 0
      const delta = Math.max(0, total - already)
      syncedTimeRef.current[qNo] = total
      return { qNo, selectedKey: r.selectedKey ?? null, status: r.status || 'not-visited', timeSpentSec: delta }
    })
    try {
      await savePracticeProgress(store.attemptId, {
        sectionIndex: store.currentSectionIndex, responses: payload, currentSectionIndex: store.currentSectionIndex,
      })
      store.clearDirty()
    } catch { /* best-effort — next tick or the pre-submit full sync will retry */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store.attemptId, store.currentSectionIndex])

  // Periodic autosave (plan doc Section 13)
  useEffect(() => {
    if (!ready) return
    const id = setInterval(() => { commitQuestionTime(); syncProgress({ full: false }) }, AUTOSAVE_INTERVAL_MS)
    return () => clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, store.currentSectionIndex])

  // Back-button guard (plan doc Section 14) — only Submit / Exit Test leave this page.
  useEffect(() => {
    if (!ready) return
    window.history.pushState(null, '', window.location.href)
    function onPopState() {
      window.history.pushState(null, '', window.location.href)
      window.alert('Test abhi chal raha hai — sirf "Submit" karke ya "Exit Test" se bahar ja sakte ho.')
    }
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [ready])

  async function submitCurrentSection(auto) {
    if (submittingRef.current) return
    submittingRef.current = true
    setSubmitting(true)
    commitQuestionTime()
    await syncProgress({ full: true })
    try {
      const timeLeftAtSubmitSec = auto ? 0 : Math.max(0, Math.round(secondsLeft))
      const { attempt, isLastSection } = await submitPracticeSection(store.attemptId, {
        sectionIndex: store.currentSectionIndex, timeLeftAtSubmitSec, auto,
      })
      if (isLastSection) {
        navigate(`/practice-tests/result/${attemptId}`, { replace: true })
        return
      }
      setAttemptSnapshot(attempt)
      const nextIndex = store.currentSectionIndex + 1
      store.advanceToSection(nextIndex)
      syncedTimeRef.current = {}
      questionStartRef.current = Date.now()
      setInitialSeconds(store.test.sections[nextIndex].durationSec)
    } catch (e) {
      window.alert('Submit fail hua, dobara try karo')
    } finally {
      submittingRef.current = false
      setSubmitting(false)
      setSubmitModal(null)
    }
  }

  function handleSectionExpire() {
    if (!ready || submittingRef.current) return
    submitCurrentSection(true)
  }

  // `enabled: ready` keeps this paused until the attempt has actually
  // finished loading — otherwise it was starting at 0s during the load
  // window, expiring instantly, and firing a doomed auto-submit before
  // store.attemptId even existed (Round-2 Issue A, the "Submit fail hua"
  // bug).
  const { secondsLeft } = useCountdown(initialSeconds ?? 0, handleSectionExpire, store.currentSectionIndex, ready)

  if (!ready || initialSeconds == null) {
    return <div className="min-h-screen flex items-center justify-center bg-white text-slate-400 text-sm">Loading test...</div>
  }

  const section = store.currentSection()
  const question = store.currentQuestion()
  const direction = store.currentDirection()
  const responses = store.currentResponses()
  const isLastSection = store.currentSectionIndex === store.test.sections.length - 1
  const qTotalTime = (responses[question.qNo]?.timeSpentSec || 0) + (Date.now() - questionStartRef.current) / 1000

  function goNext(markStatus) {
    if (markStatus) store.toggleMarkForReview(question.qNo)
    commitQuestionTime()
    store.goToNextQuestion()
    syncProgress({ full: false })
  }

  function handleJump(index) {
    commitQuestionTime()
    store.goToQuestionIndex(index)
    syncProgress({ full: false })
  }

  function handleExitTest() {
    if (!window.confirm('Test se bahar jaana hai? Progress save rahega, baad mein resume kar sakte ho.')) return
    navigate(`/practice-tests/${subjectId}`, { replace: true })
  }

  const sectionRows = store.test.sections.map((s, i) => {
    if (i < store.currentSectionIndex && attemptSnapshot?.sectionState?.[i]) {
      const st = attemptSnapshot.sectionState[i]
      return { name: s.name, totalQuestions: s.questions.length, timeTakenSec: st.timeTakenSec || 0, ...countsFromResponses(st.responses) }
    }
    const r = i === store.currentSectionIndex ? responses : (store.responsesBySection[i] || {})
    const counts = { answered: 0, notAnswered: 0, notVisited: 0, marked: 0, answeredMarked: 0 }
    let timeTakenSec = 0
    for (const q of s.questions) {
      const resp = r[q.qNo]
      timeTakenSec += resp?.timeSpentSec || 0
      const status = resp?.status || 'not-visited'
      if (status === 'answered') counts.answered++
      else if (status === 'not-answered') counts.notAnswered++
      else if (status === 'not-visited') counts.notVisited++
      else if (status === 'marked') counts.marked++
      else if (status === 'answered-marked') counts.answeredMarked++
    }
    return { name: s.name, totalQuestions: s.questions.length, timeTakenSec, ...counts }
  })
  const grandTotal = sectionRows.reduce((acc, r) => ({
    totalQuestions: acc.totalQuestions + r.totalQuestions,
    timeTakenSec: acc.timeTakenSec + r.timeTakenSec,
    answered: acc.answered + r.answered,
    notAnswered: acc.notAnswered + r.notAnswered,
    notVisited: acc.notVisited + r.notVisited,
    marked: acc.marked + r.marked,
    answeredMarked: acc.answeredMarked + r.answeredMarked,
  }), { totalQuestions: 0, timeTakenSec: 0, answered: 0, notAnswered: 0, notVisited: 0, marked: 0, answeredMarked: 0 })

  return (
    <div className="fixed inset-0 flex flex-col bg-white text-slate-800 z-40">
      <TestHeader
        title={store.test.title}
        secondsLeft={secondsLeft}
        hasCalculator={!!section.hasCalculator}
        showCalculator={showCalculator}
        onToggleCalculator={() => setShowCalculator((v) => !v)}
        onPauseClick={() => setPauseMode('confirm')}
        onToggleFullscreen={() => {
          if (document.fullscreenElement) document.exitFullscreen?.()
          else document.documentElement.requestFullscreen?.()
        }}
        onExitClick={handleExitTest}
        onReportClick={() => setShowReportModal(true)}
        fontScale={fontScale}
        onFontScaleChange={adjustFontScale}
      />

      <SectionTabs
        sections={store.test.sections}
        currentSectionIndex={store.currentSectionIndex}
        qNo={question.qNo}
        displayPosition={`${question.qNo} / ${store.test.sections.reduce((n, s) => n + s.questions.length, 0)}`}
        marksCorrect={question.marksCorrectOverride ?? section.marksCorrect}
        marksWrong={question.marksWrongOverride ?? section.marksWrong}
        questionTimeSec={qTotalTime}
      />

      <div className="flex-1 flex flex-col md:flex-row min-h-0 overflow-hidden">
        <div className="flex-1 flex flex-col min-h-0">
          <SplitQuestionView
            question={question}
            direction={direction}
            qNo={question.qNo}
            selectedKey={responses[question.qNo]?.selectedKey ?? null}
            onSelectOption={(key) => store.selectOption(question.qNo, key)}
            fontScale={fontScale}
          />
          <ActionBar
            onMarkForReview={() => goNext(true)}
            onClearResponse={() => { store.clearResponse(question.qNo); syncProgress({ full: false }) }}
            onSaveAndNext={() => goNext(false)}
          />
        </div>

        <CandidatePalette
          userName={user?.displayName}
          photoURL={user?.photoURL}
          sectionName={section.name}
          questions={section.questions}
          responses={responses}
          currentQNo={question.qNo}
          onJumpToQuestion={handleJump}
          isLastSection={isLastSection}
          submitting={submitting}
          onSubmitSection={() => { commitQuestionTime(); setSubmitModal(isLastSection ? 'final' : 'section') }}
        />
      </div>

      {showCalculator && <OnScreenCalculator onClose={() => setShowCalculator(false)} />}

      {showReportModal && (
        <ReportQuestionModal
          qNo={question.qNo}
          sectionIndex={store.currentSectionIndex}
          onSubmit={(payload) => reportPracticeIssue(store.attemptId, payload)}
          onClose={() => setShowReportModal(false)}
        />
      )}

      <PauseOverlay
        mode={pauseMode}
        onCancel={() => setPauseMode(null)}
        onConfirmPause={() => setPauseMode('paused')}
        onResume={() => { questionStartRef.current = Date.now(); setPauseMode(null) }}
      />

      {submitModal === 'section' && (
        <SectionSubmitModal
          sectionName={section.name}
          counts={store.statusCounts()}
          totalQuestions={section.questions.length}
          timeTakenSec={sectionRows[store.currentSectionIndex]?.timeTakenSec || 0}
          submitting={submitting}
          onCancel={() => setSubmitModal(null)}
          onConfirm={() => submitCurrentSection(false)}
        />
      )}

      {submitModal === 'final' && (
        <FinalSubmitModal
          sectionRows={sectionRows}
          grandTotal={grandTotal}
          submitting={submitting}
          onCancel={() => setSubmitModal(null)}
          onConfirm={() => submitCurrentSection(false)}
        />
      )}
    </div>
  )
}