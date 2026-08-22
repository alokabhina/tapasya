// src/components/classnotes/NoteCard.jsx
export default function NoteCard({ note, isAdmin, onDelete }) {
  return (
    <div className="bg-[#141d2e] rounded-xl border border-slate-800 p-3.5">
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <div>
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-violet-500/15 text-violet-400 border border-violet-500/30">
            {note.subject}
          </span>
          <span className="text-[10px] text-slate-500 ml-2">{new Date(note.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
        </div>
        {isAdmin && (
          <button onClick={() => onDelete(note)} className="w-6 h-6 rounded-full flex items-center justify-center bg-red-950/40 hover:bg-red-900/50 shrink-0">
            <i className="ti ti-trash text-[11px] text-red-400" />
          </button>
        )}
      </div>
      <p className="text-sm font-semibold text-slate-200 mb-1">{note.topic}</p>
      {note.summary && <p className="text-[12.5px] text-slate-400 mb-2">{note.summary}</p>}

      {note.keyPoints?.length > 0 && (
        <ul className="space-y-1 mb-2">
          {note.keyPoints.map((kp, i) => (
            <li key={i} className="text-[12px] text-slate-300 flex gap-1.5">
              <span className="text-violet-400 shrink-0">•</span> {kp}
            </li>
          ))}
        </ul>
      )}

      {note.definitions?.length > 0 && (
        <div className="mt-2 pt-2 border-t border-slate-800/70 space-y-1">
          {note.definitions.map((d, i) => (
            <p key={i} className="text-[11.5px] text-slate-500"><span className="text-slate-300 font-medium">{d.term}:</span> {d.meaning}</p>
          ))}
        </div>
      )}
    </div>
  )
}
