// server/models/Group.js
// FIX: weeklyHours/totalHours → weeklySeconds/totalSeconds
// Frontend formatHours(seconds) expect karta hai, toh seconds store karo

import mongoose from 'mongoose'

const memberSchema = new mongoose.Schema({
  userId:        { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  displayName:   { type: String, default: 'Anonymous' },
  photoURL:      { type: String, default: null },
  weeklySeconds: { type: Number, default: 0 },  // FIX: was weeklyHours
  totalSeconds:  { type: Number, default: 0 },  // FIX: was totalHours
  joinedAt:      { type: Date, default: Date.now },
}, { _id: false })

const groupSchema = new mongoose.Schema({
  name:        { type: String, required: true },
  ownerUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  inviteCode:  { type: String, unique: true, uppercase: true },
  members:     [memberSchema],
  // Weekly reset timestamp
  weeklyResetAt: { type: Date, default: Date.now },
}, { timestamps: true })

export default mongoose.model('Group', groupSchema)