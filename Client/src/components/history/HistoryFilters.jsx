// src/components/history/HistoryFilters.jsx
// Redesign: Sleek dark dropdown — subject multi-select + date range
// emits onFilter({ subjects[], dateRange: { start, end } | null })

import { useState, useEffect, useRef } from 'react';
import { useSubjectStore } from '../../store/subjectStore';

export default function HistoryFilters({ onFilter }) {
  const subjects   = useSubjectStore((s) => s.subjects);
  const [selected, setSelected] = useState([]);
  const [start, setStart]       = useState('');
  const [end, setEnd]           = useState('');
  const [open, setOpen]         = useState(false);
  const ref = useRef(null);

  // Close on outside click
  useEffect(() => {
    function handler(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

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
    <div className="relative" ref={ref}>

      {/* Trigger button */}
      <button
        onClick={() => setOpen((v) => !v)}
        className={[
          'flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all border',
          open || activeCount > 0
            ? 'bg-orange-500/10 border-orange-500/40 text-orange-400'
            : 'bg-[#0d1520] border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-300',
        ].join(' ')}
      >
        <i className="ti ti-adjustments-horizontal text-sm" />
        Filters
        {activeCount > 0 && (
          <span className="w-5 h-5 rounded-full bg-orange-500 text-white text-[10px] font-bold flex items-center justify-center">
            {activeCount}
          </span>
        )}
      </button>

      {/* Active filter pills (outside dropdown) */}
      {selected.length > 0 && (
        <div className="absolute top-full left-0 mt-2 flex flex-wrap gap-1.5 z-20">
          {selected.map((id) => {
            const subj = subjects.find((s) => s.id === id);
            return subj ? (
              <span
                key={id}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium text-white"
                style={{ backgroundColor: subj.color + 'bb' }}
              >
                {subj.name}
                <button onClick={() => toggleSubject(id)} aria-label="Remove">
                  <i className="ti ti-x text-[10px]" />
                </button>
              </span>
            ) : null;
          })}
          <button
            onClick={handleClear}
            className="text-[11px] text-slate-600 hover:text-red-400 px-1 transition-colors"
          >
            Clear all
          </button>
        </div>
      )}

      {/* Dropdown */}
      {open && (
        <div className="absolute top-full right-0 mt-2 z-40 w-72 bg-[#0d1520] border border-slate-800 rounded-2xl shadow-2xl shadow-black/60 overflow-hidden">

          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest">Filters</p>
            <button onClick={handleClear} className="text-[11px] text-slate-600 hover:text-red-400 transition-colors">
              Reset
            </button>
          </div>

          <div className="px-4 py-3 space-y-5">

            {/* Subjects */}
            <div>
              <p className="text-[10px] text-slate-600 uppercase tracking-widest mb-2.5 font-semibold">Subjects</p>
              <div className="space-y-0.5">
                {subjects.length === 0 && (
                  <p className="text-xs text-slate-600 italic">No subjects added yet</p>
                )}
                {subjects.map((s) => {
                  const active = selected.includes(s.id);
                  return (
                    <button
                      key={s.id}
                      onClick={() => toggleSubject(s.id)}
                      className={[
                        'w-full flex items-center gap-3 px-3 py-2 rounded-xl transition-all text-left',
                        active ? 'bg-slate-800/80' : 'hover:bg-slate-800/40',
                      ].join(' ')}
                    >
                      {/* Custom checkbox */}
                      <div
                        className="w-4 h-4 rounded flex items-center justify-center flex-shrink-0 border transition-all"
                        style={
                          active
                            ? { backgroundColor: s.color, borderColor: s.color }
                            : { borderColor: '#334155', backgroundColor: 'transparent' }
                        }
                      >
                        {active && <i className="ti ti-check text-white" style={{ fontSize: 9 }} />}
                      </div>

                      {/* Color dot */}
                      <div
                        className="w-2 h-2 rounded-full flex-shrink-0"
                        style={{ backgroundColor: s.color }}
                      />

                      <span className="text-sm text-slate-300 flex-1 truncate">{s.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Date range */}
            <div>
              <p className="text-[10px] text-slate-600 uppercase tracking-widest mb-2.5 font-semibold">Date Range</p>
              <div className="space-y-2">
                <div className="relative">
                  <i className="ti ti-calendar-event absolute left-3 top-1/2 -translate-y-1/2 text-slate-600 text-xs" />
                  <input
                    type="date"
                    value={start}
                    onChange={(e) => setStart(e.target.value)}
                    className="w-full bg-slate-800/60 border border-slate-700/60 text-slate-300 text-xs rounded-xl pl-8 pr-3 py-2.5 focus:outline-none focus:border-orange-500/60 transition-colors"
                  />
                </div>
                <div className="relative">
                  <i className="ti ti-calendar-event absolute left-3 top-1/2 -translate-y-1/2 text-slate-600 text-xs" />
                  <input
                    type="date"
                    value={end}
                    onChange={(e) => setEnd(e.target.value)}
                    className="w-full bg-slate-800/60 border border-slate-700/60 text-slate-300 text-xs rounded-xl pl-8 pr-3 py-2.5 focus:outline-none focus:border-orange-500/60 transition-colors"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Footer actions */}
          <div className="flex gap-2 px-4 pb-4">
            <button
              onClick={handleClear}
              className="flex-1 py-2.5 text-xs text-slate-500 hover:text-slate-300 bg-slate-800/60 rounded-xl transition-colors font-medium"
            >
              Clear
            </button>
            <button
              onClick={handleApply}
              className="flex-1 py-2.5 text-xs text-white font-semibold bg-orange-500 hover:bg-orange-600 rounded-xl transition-colors shadow-lg shadow-orange-500/25"
            >
              Apply Filters
            </button>
          </div>
        </div>
      )}
    </div>
  );
}