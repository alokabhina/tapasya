// src/pages/PracticeTestPlay.jsx
// The live test-taking engine (plan doc Section 7). Full-screen, no
// sidebar — mounted outside AppShell in App.jsx like /timer is. Wires
// together TestHeader / SectionTabs / SplitQuestionView / CandidatePalette /
// ActionBar / PauseOverlay / SectionSubmitModal / FinalSubmitModal /
// OnScreenCalculator around usePracticeTestStore (runtime state) +
// api/practiceAttempts.js (server sync — see plan doc Section 13 for the
// autosave/resume contract this follows).
//
// Perf: the countdown (LiveTimer) and Qn. Time (QuestionTimer) tick inside
// their own tiny components, so this page + the question body re-render only
// on real interactions (answer / next / jump) — not every second.
// Layout: question column (tabs + question + action bar) + palette that is a
// sidebar on lg+ and a slide-in drawer below that.

import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import usePracticeTestStore from '@/store/practiceTestStore'
import { getPracticeAttempt, savePracticeProgress, submitPracticeSection, reportPracticeIssue } from '@/api/practiceAttempts'
import { getPracticeSubject } from '@/api/practiceSubjects'
import useAutoStudyTimer from '@/hooks/useAutoStudyTimer'
import useMediaQuery from '@/hooks/useMediaQuery'

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
  // Study timer background me auto-start (screen pe kuch nahi dikhta)
  const autoTimer = useAutoStudyTimer(attemptId)

  const [ready, setReady] = useState(false)
  const [attemptSnapshot, setAttemptSnapshot] = useState(null) // last full attempt doc from server, for completed-section stats
  const [pauseMode, setPauseMode] = useState(null)             // null | 'confirm' | 'paused'
  const [submitModal, setSubmitModal] = useState(null)         // null | 'section' | 'final'
  const [submitting, setSubmitting] = useState(false)
  const [showCalculator, setShowCalculator] = useState(false)
  const [showReportModal, setShowReportModal] = useState(false)
  const [paletteOpen, setPaletteOpen] = useState(false)
  const isLg = useMediaQuery('(min-width: 1024px)')
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
  const deadlineRef = useRef(Date.now()) // epoch ms when the current section's time runs out
  const pausedAtRef = useRef(null)
  const syncedTimeRef = useRef({}) // qNo -> seconds already synced to server, reset per section

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
      deadlineRef.current = Date.now() + secondsLeft * 1000
      questionStartRef.current = Date.now()
      setReady(true)

      // Study timer: agar koi timer ON nahi hai to test ke subject ka ON kar do.
      // Priority: practice subject ka naam -> test title -> section names.
      // Naam match na ho to bhi koi ek subject pe chalega (hook ke andar fallback).
      const fallbackNames = [test.title, ...(test.sections || []).map((s) => s.name)]
      getPracticeSubject(subjectId)
        .then((subj) => autoTimer.ensureRunning([subj?.name, ...fallbackNames]))
        .catch(() => autoTimer.ensureRunning(fallbackNames))
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

  // Test pause hone pe auto-started study timer bhi pause, resume pe resume
  // (sirf agar wo isi test ne start kiya ho — user ka apna timer nahi chhedte)
  useEffect(() => {
    if (!ready) return
    if (pauseMode === 'paused') autoTimer.pauseIfOwned()
    else autoTimer.resumeIfOwned()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pauseMode, ready])

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

  function secondsLeftNow() {
    return Math.max(0, Math.round((deadlineRef.current - Date.now()) / 1000))
  }

  // Top-bar "Submit Test": finish the WHOLE test from any section. Submits the
  // current section, then every remaining one (untouched sections go in as
  // unattempted) using the existing per-section endpoint; the last call
  // finalizes + scores the attempt.
  async function submitFullTest() {
    if (submittingRef.current) return
    submittingRef.current = true
    setSubmitting(true)
    commitQuestionTime()
    await syncProgress({ full: true })
    try {
      const sections = store.test.sections
      const start = store.currentSectionIndex
      for (let i = start; i < sections.length; i++) {
        await submitPracticeSection(store.attemptId, {
          sectionIndex: i,
          timeLeftAtSubmitSec: i === start ? secondsLeftNow() : sections[i].durationSec,
          auto: false,
        })
      }
      await autoTimer.stopIfOwned()
      navigate(`/practice-tests/result/${attemptId}`, { replace: true })
    } catch (e) {
      window.alert('Submit fail hua, dobara try karo')
      submittingRef.current = false
      setSubmitting(false)
      setSubmitModal(null)
    }
  }

  async function submitCurrentSection(auto) {
    if (submittingRef.current) return
    submittingRef.current = true
    setSubmitting(true)
    commitQuestionTime()
    await syncProgress({ full: true })
    try {
      const timeLeftAtSubmitSec = auto ? 0 : secondsLeftNow()
      const { attempt, isLastSection } = await submitPracticeSection(store.attemptId, {
        sectionIndex: store.currentSectionIndex, timeLeftAtSubmitSec, auto,
      })
      if (isLastSection) {
        await autoTimer.stopIfOwned() // test khatam — auto-started timer ka session save
        navigate(`/practice-tests/result/${attemptId}`, { replace: true })
        return
      }
      setAttemptSnapshot(attempt)
      const nextIndex = store.currentSectionIndex + 1
      deadlineRef.current = Date.now() + store.test.sections[nextIndex].durationSec * 1000
      store.advanceToSection(nextIndex)
      syncedTimeRef.current = {}
      questionStartRef.current = Date.now()
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

  if (!ready) {
    return <div className="min-h-screen flex items-center justify-center bg-white text-slate-400 text-sm">Loading test...</div>
  }

  const section = store.currentSection()
  const question = store.currentQuestion()
  const direction = store.currentDirection()
  const responses = store.currentResponses()
  const isLastSection = store.currentSectionIndex === store.test.sections.length - 1

  function goNext(markStatus) {
    if (markStatus) store.toggleMarkForReview(question.qNo)
    commitQuestionTime()
    store.goToNextQuestion()
    syncProgress({ full: false })
  }

  function goPrev() {
    commitQuestionTime()
    store.goToPrevQuestion()
    syncProgress({ full: false })
  }

  function handleJump(index) {
    commitQuestionTime()
    store.goToQuestionIndex(index)
    syncProgress({ full: false })
  }

  async function handleExitTest() {
    if (!window.confirm('Test se bahar jaana hai? Progress save rahega, baad mein resume kar sakte ho.')) return
    await autoTimer.stopIfOwned()
    navigate(`/practice-tests/${subjectId}`, { replace: true })
  }

  function buildSummary() {
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
  return { sectionRows, grandTotal }
  }

  const summary = submitModal ? buildSummary() : null
  const totalQuestions = store.test.sections.reduce((n, s) => n + s.questions.length, 0)
  const paused = pauseMode === 'paused'

  return (
    <div className="fixed inset-0 flex flex-col bg-white text-slate-800 z-40 overflow-hidden">
      <TestHeader
        title={store.test.title}
        deadlineRef={deadlineRef}
        timerPaused={paused}
        timerResetKey={store.currentSectionIndex}
        onTimerExpire={handleSectionExpire}
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
        onSubmitTestClick={() => { commitQuestionTime(); setSubmitModal('final') }}
        onOpenPalette={isLg ? undefined : () => setPaletteOpen(true)}
        submitting={submitting}
      />

      <div className="flex-1 flex min-h-0">
        <main className="flex-1 min-w-0 flex flex-col min-h-0">
          <SectionTabs
            sections={store.test.sections}
            currentSectionIndex={store.currentSectionIndex}
            qNo={question.qNo}
            displayPosition={`${question.qNo} / ${totalQuestions}`}
            marksCorrect={question.marksCorrectOverride ?? section.marksCorrect}
            marksWrong={question.marksWrongOverride ?? section.marksWrong}
            questionBaseSec={responses[question.qNo]?.timeSpentSec || 0}
            questionStartRef={questionStartRef}
            paused={paused}
          />

          <SplitQuestionView
            question={question}
            direction={direction}
            qNo={question.qNo}
            selectedKey={responses[question.qNo]?.selectedKey ?? null}
            onSelectOption={store.selectOption}
            fontScale={fontScale}
            isFirstInGroup={!question.groupId || section.questions.find((q) => q.groupId === question.groupId)?.qNo === question.qNo}
          />

          <ActionBar
            onMarkForReview={() => goNext(true)}
            onClearResponse={() => { store.clearResponse(question.qNo); syncProgress({ full: false }) }}
            onSaveAndNext={() => goNext(false)}
            onPrev={goPrev}
            canPrev={store.currentQuestionIndex > 0}
          />
        </main>

        <CandidatePalette
          open={paletteOpen}
          onClose={() => setPaletteOpen(false)}
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
        onConfirmPause={() => {
          commitQuestionTime() // bank time spent so far on this question
          pausedAtRef.current = Date.now()
          setPauseMode('paused')
        }}
        onResume={() => {
          // push the section deadline forward by the paused duration (before the
          // timer restarts, so it can never see a stale deadline and auto-submit)
          if (pausedAtRef.current != null) {
            deadlineRef.current += Date.now() - pausedAtRef.current
            pausedAtRef.current = null
          }
          questionStartRef.current = Date.now()
          setPauseMode(null)
        }}
      />

      {submitModal === 'section' && (
        <SectionSubmitModal
          sectionName={section.name}
          counts={store.statusCounts()}
          totalQuestions={section.questions.length}
          timeTakenSec={summary.sectionRows[store.currentSectionIndex]?.timeTakenSec || 0}
          submitting={submitting}
          onCancel={() => setSubmitModal(null)}
          onConfirm={() => submitCurrentSection(false)}
        />
      )}

      {submitModal === 'final' && (
        <FinalSubmitModal
          sectionRows={summary.sectionRows}
          grandTotal={summary.grandTotal}
          pendingSections={store.test.sections.length - 1 - store.currentSectionIndex}
          submitting={submitting}
          onCancel={() => setSubmitModal(null)}
          onConfirm={submitFullTest}
        />
      )}
    </div>
  )
}