// src/components/whatsnew/PlaylistAddIllustration.jsx
// Mini replica of AddLinkModal's playlist flow: paste a playlist link,
// it auto-creates a folder named after the playlist.
export default function PlaylistAddIllustration() {
  return (
    <div className="w-full max-w-[240px] mx-auto space-y-2">
      {/* link input */}
      <div className="relative">
        <i className="ti ti-link absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500 text-xs" />
        <div className="pl-7 pr-2 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-[10px] text-slate-400 text-left truncate">
          youtube.com/playlist?list=...
        </div>
      </div>

      {/* auto-folder hint, exactly like AddLinkModal shows */}
      <div className="text-[9px] text-orange-400 bg-orange-500/10 border border-orange-500/20 rounded-lg px-2 py-1.5 flex items-center gap-1.5 text-left">
        <i className="ti ti-folder-plus shrink-0" />
        Playlist ka apna khud ka folder ban jayega
      </div>

      {/* resulting folder card */}
      <div className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg bg-slate-800/60 border border-slate-700/60">
        <i className="ti ti-folder text-orange-400 text-xs" />
        <span className="text-[10px] text-slate-200 truncate">Banking Awareness Playlist</span>
        <span className="ml-auto text-[9px] text-slate-500 shrink-0">12 videos</span>
      </div>
    </div>
  )
}