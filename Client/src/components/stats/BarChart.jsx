// src/components/stats/BarChart.jsx
// Recharts BarChart stacked, X=days, Y=hours, 7 days always shown (0 fill), custom tooltip
// props: data[] — [{ date: "YYYY-MM-DD", label: "Mon", subjects: [{ name, value, color }] }]

import {
  BarChart as ReBarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import { formatHours } from '../../utils/time';

// Flatten data for Recharts stacked bars — each subject becomes its own dataKey
function flattenData(data) {
  // Collect all unique subjects across all days
  const subjectMap = {};
  data.forEach((day) => {
    (day.subjects || []).forEach((s) => {
      if (!subjectMap[s.name]) subjectMap[s.name] = s.color;
    });
  });

  const subjects = Object.keys(subjectMap);

  const flat = data.map((day) => {
    const row = { date: day.date, label: day.label };
    subjects.forEach((name) => {
      const found = (day.subjects || []).find((s) => s.name === name);
      row[name] = found ? Math.round(found.value / 3600 * 10) / 10 : 0;
    });
    return row;
  });

  return { flat, subjects, subjectMap };
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const total = payload.reduce((s, p) => s + (p.value || 0), 0);
  return (
    <div className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-xs shadow-xl space-y-1 min-w-[120px]">
      <p className="text-slate-300 font-medium mb-1">{label}</p>
      {payload.filter(p => p.value > 0).map((p, i) => (
        <div key={i} className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.fill }} />
            <span className="text-slate-400">{p.dataKey}</span>
          </div>
          <span className="text-slate-200">{p.value}h</span>
        </div>
      ))}
      <div className="border-t border-slate-700 pt-1 mt-1 flex justify-between">
        <span className="text-slate-500">Total</span>
        <span className="text-orange-400 font-medium">{Math.round(total * 10) / 10}h</span>
      </div>
    </div>
  );
}

export default function BarChart({ data = [] }) {
  if (!data.length) {
    return (
      <div className="flex items-center justify-center h-48 text-slate-600 text-sm">
        No data for this period
      </div>
    );
  }

  const { flat, subjects, subjectMap } = flattenData(data);

  return (
    <ResponsiveContainer width="100%" height={220}>
      <ReBarChart data={flat} barSize={24} barCategoryGap="28%">
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
          width={28}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
        {subjects.map((name, i) => (
          <Bar
            key={name}
            dataKey={name}
            stackId="a"
            fill={subjectMap[name] || '#f97316'}
            radius={i === subjects.length - 1 ? [3, 3, 0, 0] : [0, 0, 0, 0]}
          />
        ))}
      </ReBarChart>
    </ResponsiveContainer>
  );
}