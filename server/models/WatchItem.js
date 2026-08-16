// server/models/WatchItem.js
// One saved YouTube video (or playlist) in a user's personal watchlist,
// organized into the user's own custom WatchFolder (not the app's global
// Subject model — this is intentionally independent).

import mongoose from 'mongoose'

const watchItemSchema = new mongoose.Schema({
  userId:          { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  folderId:        { type: mongoose.Schema.Types.ObjectId, ref: 'WatchFolder', required: true },

  type:            { type: String, enum: ['video', 'playlist'], required: true },
  youtubeId:       { type: String, required: true }, // videoId (playlist videos are stored as individual video entries)

  title:           { type: String, default: '' },
  thumbnail:       { type: String, default: '' },
  channelTitle:    { type: String, default: '' },
  durationSec:     { type: Number, default: 0 },

  completed:       { type: Boolean, default: false },
  completedAt:     { type: Date, default: null },
  watchedSeconds:  { type: Number, default: 0 },

  source:          { type: String, enum: ['manual', 'shared'], default: 'manual' },
  sharedFromCode:  { type: String, default: null },

}, { timestamps: true })

watchItemSchema.index({ userId: 1, folderId: 1 })
watchItemSchema.index({ userId: 1, youtubeId: 1 })

export default mongoose.model('WatchItem', watchItemSchema)