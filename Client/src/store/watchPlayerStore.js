// src/store/watchPlayerStore.js
// Holds which watchlist video is currently playing app-wide, and whether
// it's minimized to a floating corner player. This is what lets the video
// keep playing (and the same YT.Player instance stay alive, uninterrupted)
// while the user navigates to Todo, Stats, or anywhere else in the app —
// exactly like YouTube's own miniplayer. Not persisted across reloads —
// a live player instance can't survive a page reload anyway.
import { create } from 'zustand'

const useWatchPlayerStore = create((set) => ({
  item: null,       // the WatchItem currently playing, or null
  queue: [],         // sibling items, for "Next in list"
  minimized: false,
  lastCompleted: null, // { itemId, at } — pages watch this to refresh their own list/stats
  // True only when the study timer was started FROM the 30s "start timer?"
  // nudge for the video currently playing — lets closing the video offer
  // to stop that same timer too, without nagging when the running timer
  // has nothing to do with this video (e.g. started earlier for something
  // else entirely).
  timerStartedForVideo: false,

  play: (item, queue = []) => set({ item, queue, minimized: false, timerStartedForVideo: false }),
  playNext: (item) => set({ item, minimized: false, timerStartedForVideo: false }),
  minimize: () => set({ minimized: true }),
  expand: () => set({ minimized: false }),
  close: () => set({ item: null, queue: [], minimized: false }),
  markCompleted: (itemId) => set({ lastCompleted: { itemId, at: Date.now() } }),
  setTimerStartedForVideo: (v) => set({ timerStartedForVideo: v }),
}))

export default useWatchPlayerStore