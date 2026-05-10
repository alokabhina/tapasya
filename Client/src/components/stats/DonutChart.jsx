// src/components/stats/DonutChart.jsx
// Recharts PieChart donut, subject colors, center label total hours, legend below
// props: data[] — [{ name, value (seconds), color }]

import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
} from 'recharts';
import { formatHours } from '../../utils/time';

function CustomTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs shadow-xl">
      <p className="text-slate-200 font-medium">{d.name}</p>
      <p className="text-orange-400">{formatHours(d.value)}</p>
      <p className="text-slate-500">{d.pct}%</p>
    </div>
  );
}

export default function DonutChart({ data = [] }) {
  if (!data.length) {
    return (
      <div className="flex items-center justify-center h-48 text-slate-600 text-sm">
        No data for this period
      </div>
    );
  }

  const total = data.reduce((s, d) => s + d.value, 0);
  const withPct = data.map((d) => ({
    ...d,
    pct: total > 0 ? Math.round((d.value / total) * 100) : 0,
  }));

  return (
    <div className="space-y-4">
      {/* Donut */}
      <div className="relative" style={{ height: 200 }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={withPct}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={88}
              paddingAngle={2}
              dataKey="value"
            >
              {withPct.map((entry, i) => (
                <Cell key={i} fill={entry.color || '#f97316'} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>

        {/* Center label */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <p className="text-orange-400 text-xl font-bold font-timer">
            {formatHours(total)}
          </p>
          <p className="text-slate-500 text-[10px] mt-0.5">Total</p>
        </div>
      </div>

      {/* Legend */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
        {withPct.map((d, i) => (
          <div key={i} className="flex items-center gap-2 min-w-0">
            <span
              className="w-2.5 h-2.5 rounded-full flex-shrink-0"
              style={{ backgroundColor: d.color || '#f97316' }}
            />
            <span className="text-xs text-slate-400 truncate">{d.name}</span>
            <span className="text-xs text-slate-500 ml-auto flex-shrink-0">{d.pct}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}