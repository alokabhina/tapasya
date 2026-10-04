// src/pages/PracticeTestResult.jsx
// Result page (plan doc Section 9) — landed on right after final submit
// (PracticeTestPlay navigates here with replace:true) or reached again
// later from attempt history. Route: /practice-tests/result/:attemptId.
//
// Round-3: layout rebuilt to match the reference design — breadcrumb +
// Test ID/Attempted-on pills, trophy heading with a "Keep Going!"/"Great
// Score!" side card, then ResultCards' colorful stat rows, a full-width
// View Solutions button, Sectional Summary, the rest of the Analysis
// (Weakness, Time Split, Strong/Weak Zones, Attempt Compare) in the same
// scroll, and a closing Next Steps card. AttemptSwitcher shows up whenever
// this test has more than one attempt, so a past attempt's result is
// always one click away.
//
// Dark/brand theme — matches the rest of the app shell (Sidebar etc.).
// Only the live engine (PracticeTestPlay.jsx) and its in-test screens stay
// light/white, to match the reference (Guidely) screenshots; Result and
// Solutions switch to our own brand look once the test itself is over.

import { useEffect, useState } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { getPracticeResult, getPracticeAnalysis } from '@/api/practiceAttempts'
import AttemptSwitcher from '@/components/practicetest/AttemptSwitcher'
import ResultCards from '@/components/practicetest/ResultCards'
import SectionalSummaryTable from '@/components/practicetest/SectionalSummaryTable'
import WeaknessStrengthPanel from '@/components/practicetest/WeaknessStrengthPanel'
import TimeSplitTable from '@/components/practicetest/TimeSplitTable'
import StrongWeakZones from '@/components/practicetest/StrongWeakZones'
import AttemptCompareTable from '@/components/practicetest/AttemptCompareTable'

export default function PracticeTestResult() {
  const { attemptId } = useParams()
  const navigate = useNavigate()
  const [result, setResult] = useState(null)
  const [analysis, setAnalysis] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    setResult(null)
    setAnalysis(null)
    getPracticeResult(attemptId).then(setResult).catch(() => setError('Result load nahi ho paya'))
    // Best-effort — if analysis fails to load the score card still shows;
    // we just skip the analysis section below rather than blocking the page.
    getPracticeAnalysis(attemptId).then(setAnalysis).catch(() => {})
    // "View Solutions" dabate hi page khule — chunk pehle se ready
    import('./PracticeTestSolutions').catch(() => {})
  }, [attemptId])

  function jumpToQuestion(qNo) {
    navigate(`/practice-tests/solutions/${attemptId}?qNo=${qNo}`)
  }

  if (error) {
    return <div className="min-h-screen bg-[#0f172a] flex items-center justify-center text-red-400 text-sm px-4 text-center">{error}</div>
  }
  if (!result) {
    return (
      <div className="min-h-screen bg-[#0f172a] px-4 py-6 md:px-8 max-w-4xl mx-auto">
        <div className="h-40 rounded-2xl bg-slate-800/60 animate-pulse mb-3" />
        <div className="h-24 rounded-2xl bg-slate-800/60 animate-pulse" />
      </div>
    )
  }

  const didWell = result.overall.passedCutoff != null ? result.overall.passedCutoff : (result.overall.accuracy ?? 0) >= 60

  return (
    <div className="min-h-screen bg-[#0f172a] px-4 py-6 md:px-8 max-w-4xl mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-2 mb-5 text-xs">
        <div className="flex items-center gap-1.5 text-slate-500">
          <Link to="/practice-tests" className="hover:text-slate-300 flex items-center gap-1"><i className="ti ti-home" /> Practice Tests</Link>
          <i className="ti ti-chevron-right text-[10px]" />
          <span className="text-slate-300 font-semibold">Test Result</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-2.5 py-1 rounded-lg bg-slate-900/60 border border-slate-800 text-slate-400 flex items-center gap-1">
            <i className="ti ti-calendar" /> Test ID: {result.testId}
          </span>
          {result.submittedAt && (
            <span className="px-2.5 py-1 rounded-lg bg-slate-900/60 border border-slate-800 text-slate-400 flex items-center gap-1">
              <i className="ti ti-clock" /> Attempted on {new Date(result.submittedAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' })}
            </span>
          )}
        </div>
      </div>

      <div className="flex items-start justify-between flex-wrap gap-4 mb-5">
        <div>
          <h1 className="text-2xl font-black text-white flex items-center gap-2">
            <i className="ti ti-trophy text-tapasya-orange" /> Test Result
          </h1>
          <p className="text-slate-400 text-sm mt-1">Here's a detailed analysis of your performance. Keep practicing!</p>
        </div>
        <div className={`rounded-2xl px-4 py-3 flex items-start gap-2.5 border ${didWell ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-tapasya-orange/10 border-tapasya-orange/30'}`}>
          <i className={`ti ${didWell ? 'ti-confetti text-emerald-400' : 'ti-rocket text-tapasya-orange'} text-xl mt-0.5`} />
          <div>
            <p className={`font-black text-sm ${didWell ? 'text-emerald-400' : 'text-tapasya-orange'}`}>{didWell ? 'Great Score!' : 'Keep Going!'}</p>
            <p className="text-slate-400 text-xs mt-0.5 max-w-[220px]">
              {didWell ? "You're on track — keep this momentum going." : 'Analyze your mistakes and improve in the next test.'}
            </p>
          </div>
        </div>
      </div>

      <AttemptSwitcher testId={result.testId} currentAttemptId={attemptId} basePath="result" />

      <ResultCards overall={result.overall} attemptNumber={result.attemptNumber} previousScore={result.previousScore} />

      <button
        onClick={() => navigate(`/practice-tests/solutions/${attemptId}`)}
        className="w-full mt-4 py-3 rounded-xl bg-tapasya-orange text-white text-sm font-bold hover:bg-tapasya-orange-dark flex items-center justify-center gap-1.5"
      >
        <i className="ti ti-list-check" /> View Solutions <i className="ti ti-chevron-right" />
      </button>

      {analysis && (
        <div className="space-y-4 mt-6">
          <SectionalSummaryTable sectionalSummary={analysis.sectionalSummary} />
          <WeaknessStrengthPanel topicBreakdown={analysis.topicBreakdown} onJumpToQuestion={jumpToQuestion} />
          <TimeSplitTable timeSplit={analysis.timeSplit} />
          <StrongWeakZones strongWeakZones={analysis.strongWeakZones} />
          <AttemptCompareTable attemptCompare={analysis.attemptCompare} currentAttemptNumber={result.attemptNumber} />
        </div>
      )}

      <div className="rounded-2xl border border-tapasya-orange/25 bg-tapasya-orange/5 px-5 py-4 mt-6 flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-start gap-2.5">
          <i className="ti ti-bulb text-tapasya-orange text-xl mt-0.5" />
          <div>
            <p className="text-white font-bold text-sm">Next Steps</p>
            <p className="text-slate-400 text-xs mt-0.5">View solutions to understand your mistakes and improve. Keep practicing to boost your score!</p>
          </div>
        </div>
        <button
          onClick={() => navigate('/practice-tests')}
          className="shrink-0 px-4 py-2 rounded-lg bg-tapasya-orange text-white text-xs font-bold hover:bg-tapasya-orange-dark flex items-center gap-1"
        >
          Go to Practice Tests <i className="ti ti-arrow-right" />
        </button>
      </div>
    </div>
  )
}