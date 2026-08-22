// src/components/currentaffairs/CAFilters.jsx
export default function CAFilters({ months, categories, filters, onChange }) {
  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <i className="ti ti-search absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm" />
          <input
            value={filters.q}
            onChange={(e) => onChange({ ...filters, q: e.target.value })}
            placeholder="Search..."
            className="w-full h-9 pl-9 pr-3 rounded-lg bg-[#141d2e] border border-slate-800 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-cyan-500/40"
          />
        </div>
        <select
          value={filters.month}
          onChange={(e) => onChange({ ...filters, month: e.target.value })}
          className="h-9 px-2 rounded-lg bg-[#141d2e] border border-slate-800 text-sm text-slate-200 focus:outline-none"
        >
          <option value="">All months</option>
          {months.map((m) => <option key={m} value={m}>{m}</option>)}
        </select>
      </div>

      <div className="flex items-center gap-1.5 flex-wrap">
        <button
          onClick={() => onChange({ ...filters, category: '' })}
          className={`px-2.5 py-1 rounded-full text-[11px] font-medium border ${!filters.category ? 'bg-cyan-500/20 border-cyan-500/40 text-cyan-400' : 'bg-slate-800/60 border-slate-700 text-slate-400'}`}
        >
          All
        </button>
        {categories.map((c) => (
          <button
            key={c}
            onClick={() => onChange({ ...filters, category: filters.category === c ? '' : c })}
            className={`px-2.5 py-1 rounded-full text-[11px] font-medium border ${filters.category === c ? 'bg-cyan-500/20 border-cyan-500/40 text-cyan-400' : 'bg-slate-800/60 border-slate-700 text-slate-400'}`}
          >
            {c}
          </button>
        ))}
      </div>
    </div>
  )
}