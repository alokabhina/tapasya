// src/components/history/HistoryFilters.jsx
// Subject multi-select dropdown + date range inputs + clear button
// emits onFilter({ subjects[], dateRange: { start, end } })
// import subjectStore

import { useState } from 'react';
import { useSubjectStore } from '../../store/subjectStore';

export default function HistoryFilters({ onFilter }) {
  const subjects = useSubjectStore((s) => s.subjects);
  const [selected, setSelected] = useState([]); // subject ids
  const [start, setStart]       = useState('');
  const [end, setEnd]           = useState('');
  const [open, setOpen]         = useState(false);

  function toggleSubject(id) {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  function handleApply() {
    onFilter({
      subjects: selected,
      dateRange: start && end ? { start, end } : null,
    });
    setOpen(false);
  }

  function handleClear() {
    setSelected([]);
    setStart('');
    setEnd('');
    onFilter({ subjects: [], dateRange: null });
    setOpen(false);
  }

  const activeCount = selected.length + (start && end ? 1 : 0);

  return (
    <div className="relative">
      {/* Trigger */}
      <div className="flex items-center gap-2 flex-wrap">
        <button
          onClick={() => setOpen((v) => !v)}
          className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl text-sm text-slate-300 transition-colors"
        >
          <i className="ti ti-filter text-slate-400" />
          Filters
          {activeCount > 0 && (
            <span className="w-5 h-5 rounded-full bg-orange-500 text-white text-[10px] font-bold flex items-center justify-center">
              {activeCount}
            </span>
          )}
        </button>

        {/* Active filter pills */}
        {selected.map((id) => {
          const subj = subjects.find((s) => s.id === id);
          return subj ? (
            <span
              key={id}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium text-white"
              style={{ backgroundColor: subj.color + 'aa' }}
            >
              {subj.name}
              <button onClick={() => toggleSubject(id)} aria-label="Remove filter">
                <i className="ti ti-x text-[10px]" />
              </button>
            </span>
          ) : null;
        })}

        {activeCount > 0 && (
          <button
            onClick={handleClear}
            className="text-xs text-slate-500 hover:text-red-400 transition-colors"
          >
            Clear all
          </button>
        )}
      </div>

      {/* Dropdown panel */}
      {open && (
        <div className="absolute top-full left-0 mt-2 z-30 w-72 bg-[#1a2234] border border-slate-700 rounded-2xl shadow-2xl p-4 space-y-4">
          {/* Subjects */}
          <div>
            <p className="text-[10px] text-slate-500 uppercase tracking-wide mb-2">Subjects</p>
            <div className="space-y-1.5">
              {subjects.map((s) => (
                <label key={s.id} className="flex items-center gap-2.5 cursor-pointer group">
                  <div
                    className={`w-4 h-4 rounded flex items-center justify-center border transition-colors
                      ${selected.includes(s.id)
                        ? 'border-transparent'
                        : 'border-slate-600 bg-transparent'}`}
                    style={selected.includes(s.id) ? { backgroundColor: s.color } : {}}
                  >
                    {selected.includes(s.id) && <i className="ti ti-check text-[9px] text-white" />}
                  </div>
                  <input
                    type="checkbox"
                    className="sr-only"
                    checked={selected.includes(s.id)}
                    onChange={() => toggleSubject(s.id)}
                  />
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color }} />
                  <span className="text-sm text-slate-300 group-hover:text-slate-100 transition-colors">
                    {s.name}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Date range */}
          <div>
            <p className="text-[10px] text-slate-500 uppercase tracking-wide mb-2">Date Range</p>
            <div className="space-y-2">
              <input
                type="date"
                value={start}
                onChange={(e) => setStart(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 text-slate-200 text-xs rounded-lg px-3 py-2 focus:outline-none focus:border-orange-500"
                placeholder="From"
              />
              <input
                type="date"
                value={end}
                onChange={(e) => setEnd(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 text-slate-200 text-xs rounded-lg px-3 py-2 focus:outline-none focus:border-orange-500"
                placeholder="To"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-1">
            <button
              onClick={handleClear}
              className="flex-1 py-2 text-xs text-slate-400 hover:text-slate-200 bg-slate-800 rounded-xl transition-colors"
            >
              Clear
            </button>
            <button
              onClick={handleApply}
              className="flex-1 py-2 text-xs text-white bg-orange-500 hover:bg-orange-600 rounded-xl transition-colors font-medium"
            >
              Apply
            </button>
          </div>
        </div>
      )}
    </div>
  );
}