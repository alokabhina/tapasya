// src/pages/YTHub.jsx
import { useEffect, useState, useCallback } from 'react'
import {
  getWatchList, getWatchStats, toggleWatchComplete, deleteWatchItem, bulkDeleteWatchItems,
} from '@/api/watch'
import { getFolders } from '@/api/folders'
import { getMySubscriptions, unsubscribeChannel, getChannelFeed } from '@/api/channels'
import WatchStatsWidget from '@/components/watch/WatchStatsWidget'
import WatchListGrid from '@/components/watch/WatchListGrid'
import VideoGridSkeleton from '@/components/watch/VideoGridSkeleton'
import AddLinkModal from '@/components/watch/AddLinkModal'
import VideoPlayerModal from '@/components/watch/VideoPlayerModal'
import ShareModal from '@/components/watch/ShareModal'
import RedeemCodeBar from '@/components/watch/RedeemCodeBar'
import ChannelSearchBar from '@/components/channels/ChannelSearchBar'
import SubscribedChannelsBar from '@/components/channels/SubscribedChannelsBar'
import ChannelFeedGrid from '@/components/channels/ChannelFeedGrid'
import FeedVideoPlayerModal from '@/components/channels/FeedVideoPlayerModal'
import ToastStack, { useToasts } from '@/components/ui/Toast'

const TABS = [
  { id: 'watchlist', label: 'My Watchlist', shortLabel: 'Watchlist', icon: 'ti-playlist' },
  { id: 'feed',       label: 'Channel Feed', shortLabel: 'Feed',      icon: 'ti-rss' },
  { id: 'redeem',     label: 'Redeem',       shortLabel: 'Redeem',    icon: 'ti-gift' },
]

