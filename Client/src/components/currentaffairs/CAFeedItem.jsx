// src/components/currentaffairs/CAFeedItem.jsx
// One current-affairs entry — headline + one-liner fact, category/source
// badges, and (for admins) quick edit/delete. Deliberately no "read full
// article" content beyond a link out — see planning: bite-sized exam-ready
// facts are exactly what's needed, not full articles.
const CATEGORY_COLORS = {
  Banking: '#22d3ee', RBI: '#22d3ee', Appointment: '#a78bfa', Scheme: '#4ade80',
  Award: '#facc15', 'Static-Trigger': '#fb923c', Sports: '#f472b6',
  International: '#60a5fa', National: '#f87171', Economy: '#facc15', Other: '#94a3b8',
}

function fmtDate(d) {
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

export default function CAFeedItem({ item, isAdmin, onEdit, onDelete }) {
  const color = CATEGORY_COLORS[item.category] || '#94a3b8'
  return (
    <div className="bg-[#141d2e] rounded-xl border border-slate-800 p-3.5 hover:border-slate-700 transition-colors">
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ background: `${color}20`, color, border: `1px solid ${color}40` }}>
            {item.category}
          </span>
          <span className="text-[10px] text-slate-500">{item.source}</span>
          <span className="text-[10px] text-slate-600">·</span>
          <span className="text-[10px] text-slate-500">{fmtDate(item.date)}</span>
        </div>
        {isAdmin && (
          <div className="flex items-center gap-1 shrink-0">
            <button onClick={() => onEdit(item)} className="w-6 h-6 rounded-full flex items-center justify-center bg-slate-800 hover:bg-slate-700">
              <i className="ti ti-pencil text-[11px] text-slate-400" />
            </button>
            <button onClick={() => onDelete(item)} className="w-6 h-6 rounded-full flex items-center justify-center bg-red-950/40 hover:bg-red-900/50">
              <i className="ti ti-trash text-[11px] text-red-400" />
            </button>
          </div>
        )}
      </div>
      <p className="text-sm font-semibold text-slate-200 mb-1">{item.headline}</p>
      <p className="text-[12.5px] text-slate-400 leading-relaxed">{item.oneLiner}</p>
      {(item.entity || item.blankableFact) && (
        <div className="mt-2 pt-2 border-t border-slate-800/70 flex flex-wrap gap-x-4 gap-y-1 text-[10.5px] text-slate-500">
          {item.entity && <span><span className="text-slate-600">Entity:</span> {item.entity}</span>}
          {item.blankableFact && <span><span className="text-slate-600">Cloze:</span> {item.blankableFact}</span>}
        </div>
      )}
      {item.sourceUrl && (
        <a href={item.sourceUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[11px] text-cyan-400 hover:text-cyan-300 mt-2">
          Source <i className="ti ti-external-link text-[10px]" />
        </a>
      )}
    </div>
  )
}
