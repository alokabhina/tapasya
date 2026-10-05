// src/pages/PracticeTestAnalysis.jsx
// Dedicated Analysis page — /practice-tests/analysis/:attemptId.
// Result page ab sirf score cards + buttons dikhata hai; poora analysis
// (Sectional Summary, Know Your Weakness, Time Split, Strong/Weak Zones,
// Attempt Compare) yahan hai. Load fail hone par error + Retry dikhta hai
// (pehle fail hone par section chup-chaap gayab ho jata tha).

import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { getPracticeAnalysis, getPracticeResult } from '@/api/practiceAttempts'
import SectionalSummaryTable from '@/components/practicetest/SectionalSummaryTable'
import WeaknessStrengthPanel from '@/components/practicetest/WeaknessStrengthPanel'
import TimeSplitTable from '@/components/practicetest/TimeSplitTable'
import StrongWeakZones from '@/components/practicetest/StrongWeakZones'
import AttemptCompareTable from '@/components/practicetest/AttemptCompareTable'

export default function PracticeTestAnalysis() {
  const { attemptId } = useParams()
  const navigate = useNavigate()
  const [analysis, setAnalysis] = useState(null)
  const [attemptNumber, setAttemptNumber] = useState(undefined)
  const [error, setError] = useState('')

  const load = useCallback(() => {
    setAnalysis(null)
    setError('')
    getPracticeAnalysis(attemptId)
      .then(setAnalysis)
      .catch((e) => setError(e?.response?.data?.error || 'Analysis load nahi ho paya'))
  }, [attemptId])

  useEffect(() => {
    load()
    getPracticeResult(attemptId).then((r) => setAttemptNumber(r.attemptNumber)).catch(() => {})
  }, [load, attemptId])

  const jumpToQuestion = (qNo) => navigate(`/practice-tests/solutions/${attemptId}?qNo=${qNo}`)

  return (
    <div className="min-h-screen bg-[#0f172a] px-4 py-6 md:px-8 max-w-4xl mx-auto">
      <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-5">
        <Link to="/practice-tests" className="hover:text-slate-300 flex items-center gap-1"><i className="ti ti-home" /> Practice Tests</Link>
        <i className="ti ti-chevron-right text-[10px]" />
        <Link to={`/practice-tests/result/${attemptId}`} className="hover:text-slate-300">Result</Link>
        <i className="ti ti-chevron-right text-[10px]" />
        <span className="text-slate-300 font-semibold">Analysis</span>
      </div>

      <div className="flex items-center justify-between flex-wrap gap-3 mb-5">
        <h1 className="text-2xl font-black text-white flex items-center gap-2">
          <i className="ti ti-chart-bar text-tapasya-orange" /> Test Analysis
        </h1>
        <div className="flex gap-2">
          <button onClick={() => navigate(`/practice-tests/result/${attemptId}`)}
            className="px-3.5 py-2 rounded-lg border border-slate-700 text-slate-300 text-xs font-bold hover:bg-slate-800 flex items-center gap-1">
            <i className="ti ti-arrow-left" /> Result
          </button>
          <button onClick={() => navigate(`/practice-tests/solutions/${attemptId}`)}
            className="px-3.5 py-2 rounded-lg bg-tapasya-orange text-white text-xs font-bold hover:bg-tapasya-orange-dark flex items-center gap-1">
            <i className="ti ti-list-check" /> Solutions
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-5 text-center">
          <p className="text-red-400 text-sm mb-3">{error}</p>
          <button onClick={load} className="px-4 py-2 rounded-lg bg-slate-800 text-slate-200 text-xs font-bold hover:bg-slate-700">Retry</button>
        </div>
      )}

      {!error && !analysis && (
        <div className="space-y-3">
          <div className="h-32 rounded-2xl bg-slate-800/60 animate-pulse" />
          <div className="h-48 rounded-2xl bg-slate-800/60 animate-pulse" />
        </div>
      )}

      {analysis && (
        <div className="space-y-4">
          {analysis.topicBreakdown && (
            <WeaknessStrengthPanel topicBreakdown={analysis.topicBreakdown} onJumpToQuestion={jumpToQuestion} />
          )}
          {analysis.strongWeakZones && <StrongWeakZones strongWeakZones={analysis.strongWeakZones} />}
          {analysis.sectionalSummary && <SectionalSummaryTable sectionalSummary={analysis.sectionalSummary} />}
          {analysis.timeSplit && <TimeSplitTable timeSplit={analysis.timeSplit} />}
          {analysis.attemptCompare && (
            <AttemptCompareTable attemptCompare={analysis.attemptCompare} currentAttemptNumber={attemptNumber} />
          )}
        </div>
      )}
    </div>
  )
}