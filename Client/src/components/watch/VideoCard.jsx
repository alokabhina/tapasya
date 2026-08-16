// src/components/watch/VideoCard.jsx
function formatDuration(sec = 0) {
  if (!sec) return ''
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  const s = Math.floor(sec % 60)
  if (h) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return `${m}:${String(s).padStart(2, '0')}`
}

export default function VideoCard({
  item, onPlay, onToggleComplete, onShare, onDelete,
  selectMode = false, selected = false, onToggleSelect,
}) {
  function handleThumbClick() {
    if (selectMode) onToggleSelect(item)
    else onPlay(item)
  }

  const progressPct = !item.completed && item.durationSec > 0
    ? Math.min(100, Math.round(((item.watchedSeconds || 0) / item.durationSec) * 100))
    : 0
  const hasProgress = progressPct >= 3

  return (
    <div
      className={`group relative rounded-xl overflow-hidden bg-slate-800/60 border transition-all duration-200 ${
        selectMode && selected
          ? 'border-orange-500 ring-1 ring-orange-500 scale-[0.98]'
          : 'border-slate-700/60 hover:border-orange-500/50 hover:shadow-lg hover:shadow-orange-500/5 hover:-translate-y-0.5'
      }`}
    >
      <button onClick={handleThumbClick} className="relative block w-full aspect-video bg-slate-900 overflow-hidden">
        {item.thumbnail ? (
          <img
            src={item.thumbnail}
            alt={item.title}
            loading="lazy"
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-slate-600">
            <i className="ti ti-video text-3xl" />
          </div>
        )}

        {item.completed && (
          <div className="absolute inset-0 bg-black/40" />
        )}

        {item.durationSec > 0 && (
          <span className="absolute bottom-1.5 right-1.5 px-1.5 py-0.5 rounded bg-black/80 text-[11px] text-white font-medium tabular-nums">
            {formatDuration(item.durationSec)}
          </span>
        )}

        {/* watch progress bar */}
        {hasProgress && (
          <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-black/50">
            <div className="h-full bg-orange-500" style={{ width: `${progressPct}%` }} />
          </div>
        )}

        <div className={`absolute inset-0 flex items-center justify-center transition-opacity bg-black/30 ${
          selectMode ? (selected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100') : 'opacity-0 group-hover:opacity-100'
        }`}>
          {selectMode ? (
            <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-colors ${
              selected ? 'bg-orange-500 border-orange-500' : 'border-white bg-black/40'
            }`}>
              {selected && <i className="ti ti-check text-white" />}
            </div>
          ) : (
            <div className="w-11 h-11 rounded-full bg-orange-500/90 flex items-center justify-center shadow-lg scale-90 group-hover:scale-100 transition-transform">
              <i className="ti ti-player-play-filled text-xl text-white" />
            </div>
          )}
        </div>
      </button>

      {/* complete checkbox — always shown */}
      <button
        onClick={() => onToggleComplete(item)}
        title={item.completed ? 'Mark as not watched' : 'Mark as watched'}
        className={`absolute top-1.5 left-1.5 w-6 h-6 rounded-md flex items-center justify-center border transition-colors ${
          item.completed
            ? 'bg-green-500/90 border-green-400'
            : 'bg-black/70 border-white/20 hover:bg-black/90'
        }`}
      >
        {item.completed
          ? <i className="ti ti-check text-white text-sm" />
          : <div className="w-3 h-3 rounded-sm border border-slate-300" />}
      </button>

      {/* top-right: menu (normal mode) or nothing (select mode — whole thumb click selects) */}
      {!selectMode && (
        <div className="absolute top-1.5 right-1.5">
          <details className="relative">
            <summary className="list-none w-6 h-6 rounded-md flex items-center justify-center bg-black/70 border border-white/20 cursor-pointer hover:bg-black/90">
              <i className="ti ti-dots-vertical text-white text-sm" />
            </summary>
            <div className="absolute right-0 mt-1 w-32 rounded-lg bg-slate-800 border border-slate-700 shadow-xl overflow-hidden z-10">
              <button
                onClick={() => onShare(item)}
                className="w-full text-left px-3 py-2 text-xs text-slate-200 hover:bg-slate-700 flex items-center gap-2"
              >
                <i className="ti ti-share-2" /> Share
              </button>
              <button
                onClick={() => onDelete(item)}
                className="w-full text-left px-3 py-2 text-xs text-red-400 hover:bg-slate-700 flex items-center gap-2"
              >
                <i className="ti ti-trash" /> Remove
              </button>
            </div>
          </details>
        </div>
      )}

      <div className="p-2">
        <p className={`text-xs line-clamp-2 leading-snug ${item.completed ? 'text-slate-500' : 'text-slate-200'}`}>
          {item.title}
        </p>
        <div className="flex items-center justify-between mt-1 gap-1">
          <p className="text-[11px] text-slate-500 truncate">{item.channelTitle}</p>
          {item.completed && (
            <span className="shrink-0 text-[10px] text-green-400 flex items-center gap-0.5">
              <i className="ti ti-check text-[10px]" /> Done
            </span>
          )}
        </div>
      </div>
    </div>
  )
}