export default function YTHub() {
  const [tab, setTab] = useState('watchlist')
  const { toasts, push: pushToast } = useToasts()

  // ── Watchlist tab state ──────────────────────────────────────────────
  const [folders, setFolders] = useState([])
  const [items, setItems] = useState([])
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [folderFilter, setFolderFilter] = useState('all')
  const [addOpen, setAddOpen] = useState(false)
  const [playingItem, setPlayingItem] = useState(null)
  const [sharingItem, setSharingItem] = useState(null)

  const [selectMode, setSelectMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState(new Set())

  const loadFolders = useCallback(async () => {
    try { setFolders(await getFolders()) } catch {}
  }, [])

  const loadWatchlist = useCallback(async () => {
    setLoading(true)
    try {
      const [list, statsData] = await Promise.all([
        getWatchList(folderFilter === 'all' ? {} : { folderId: folderFilter }),
        getWatchStats(),
      ])
      setItems(list)
      setStats(statsData)
    } catch (e) {
      console.error('Failed to load watchlist', e)
      pushToast('Watchlist load nahi ho payi', 'error')
    } finally {
      setLoading(false)
    }
  }, [folderFilter]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { loadFolders() }, [loadFolders])
  useEffect(() => { if (tab === 'watchlist') loadWatchlist() }, [tab, loadWatchlist])
  useEffect(() => { getWatchStats().then(setStats).catch(() => {}) }, [])

  async function handleToggleComplete(item) {
    const wasCompleted = item.completed
    const updated = await toggleWatchComplete(item._id, !item.completed)
    setItems((prev) => prev.map((i) => (i._id === item._id ? updated : i)))
    getWatchStats().then(setStats).catch(() => {})
    if (!wasCompleted) pushToast('Marked as watched', 'success')
  }

  async function handleDelete(item) {
    if (!confirm(`"${item.title}" list se hatana hai?`)) return
    await deleteWatchItem(item._id)
    setItems((prev) => prev.filter((i) => i._id !== item._id))
    getWatchStats().then(setStats).catch(() => {})
    pushToast('Video removed', 'info')
  }

  function toggleSelect(item) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(item._id)) next.delete(item._id)
      else next.add(item._id)
      return next
    })
  }

  function exitSelectMode() {
    setSelectMode(false)
    setSelectedIds(new Set())
  }

  async function handleBulkDelete() {
    if (!selectedIds.size) return
    if (!confirm(`${selectedIds.size} video hataani hai?`)) return
    await bulkDeleteWatchItems([...selectedIds])
    setItems((prev) => prev.filter((i) => !selectedIds.has(i._id)))
    getWatchStats().then(setStats).catch(() => {})
    pushToast(`${selectedIds.size} videos removed`, 'info')
    exitSelectMode()
  }

  function handleCompletedInPlayer(item) {
    setItems((prev) => prev.map((i) => (i._id === item._id ? { ...i, completed: true } : i)))
    getWatchStats().then(setStats).catch(() => {})
  }

  // ── Channel Feed tab state ───────────────────────────────────────────
  const [subs, setSubs] = useState([])
  const [feedLoading, setFeedLoading] = useState(false)
  const [activeChannelId, setActiveChannelId] = useState(null)
  const [feed, setFeed] = useState([])
  const [playingFeedVideo, setPlayingFeedVideo] = useState(null)

  const loadSubs = useCallback(async () => {
    setFeedLoading(true)
    try {
      const data = await getMySubscriptions()
      setSubs(data)
      // Keep the default view as "All" (mixed feed sorted by recency) — do NOT
      // auto-select a single channel, otherwise the user only sees whichever
      // channel happens to load first instead of a mixed feed.
    } catch (e) {
      console.error('Failed to load subscriptions', e)
    } finally {
      setFeedLoading(false)
    }
  }, [])

  useEffect(() => { if (tab === 'feed') loadSubs() }, [tab, loadSubs])

  useEffect(() => {
    if (tab !== 'feed') return
    if (!subs.length) { setFeed([]); return }

    const channelIds = activeChannelId ? [activeChannelId] : subs.map((s) => s.channelId)
    setFeedLoading(true)
    Promise.all(channelIds.map((id) => getChannelFeed(id).catch(() => [])))
      .then((results) => {
        const merged = results.flat()
        merged.sort((a, b) => new Date(b.publishedAt || 0) - new Date(a.publishedAt || 0))
        setFeed(merged)
      })
      .finally(() => setFeedLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, activeChannelId, subs.map((s) => s.channelId).join(',')])

  async function handleUnsubscribe(sub) {
    if (!confirm(`${sub.channelTitle} unsubscribe karna hai?`)) return
    await unsubscribeChannel(sub._id)
    setSubs((prev) => prev.filter((s) => s._id !== sub._id))
    if (activeChannelId === sub.channelId) setActiveChannelId(null)
    pushToast(`Unsubscribed from ${sub.channelTitle}`, 'info')
  }

  const activeFolderName = folderFilter === 'all'
    ? 'All Folders'
    : (folders.find((f) => f._id === folderFilter)?.name || 'Folder')

  return (
    <div className="p-3 sm:p-6 max-w-6xl mx-auto pb-24">
      <ToastStack toasts={toasts} />

      {/* ── Header ── */}
      <div className="relative mb-5 rounded-2xl overflow-hidden border border-slate-800 bg-gradient-to-br from-slate-900 via-slate-900 to-orange-950/30">
        <div className="absolute -top-10 -right-10 w-48 h-48 rounded-full bg-orange-500/10 blur-3xl pointer-events-none" />
        <div className="relative px-4 sm:px-6 py-4 sm:py-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-orange-500/15 border border-orange-500/20 flex items-center justify-center shrink-0">
              <i className="ti ti-brand-youtube text-orange-400 text-2xl" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-slate-100">YT Study Pathsala</h2>
              <p className="text-xs text-slate-500">Distraction-free video study, all in one place</p>
            </div>
          </div>
          <WatchStatsWidget stats={stats} />
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="flex items-center gap-1 mb-5 border-b border-slate-800 overflow-x-auto no-scrollbar sticky top-0 bg-[#0f172a] z-10 -mx-3 px-3 sm:mx-0 sm:px-0">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 px-3.5 sm:px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
              tab === t.id
                ? 'border-orange-500 text-orange-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <i className={`ti ${t.icon}`} />
            <span className="hidden xs:inline">{t.label}</span>
            <span className="xs:hidden">{t.shortLabel}</span>
          </button>
        ))}
      </div>

      {/* ── Watchlist tab ── */}
      {tab === 'watchlist' && (
        <>
          <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
            <div className="relative">
              <select
                value={folderFilter}
                onChange={(e) => setFolderFilter(e.target.value)}
                className="pl-8 pr-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-200 text-sm cursor-pointer focus:outline-none focus:border-orange-500/60 appearance-none"
              >
                <option value="all">All Folders</option>
                {folders.map((f) => (
                  <option key={f._id} value={f._id}>{f.name}</option>
                ))}
              </select>
              <i className="ti ti-folder absolute left-2.5 top-1/2 -translate-y-1/2 text-orange-400 text-sm pointer-events-none" />
              <i className="ti ti-chevron-down absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 text-xs pointer-events-none" />
            </div>

            <div className="flex items-center gap-2">
              {selectMode ? (
                <>
                  <span className="text-xs text-slate-400">{selectedIds.size} selected</span>
                  <button
                    onClick={handleBulkDelete}
                    disabled={!selectedIds.size}
                    className="px-3 py-2 rounded-lg bg-red-600/20 border border-red-600/40 text-red-400 text-sm font-medium disabled:opacity-40 flex items-center gap-1.5"
                  >
                    <i className="ti ti-trash" /> Delete
                  </button>
                  <button
                    onClick={exitSelectMode}
                    className="px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 text-sm"
                  >
                    Cancel
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => setSelectMode(true)}
                    disabled={!items.length}
                    className="px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 text-sm font-medium flex items-center gap-1.5 disabled:opacity-40"
                  >
                    <i className="ti ti-checkbox" /> <span className="hidden sm:inline">Select</span>
                  </button>
                  <button
                    onClick={() => setAddOpen(true)}
                    className="px-4 py-2 rounded-lg bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium flex items-center gap-1.5 shadow-lg shadow-orange-500/10"
                  >
                    <i className="ti ti-plus" /> Add Link
                  </button>
                </>
              )}
            </div>
          </div>

          {loading ? (
            <VideoGridSkeleton />
          ) : (
            <WatchListGrid
              items={items}
              onPlay={setPlayingItem}
              onToggleComplete={handleToggleComplete}
              onShare={setSharingItem}
              onDelete={handleDelete}
              selectMode={selectMode}
              selectedIds={selectedIds}
              onToggleSelect={toggleSelect}
            />
          )}

          {/* Floating add button on mobile for easy reach */}
          {!selectMode && !addOpen && (
            <button
              onClick={() => setAddOpen(true)}
              className="sm:hidden fixed bottom-24 right-4 z-40 w-14 h-14 rounded-full bg-orange-500 hover:bg-orange-600 text-white shadow-xl shadow-orange-500/30 flex items-center justify-center active:scale-95 transition-transform"
              aria-label="Add link"
            >
              <i className="ti ti-plus text-2xl" />
            </button>
          )}
        </>
      )}

      {/* ── Channel Feed tab ── */}
      {tab === 'feed' && (
        <>
          <ChannelSearchBar onSubscribed={loadSubs} onToast={pushToast} />
          <SubscribedChannelsBar
            subscriptions={subs}
            activeChannelId={activeChannelId}
            onSelect={setActiveChannelId}
            onUnsubscribe={handleUnsubscribe}
          />
          {feedLoading ? (
            <VideoGridSkeleton />
          ) : !subs.length ? (
            <div className="text-center py-16 text-slate-500">
              <div className="w-16 h-16 rounded-2xl bg-slate-800/60 border border-slate-700/60 flex items-center justify-center mx-auto mb-3">
                <i className="ti ti-brand-youtube text-3xl" />
              </div>
              <p className="text-sm font-medium text-slate-400">Koi channel subscribe nahi kiya</p>
              <p className="text-xs text-slate-600 mt-1">Upar se search karke ek channel select karo</p>
            </div>
          ) : (
            <ChannelFeedGrid
              feed={feed}
              onPlay={setPlayingFeedVideo}
              onAddedToWatchlist={() => pushToast('Added to watchlist', 'success')}
            />
          )}
        </>
      )}

      {/* ── Redeem tab ── */}
      {tab === 'redeem' && (
        <RedeemCodeBar onRedeemed={() => { loadFolders(); loadWatchlist(); pushToast('Redeemed!', 'success') }} />
      )}

      {/* Modals — shared across tabs */}
      <AddLinkModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onAdded={() => { loadFolders(); loadWatchlist() }}
        defaultFolderId={folderFilter !== 'all' ? folderFilter : undefined}
        onToast={pushToast}
      />

      {playingItem && (
        <VideoPlayerModal
          item={playingItem}
          queue={items}
          onClose={() => setPlayingItem(null)}
          onCompleted={handleCompletedInPlayer}
          onPlayNext={setPlayingItem}
        />
      )}

      {sharingItem && (
        <ShareModal item={sharingItem} onClose={() => setSharingItem(null)} />
      )}

      {playingFeedVideo && (
        <FeedVideoPlayerModal video={playingFeedVideo} onClose={() => setPlayingFeedVideo(null)} />
      )}
    </div>
  )
}