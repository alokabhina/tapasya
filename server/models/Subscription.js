// server/models/Subscription.js
// A user's in-app subscription to a YouTube channel, tagged to one of the
// user's own custom folders. No video caching happens for this anymore —
// the Channel Feed tab embeds the channel's uploads playlist directly from
// YouTube (see routes/channels.js), so this model only needs to remember
// which channels the user picked and the uploads-playlist id for the embed.

import mongoose from 'mongoose'

const subscriptionSchema = new mongoose.Schema({
  userId:             { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  folderId:           { type: mongoose.Schema.Types.ObjectId, ref: 'WatchFolder', required: true },

  channelId:          { type: String, required: true },
  channelTitle:       { type: String, default: '' },
  channelThumbnail:   { type: String, default: '' },
  uploadsPlaylistId:  { type: String, default: '' }, // used to build the embed URL

}, { timestamps: true })

subscriptionSchema.index({ userId: 1, channelId: 1 }, { unique: true })
subscriptionSchema.index({ userId: 1, folderId: 1 })

export default mongoose.models.Subscription || mongoose.model('Subscription', subscriptionSchema)