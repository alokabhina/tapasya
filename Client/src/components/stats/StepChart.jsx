// src/components/stats/StepChart.jsx
// Recharts AreaChart step type, cumulative hours orange line
// props: data[] — [{ date: "YYYY-MM-DD", label: "Mon", cumulative: hours }]

import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from 'recharts';

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs shadow-xl">
      <p className="text-slate-400 mb-0.5">{label}</p>
      <p className="text-orange-400 font-medium">{payload[0].value}h total</p>
    </div>
  );
}

export default function StepChart({ data = [] }) {
  if (!data.length) {
    return (
      <div className="flex items-center justify-center h-48 text-slate-600 text-sm">
        No data for this period
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={200}>
      <AreaChart data={data}>
        <defs>
          <linearGradient id="orangeGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%"  stopColor="#f97316" stopOpacity={0.25} />
            <stop offset="95%" stopColor="#f97316" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
        <XAxis
          dataKey="label"
          tick={{ fill: '#64748b', fontSize: 11 }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fill: '#64748b', fontSize: 10 }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v) => `${v}h`}
          width={30}
        />
        <Tooltip content={<CustomTooltip />} />
        <Area
          type="stepAfter"
          dataKey="cumulative"
          stroke="#f97316"
          strokeWidth={2}
          fill="url(#orangeGrad)"
          dot={{ r: 3, fill: '#f97316', strokeWidth: 0 }}
          activeDot={{ r: 5, fill: '#fb923c' }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}