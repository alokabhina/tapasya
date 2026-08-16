// src/components/channels/ChannelSearchBar.jsx
import { useEffect, useState } from 'react'
import { searchChannels, subscribeChannel } from '@/api/channels'
import { getFolders } from '@/api/folders'
import FolderSelect from '../watch/FolderSelect'

export default function ChannelSearchBar({ onSubscribed, onToast }) {
  const [folders, setFolders] = useState([])
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [searched, setSearched] = useState(false)
  const [folderId, setFolderId] = useState('')
  const [subscribingId, setSubscribingId] = useState(null)

  useEffect(() => {
    getFolders().then((f) => {
      setFolders(f)
      if (f.length) setFolderId(f[0]._id)
    }).catch(() => {})
  }, [])

  async function handleSearch(e) {
    e.preventDefault()
    if (!query.trim()) return
    setSearching(true)
    setSearched(true)
    try {
      const data = await searchChannels(query.trim())
      setResults(data)
    } catch {
      setResults([])
    } finally {
      setSearching(false)
    }
  }

  async function handleSubscribe(channel) {
    if (!folderId) {
      onToast ? onToast('Pehle folder select karo (ya naya banao)', 'error') : alert('Pehle folder select karo (ya naya banao)')
      return
    }
    setSubscribingId(channel.channelId)
    try {
      await subscribeChannel({ ...channel, folderId })
      onSubscribed?.()
      onToast?.(`Subscribed to ${channel.channelTitle}`, 'success')
      setResults((prev) => prev.filter((c) => c.channelId !== channel.channelId))
    } catch (e) {
      const msg = e?.response?.data?.error || 'Subscribe nahi ho paya'
      onToast ? onToast(msg, 'error') : alert(msg)
    } finally {
      setSubscribingId(null)
    }
  }

  return (
    <div className="mb-4">
      <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-2 mb-2">
        <div className="relative flex-1">
          <i className="ti ti-brand-youtube absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Channel search karo (e.g. Physics Wallah)"
            className="w-full pl-9 pr-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-100 text-sm focus:outline-none focus:border-orange-500"
          />
        </div>
        <div className="flex gap-2">
          <div className="w-40">
            <FolderSelect
              folders={folders}
              value={folderId}
              onChange={setFolderId}
              onFolderCreated={(f) => setFolders((prev) => [...prev, f])}
            />
          </div>
          <button
            type="submit"
            disabled={searching || !query.trim()}
            className="px-4 py-2 rounded-lg bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white text-sm font-medium shrink-0 flex items-center gap-1.5"
          >
            {searching ? <div className="w-3.5 h-3.5 rounded-full border-2 border-white/40 border-t-white animate-spin" /> : <i className="ti ti-search" />}
            <span className="hidden xs:inline">Search</span>
          </button>
        </div>
      </form>

      {searching && (
        <div className="space-y-2">
          {[0, 1].map((i) => (
            <div key={i} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-slate-800/60 border border-slate-700/60">
              <div className="w-9 h-9 rounded-full bg-slate-700/60 animate-shimmer" />
              <div className="flex-1 h-3 rounded bg-slate-700/60 animate-shimmer" />
            </div>
          ))}
        </div>
      )}

      {!searching && results.length > 0 && (
        <div className="space-y-2">
          {results.map((c) => (
            <div key={c.channelId} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-slate-800/60 border border-slate-700/60 hover:border-slate-600 transition-colors animate-fade-in-up">
              {c.channelThumbnail ? (
                <img src={c.channelThumbnail} alt={c.channelTitle} className="w-9 h-9 rounded-full" />
              ) : (
                <div className="w-9 h-9 rounded-full bg-slate-700" />
              )}
              <span className="flex-1 text-sm text-slate-200 truncate">{c.channelTitle}</span>
              <button
                onClick={() => handleSubscribe(c)}
                disabled={subscribingId === c.channelId}
                className="text-xs px-3 py-1.5 rounded-md bg-orange-500/15 border border-orange-500/30 text-orange-400 hover:bg-orange-500/25 disabled:opacity-50 flex items-center gap-1"
              >
                {subscribingId === c.channelId
                  ? <div className="w-3 h-3 rounded-full border-2 border-orange-400/40 border-t-orange-400 animate-spin" />
                  : <i className="ti ti-plus" />}
                Subscribe
              </button>
            </div>
          ))}
        </div>
      )}

      {!searching && searched && results.length === 0 && (
        <div className="text-center py-6 text-slate-500 text-sm">
          <i className="ti ti-mood-empty text-2xl mb-1 block" />
          Koi channel nahi mila
        </div>
      )}
    </div>
  )
}