// server/models/ChannelVideoCache.js
// Shared cache (NOT per-user) of a channel's recent uploads + live status.
// One background cron job refreshes this for every distinct subscribed
// channel across ALL users, so per-user polling never hits the YouTube API
// directly — keeps us well inside the free 10,000 units/day quota.

import mongoose from 'mongoose'

const channelVideoCacheSchema = new mongoose.Schema({
  channelId:     { type: String, required: true, index: true },
  videoId:       { type: String, required: true },

  title:         { type: String, default: '' },
  thumbnail:     { type: String, default: '' },
  publishedAt:   { type: Date, default: null },
  durationSec:   { type: Number, default: 0 },
  isLive:        { type: Boolean, default: false },

  lastSyncedAt:  { type: Date, default: Date.now },

}, { timestamps: true })

channelVideoCacheSchema.index({ channelId: 1, videoId: 1 }, { unique: true })
channelVideoCacheSchema.index({ channelId: 1, publishedAt: -1 })

export default mongoose.model('ChannelVideoCache', channelVideoCacheSchema)
