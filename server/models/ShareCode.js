// server/models/ShareCode.js
// A short redeemable code that bundles a set of videos/playlists so another
// user can import them into their own personal watchlist. Same pattern as
// Group.inviteCode (crypto.randomBytes based, generated in routes/watchShare.js).

import mongoose from 'mongoose'

const sharedItemSchema = new mongoose.Schema({
  type:        { type: String, enum: ['video', 'playlist'], required: true },
  youtubeId:   { type: String, required: true },
  title:       { type: String, default: '' },
  thumbnail:   { type: String, default: '' },
  channelTitle: { type: String, default: '' },
}, { _id: false })

const shareCodeSchema = new mongoose.Schema({
  code:        { type: String, unique: true, uppercase: true, required: true },
  ownerUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  items:       [sharedItemSchema],

  usedBy: [{
    userId:      { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    redeemedAt:  { type: Date, default: Date.now },
  }],

  expiresAt:   { type: Date, default: null }, // null = never expires

}, { timestamps: true })

export default mongoose.model('ShareCode', shareCodeSchema)
