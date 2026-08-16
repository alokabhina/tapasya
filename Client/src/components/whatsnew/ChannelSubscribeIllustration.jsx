// src/components/whatsnew/ChannelSubscribeIllustration.jsx
// Mini replica of the Channel Feed's search bar + subscribe row
// (see ChannelSearchBar.jsx), just to show where this feature lives.
export default function ChannelSubscribeIllustration() {
  return (
    <div className="w-full max-w-[240px] mx-auto space-y-2">
      {/* search input */}
      <div className="relative">
        <i className="ti ti-brand-youtube absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500 text-xs" />
        <div className="pl-7 pr-2 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-[10px] text-slate-400 text-left">
          Physics Wallah
        </div>
      </div>

      {/* result row with Subscribe button */}
      <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-slate-800/60 border border-slate-700/60">
        <div className="w-6 h-6 rounded-full bg-slate-700 shrink-0" />
        <span className="flex-1 text-[10px] text-slate-200 truncate text-left">Physics Wallah</span>
        <span className="text-[9px] px-2 py-1 rounded-md bg-orange-500/15 border border-orange-500/30 text-orange-400 flex items-center gap-1 shrink-0">
          <i className="ti ti-plus text-[9px]" /> Subscribe
        </span>
      </div>

      {/* resulting feed videos trickling in */}
      <div className="flex items-center gap-1.5 pt-0.5">
        <i className="ti ti-rss text-orange-400 text-xs" />
        <span className="text-[9px] text-slate-500">Naye videos apne aap feed mein aayenge</span>
      </div>
    </div>
  )
}