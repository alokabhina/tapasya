// server/models/Group.js

import mongoose from 'mongoose'

const memberSchema = new mongoose.Schema({
  userId:        { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  displayName:   { type: String, default: 'Anonymous' },
  photoURL:      { type: String, default: null },
  weeklySeconds: { type: Number, default: 0 },
  totalSeconds:  { type: Number, default: 0 },
  joinedAt:      { type: Date, default: Date.now },
  // Live presence — updated every ~10s when timer running
  isStudying:    { type: Boolean, default: false },
  studyingSubject: { type: String, default: null },
  studyingColor:   { type: String, default: null },
  liveElapsed:     { type: Number, default: 0 },   // seconds elapsed this session
  lastHeartbeat:   { type: Date,   default: null }, // last ping time
}, { _id: false })

const groupSchema = new mongoose.Schema({
  name:        { type: String, required: true },
  ownerUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  inviteCode:  { type: String, unique: true, uppercase: true },
  members:     [memberSchema],
  weeklyResetAt: { type: Date, default: Date.now },
}, { timestamps: true })

export default mongoose.model('Group', groupSchema)