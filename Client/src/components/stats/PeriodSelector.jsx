// src/components/stats/PeriodSelector.jsx
// Day / Week / Month / Custom tabs
// Custom = date range picker, emits onChange({ period, startDate, endDate })

import { useState } from 'react';

const PERIODS = ['Day', 'Week', 'Month', 'Custom'];

export default function PeriodSelector({ onChange }) {
  const [active, setActive] = useState('Week');
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');

  function handleTab(period) {
    setActive(period);
    if (period !== 'Custom') {
      onChange({ period, startDate: null, endDate: null });
    }
  }

  function handleApply() {
    if (start && end) {
      onChange({ period: 'Custom', startDate: start, endDate: end });
    }
  }

  return (
    <div className="space-y-3">
      {/* Tab row */}
      <div className="flex gap-1 p-1 bg-slate-800/60 rounded-xl w-fit">
        {PERIODS.map((p) => (
          <button
            key={p}
            onClick={() => handleTab(p)}
            className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-all
              ${active === p
                ? 'bg-orange-500 text-white shadow'
                : 'text-slate-400 hover:text-slate-200'}`}
          >
            {p}
          </button>
        ))}
      </div>

      {/* Custom date range */}
      {active === 'Custom' && (
        <div className="flex items-center gap-2 flex-wrap">
          <input
            type="date"
            value={start}
            onChange={(e) => setStart(e.target.value)}
            className="bg-slate-800 border border-slate-700 text-slate-200 text-xs rounded-lg px-3 py-2
                       focus:outline-none focus:border-orange-500"
          />
          <span className="text-slate-500 text-xs">to</span>
          <input
            type="date"
            value={end}
            onChange={(e) => setEnd(e.target.value)}
            className="bg-slate-800 border border-slate-700 text-slate-200 text-xs rounded-lg px-3 py-2
                       focus:outline-none focus:border-orange-500"
          />
          <button
            onClick={handleApply}
            disabled={!start || !end}
            className="px-4 py-2 bg-orange-500 hover:bg-orange-600 disabled:opacity-40 text-white
                       text-xs font-medium rounded-lg transition-colors"
          >
            Apply
          </button>
        </div>
      )}
    </div>
  );
}