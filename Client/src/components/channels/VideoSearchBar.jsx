// src/components/channels/VideoSearchBar.jsx
// Open video search — type a query, get real YouTube search results (any
// video, not just subscribed channels), tap one to watch it right here.
// Results reuse ChannelFeedGrid's card UI (same shape: videoId, title,
// thumbnail, channelTitle, isLive/isUpcoming, publishedAt) so play +
// "add to watchlist" behave identically to the regular channel feed.
import { useState } from 'react'
import { searchVideos } from '@/api/channels'
import ChannelFeedGrid from './ChannelFeedGrid'
import VideoGridSkeleton from '../watch/VideoGridSkeleton'

export default function VideoSearchBar({ folders = [], onPlay, onAddedToWatchlist, onFolderCreated, onActiveChange }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [searched, setSearched] = useState(false)
  const [activeQuery, setActiveQuery] = useState('')

  async function handleSearch(e) {
    e.preventDefault()
    const q = query.trim()
    if (!q) return
    setSearching(true)
    setSearched(true)
    setActiveQuery(q)
    onActiveChange?.(true)
    try {
      const data = await searchVideos(q)
      setResults(data)
    } catch {
      setResults([])
    } finally {
      setSearching(false)
    }
  }

  function handleClear() {
    setQuery('')
    setResults([])
    setSearched(false)
    setActiveQuery('')
    onActiveChange?.(false)
  }

  return (
    <div className="mb-4">
      <form onSubmit={handleSearch} className="flex gap-2">
        <div className="relative flex-1">
          <i className="ti ti-search absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Koi bhi video search karo (jaise YouTube pe)"
            className="w-full pl-9 pr-9 py-2.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-100 text-sm focus:outline-none focus:border-orange-500"
          />
          {query && (
            <button
              type="button"
              onClick={handleClear}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
            >
              <i className="ti ti-x text-sm" />
            </button>
          )}
        </div>
        <button
          type="submit"
          disabled={searching || !query.trim()}
          className="px-4 py-2.5 rounded-lg bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white text-sm font-medium shrink-0 flex items-center gap-1.5"
        >
          {searching ? <div className="w-3.5 h-3.5 rounded-full border-2 border-white/40 border-t-white animate-spin" /> : <i className="ti ti-search" />}
          <span className="hidden xs:inline">Search</span>
        </button>
      </form>

      {searched && (
        <div className="mt-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs text-slate-500">
              {searching ? 'Search ho raha hai...' : `"${activeQuery}" ke results`}
            </p>
            <button onClick={handleClear} className="text-xs text-orange-400 hover:text-orange-300 flex items-center gap-1">
              <i className="ti ti-arrow-back-up text-sm" /> Feed pe wapas jao
            </button>
          </div>

          {searching ? (
            <VideoGridSkeleton />
          ) : results.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <i className="ti ti-mood-empty text-2xl mb-1 block" />
              <p className="text-sm">Koi video nahi mila, dusra keyword try karo</p>
            </div>
          ) : (
            <ChannelFeedGrid
              feed={results}
              folders={folders}
              onPlay={onPlay}
              onAddedToWatchlist={onAddedToWatchlist}
              onFolderCreated={onFolderCreated}
            />
          )}
        </div>
      )}
    </div>
  )
}