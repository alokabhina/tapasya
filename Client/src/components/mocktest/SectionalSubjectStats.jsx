// src/components/mocktest/SectionalSubjectStats.jsx
// Self-contained mini-dashboard for ONE subject inside the Sectional Tests
// tab — its own stat tiles, trend, and weak/strong topics, scoped entirely
// to that subject's own attempts. Shown when a specific subject pill is
// selected (not "All").
import { colorForSection, SECTIONAL_ACCURACY_COLOR } from '@/utils/sectionColors'
import ScoreTrendChart from './ScoreTrendChart'
import WeakTopicsList from './WeakTopicsList'

function StatTile({ label, value, color }) {
  return (
    <div className="rounded-xl bg-slate-800/50 border border-slate-800 p-3">
      <p className="text-[10px] text-slate-500">{label}</p>
      <p className="text-lg font-bold tabular-nums" style={color ? { color } : undefined}>{value}</p>
    </div>
  )
}

export default function SectionalSubjectStats({ sectionName, data, examName }) {
  if (!data) {
    return (
      <div className="mb-5 rounded-2xl border border-slate-800 p-6 text-center">
        <p className="text-xs text-slate-600">Abhi "{sectionName}" ke liye koi sectional result nahi hai</p>
      </div>
    )
  }

  const color = colorForSection(sectionName)

  return (
    <div className="space-y-4 mb-5">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatTile label="Attempts" value={data.totalAttempts} />
        <StatTile label="Best Score" value={data.bestScore ?? '—'} color={color} />
        <StatTile label="Avg Score" value={data.avgScore ?? '—'} />
        <StatTile label="Avg Accuracy" value={data.avgAccuracy != null ? `${data.avgAccuracy}%` : '—'} color={SECTIONAL_ACCURACY_COLOR} />
      </div>

      <div className="rounded-2xl border border-slate-800 p-4">
        <p className="text-sm font-semibold text-slate-200 mb-3 flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full" style={{ background: color }} /> {sectionName} Trend
        </p>
        <ScoreTrendChart
          trend={data.trend}
          scoreColor={color}
          accuracyColor={SECTIONAL_ACCURACY_COLOR}
          scoreLabel={`${sectionName} Score %`}
          emptyMessage={`Kam se kam 2 "${sectionName}" results chahiye trend dekhne ke liye`}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="rounded-2xl border border-slate-800 p-4">
          <p className="text-sm font-semibold text-slate-200 mb-3 flex items-center gap-1.5">
            <i className="ti ti-alert-triangle text-red-400 text-sm" /> Weak Topics
          </p>
          <WeakTopicsList topics={data.weakTopics} variant="weak" examName={examName} />
        </div>
        <div className="rounded-2xl border border-slate-800 p-4">
          <p className="text-sm font-semibold text-slate-200 mb-3 flex items-center gap-1.5">
            <i className="ti ti-thumb-up text-green-400 text-sm" /> Strong Topics
          </p>
          <WeakTopicsList topics={data.strongTopics} variant="strong" examName={examName} />
        </div>
      </div>
    </div>
  )
}