// src/components/stats/ScatterChart.jsx
// Recharts ScatterChart, X=time of day (hour), Y=session duration (hours)
// dots colored by subject
// props: data[] — [{ x: hourOfDay (0-24), y: durationSeconds, name, color, date }]

import {
  ScatterChart as ReScatter, Scatter, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { formatHours } from '../../utils/time';

function hourLabel(h) {
  if (h === 0 || h === 24) return '12am';
  if (h === 12) return '12pm';
  return h < 12 ? `${h}am` : `${h - 12}pm`;
}

function CustomTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  if (!d) return null;
  return (
    <div className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs shadow-xl space-y-0.5">
      <div className="flex items-center gap-1.5 mb-1">
        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: d.color }} />
        <span className="text-slate-200 font-medium">{d.name}</span>
      </div>
      <p className="text-slate-400">{d.date}</p>
      <p className="text-slate-400">{hourLabel(Math.round(d.x))}</p>
      <p className="text-orange-400">{formatHours(d.y * 3600)}</p>
    </div>
  );
}

// Group by subject for multiple Scatter series (each gets its own color)
function groupBySubject(data) {
  const map = {};
  data.forEach((d) => {
    if (!map[d.name]) map[d.name] = { name: d.name, color: d.color, points: [] };
    map[d.name].points.push({ ...d, y: Math.round(d.y / 360) / 10 }); // convert to hours
  });
  return Object.values(map);
}

export default function ScatterChart({ data = [] }) {
  if (!data.length) {
    return (
      <div className="flex items-center justify-center h-48 text-slate-600 text-sm">
        No data for this period
      </div>
    );
  }

  const groups = groupBySubject(data);

  return (
    <ResponsiveContainer width="100%" height={220}>
      <ReScatter width={400} height={220}>
        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
        <XAxis
          type="number"
          dataKey="x"
          domain={[0, 24]}
          ticks={[0, 6, 12, 18, 24]}
          tickFormatter={hourLabel}
          tick={{ fill: '#64748b', fontSize: 10 }}
          axisLine={false}
          tickLine={false}
          name="Time of Day"
        />
        <YAxis
          type="number"
          dataKey="y"
          tick={{ fill: '#64748b', fontSize: 10 }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v) => `${v}h`}
          width={28}
          name="Duration"
        />
        <Tooltip content={<CustomTooltip />} cursor={{ strokeDasharray: '3 3' }} />
        {groups.map((g) => (
          <Scatter
            key={g.name}
            name={g.name}
            data={g.points}
            fill={g.color || '#f97316'}
            opacity={0.85}
          />
        ))}
      </ReScatter>
    </ResponsiveContainer>
  );
}