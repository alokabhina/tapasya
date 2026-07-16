// src/components/money/MoneyCategoryChart.jsx
// Category-wise donut — same visual language as components/stats/DonutChart.jsx
// (recharts donut + legend below), but its own small component since the
// study version formats seconds/hours and this one formats ₹.

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import { formatMoney } from '@/utils/money'

function CustomTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return (
    <div className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs shadow-xl">
      <p className="text-slate-200 font-medium">{d.name}</p>
      <p style={{ color: d.color }}>{formatMoney(d.value)}</p>
      <p className="text-slate-500">{d.pct}%</p>
    </div>
  )
}

export default function MoneyCategoryChart({ data = [] }) {
  if (!data.length) {
    return (
      <div className="flex items-center justify-center h-48 text-slate-600 text-sm">
        No data for this period
      </div>
    )
  }

  const total = data.reduce((s, d) => s + d.value, 0)
  const withPct = data.map((d) => ({
    ...d,
    pct: total > 0 ? Math.round((d.value / total) * 100) : 0,
  }))

  return (
    <div className="space-y-4">
      <div className="relative" style={{ height: 200 }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={withPct} dataKey="value" nameKey="name" innerRadius={55} outerRadius={80} paddingAngle={2}>
              {withPct.map((d, i) => <Cell key={i} fill={d.color} stroke="none" />)}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <p className="text-[10px] text-slate-500 uppercase tracking-wider">Total</p>
          <p className="text-lg font-black text-slate-200">{formatMoney(total, true)}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {withPct.map((d) => (
          <div key={d.name} className="flex items-center gap-2 text-xs">
            <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: d.color }} />
            <span className="text-slate-400 truncate flex-1">{d.name}</span>
            <span className="text-slate-300 font-medium shrink-0">{d.pct}%</span>
          </div>
        ))}
      </div>
    </div>
  )
}