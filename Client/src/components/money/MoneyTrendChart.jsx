// src/components/money/MoneyTrendChart.jsx
// Income vs expense bars over time — same recharts styling as
// components/stats/BarChart.jsx (dark grid, slate axis text), own
// component since this one has two fixed series (income/expense) instead
// of dynamic per-subject bars.

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { formatMoney } from '@/utils/money'

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-xs shadow-xl space-y-1 min-w-[130px]">
      <p className="text-slate-300 font-medium mb-1">{label}</p>
      {payload.map((p, i) => (
        <div key={i} className="flex items-center justify-between gap-3">
          <span className="text-slate-400 capitalize">{p.dataKey}</span>
          <span style={{ color: p.fill }}>{formatMoney(p.value)}</span>
        </div>
      ))}
    </div>
  )
}

export default function MoneyTrendChart({ data = [] }) {
  if (!data.length) {
    return (
      <div className="flex items-center justify-center h-48 text-slate-600 text-sm">
        No data for this period
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} barGap={2} barCategoryGap="28%">
        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
        <XAxis dataKey="label" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
        <YAxis
          tick={{ fill: '#64748b', fontSize: 10 }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v) => formatMoney(v, true)}
          width={42}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
        <Bar dataKey="income" fill="#10b981" radius={[3, 3, 0, 0]} />
        <Bar dataKey="expense" fill="#f43f5e" radius={[3, 3, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}