// src/components/whatsnew/FolderPickerIllustration.jsx
// A miniature, non-interactive replica of the actual Channel Feed card +
// folder-picker popover (see ChannelFeedGrid.jsx), used purely to show the
// user where this new control lives without needing a screenshot asset.
export default function FolderPickerIllustration() {
  return (
    <div className="relative w-full max-w-[220px] mx-auto">
      {/* the video card */}
      <div className="rounded-xl overflow-hidden bg-slate-800/60 border border-slate-700/60">
        <div className="relative aspect-video bg-slate-900 flex items-center justify-center">
          <i className="ti ti-player-play-filled text-3xl text-slate-600" />
          <span className="absolute bottom-1.5 right-1.5 px-1.5 py-0.5 rounded bg-black/80 text-[10px] text-white">2h pehle</span>
        </div>
        <div className="p-2">
          <div className="h-2 rounded bg-slate-700 w-[85%] mb-1.5" />
          <div className="h-2 rounded bg-slate-700/60 w-[55%]" />
        </div>
      </div>

      {/* the "+" button, pulsing to draw the eye */}
      <div className="absolute top-1.5 right-1.5 w-7 h-7 rounded-md flex items-center justify-center bg-orange-500 border border-orange-400 shadow-lg shadow-orange-500/30">
        <span className="absolute inset-0 rounded-md bg-orange-500 animate-ping opacity-40" />
        <i className="ti ti-plus text-white text-sm relative" />
      </div>

      {/* the folder popover */}
      <div className="absolute top-9 right-1.5 w-40 rounded-lg bg-slate-900 border border-slate-700 shadow-xl shadow-black/50 overflow-hidden">
        <div className="px-2 py-1 text-[8px] font-semibold text-slate-500 uppercase tracking-wide border-b border-slate-800">
          Konse folder mein?
        </div>
        <div className="py-0.5">
          {['Banking Awareness', 'English Vocab'].map((name, i) => (
            <div key={name} className={`flex items-center gap-1.5 px-2 py-1.5 text-[10px] ${i === 0 ? 'bg-slate-800 text-slate-100' : 'text-slate-300'}`}>
              <i className="ti ti-folder text-orange-400 text-xs" />
              <span className="truncate flex-1">{name}</span>
              {i === 0 && <span className="text-[7px] text-orange-400 shrink-0">default</span>}
            </div>
          ))}
        </div>
        <div className="border-t border-slate-800 px-2 py-1.5 flex items-center gap-1 text-[9px] text-orange-400">
          <i className="ti ti-folder-plus text-xs" /> Naya folder banao
        </div>
      </div>
    </div>
  )
}