// server/utils/channelSync.js
// Runs on a schedule (via routes/cronChannelSync.js + vercel.json cron).
// Refreshes ChannelVideoCache for every DISTINCT subscribed channel across
// ALL users in one pass — this is what keeps per-user feed reads free of
// direct YouTube API calls, so quota usage stays flat no matter how many
// users subscribe to the same popular channels.

import Subscription from '../models/Subscription.js'
import ChannelVideoCache from '../models/ChannelVideoCache.js'
import { fetchLatestUploads, checkLiveChannels } from './youtube.js'

export async function syncChannelUploads() {
  const distinctChannels = await Subscription.aggregate([
    { $group: { _id: '$channelId', uploadsPlaylistId: { $first: '$uploadsPlaylistId' } } },
  ])

  let updated = 0
  for (const { _id: channelId, uploadsPlaylistId } of distinctChannels) {
    if (!uploadsPlaylistId) continue
    try {
      const uploads = await fetchLatestUploads(uploadsPlaylistId, 10)
      for (const v of uploads) {
        await ChannelVideoCache.findOneAndUpdate(
          { channelId, videoId: v.videoId },
          {
            channelId,
            videoId: v.videoId,
            title: v.title,
            thumbnail: v.thumbnail,
            publishedAt: v.publishedAt,
            lastSyncedAt: new Date(),
          },
          { upsert: true }
        )
        updated++
      }
    } catch (e) {
      console.error(`channelSync: failed for ${channelId}:`, e.message)
    }
  }
  return { channelsChecked: distinctChannels.length, videosUpdated: updated }
}

// Live-status check is expensive (100 units/channel) — call this less often
// than syncChannelUploads (e.g. once/hour vs every few hours).
export async function syncLiveStatus() {
  const distinctChannelIds = await Subscription.distinct('channelId')
  if (!distinctChannelIds.length) return { checked: 0, live: 0 }

  const liveSet = await checkLiveChannels(distinctChannelIds)

  // clear stale live flags, then set the currently-live ones
  await ChannelVideoCache.updateMany(
    { channelId: { $in: distinctChannelIds } },
    { $set: { isLive: false } }
  )
  if (liveSet.size) {
    await ChannelVideoCache.updateMany(
      { channelId: { $in: [...liveSet] } },
      { $set: { isLive: true } }
    )
  }

  return { checked: distinctChannelIds.length, live: liveSet.size }
}
