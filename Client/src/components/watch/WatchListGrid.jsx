// src/components/watch/WatchListGrid.jsx
// Groups items by their folder (populated from the backend — item.folderId
// is either an object { _id, name } when populated, or just an id string).
// Each folder group can be collapsed/expanded. Also supports a quick
// client-side search + sort toolbar since everything is already loaded.
import { useMemo, useState } from 'react'
import VideoCard from './VideoCard'

const SORTS = [
  { id: 'recent',    label: 'Recently added', icon: 'ti-clock' },
  { id: 'incomplete', label: 'Unwatched first', icon: 'ti-player-play' },
  { id: 'title',     label: 'Title A-Z',       icon: 'ti-sort-ascending-letters' },
]

export default function WatchListGrid({
  items, onPlay, onToggleComplete, onShare, onDelete,
  selectMode = false, selectedIds = new Set(), onToggleSelect,
}) {
  // Folders start collapsed by default — user taps to open the ones they want.
  const [expanded, setExpanded] = useState(new Set())
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState('recent')

  const filtered = useMemo(() => {
    let list = items
    if (query.trim()) {
      const q = query.trim().toLowerCase()
      list = list.filter((i) =>
        i.title?.toLowerCase().includes(q) || i.channelTitle?.toLowerCase().includes(q))
    }
    list = [...list]
    if (sort === 'title') {
      list.sort((a, b) => (a.title || '').localeCompare(b.title || ''))
    } else if (sort === 'incomplete') {
      list.sort((a, b) => Number(a.completed) - Number(b.completed))
    } else {
      list.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
    }
    return list
  }, [items, query, sort])

  if (!items.length) {
    return (
      <div className="text-center py-16 text-slate-500">
        <div className="w-16 h-16 rounded-2xl bg-slate-800/60 border border-slate-700/60 flex items-center justify-center mx-auto mb-3">
          <i className="ti ti-video-off text-3xl" />
        </div>
        <p className="text-sm font-medium text-slate-400">Abhi koi video nahi hai</p>
        <p className="text-xs text-slate-600 mt-1">"+ Add Link" se shuru karo</p>
      </div>
    )
  }

  const byFolder = {}
  for (const item of filtered) {
    const folder = item.folderId
    const key = folder?._id || folder || 'unknown'
    if (!byFolder[key]) byFolder[key] = { name: folder?.name || 'Other', items: [] }
    byFolder[key].items.push(item)
  }
  const folderEntries = Object.entries(byFolder)

  function toggleFolder(folderId) {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(folderId)) next.delete(folderId)
      else next.add(folderId)
      return next
    })
  }

  return (
    <div className="space-y-6">
      {/* Search + sort toolbar */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[160px]">
          <i className="ti ti-search absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search in your watchlist..."
            className="w-full pl-9 pr-8 py-2 rounded-lg bg-slate-800/60 border border-slate-700/60 text-slate-200 text-sm placeholder:text-slate-500 focus:outline-none focus:border-orange-500/60"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
            >
              <i className="ti ti-x text-sm" />
            </button>
          )}
        </div>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value)}
          className="px-2.5 py-2 rounded-lg bg-slate-800/60 border border-slate-700/60 text-slate-300 text-xs sm:text-sm focus:outline-none focus:border-orange-500/60"
        >
          {SORTS.map((s) => (
            <option key={s.id} value={s.id}>{s.label}</option>
          ))}
        </select>
      </div>

      {query && !filtered.length ? (
        <div className="text-center py-12 text-slate-500">
          <i className="ti ti-mood-empty text-3xl mb-2 block" />
          <p className="text-sm">"{query}" ke liye kuch nahi mila</p>
        </div>
      ) : (
        folderEntries.map(([folderId, group]) => {
          // While searching, auto-expand every folder so matches are visible.
          const isCollapsed = query.trim() ? false : !expanded.has(folderId)
          const doneCount = group.items.filter((i) => i.completed).length
          return (
            <div key={folderId}>
              <button
                type="button"
                onClick={() => toggleFolder(folderId)}
                className="w-full flex items-center gap-2 mb-2 text-left group"
              >
                <i className={`ti ${isCollapsed ? 'ti-chevron-right' : 'ti-chevron-down'} text-slate-500 text-base transition-transform`} />
                <i className="ti ti-folder text-orange-500 text-base" />
                <h4 className="text-sm font-semibold text-slate-300 group-hover:text-slate-100">
                  {group.name}
                </h4>
                <span className="text-slate-600 font-normal text-sm">({group.items.length})</span>
                {doneCount > 0 && (
                  <span className="ml-auto text-[11px] text-green-500/80 font-medium hidden sm:inline">
                    {doneCount}/{group.items.length} done
                  </span>
                )}
              </button>

              {!isCollapsed && (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                  {group.items.map((item, idx) => (
                    <div key={item._id} className="animate-fade-in-up" style={{ animationDelay: `${Math.min(idx, 8) * 30}ms` }}>
                      <VideoCard
                        item={item}
                        onPlay={onPlay}
                        onToggleComplete={onToggleComplete}
                        onShare={onShare}
                        onDelete={onDelete}
                        selectMode={selectMode}
                        selected={selectedIds.has(item._id)}
                        onToggleSelect={onToggleSelect}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })
      )}
    </div>
  )
}