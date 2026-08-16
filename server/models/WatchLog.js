// server/models/WatchLog.js
// One row per user per study-day — total seconds watched that day.
// Kept separate from WatchItem so stats stay a cheap single-doc lookup
// instead of summing across every watch item every time.

import mongoose from 'mongoose'

const watchLogSchema = new mongoose.Schema({
  userId:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  date:    { type: String, required: true }, // "YYYY-MM-DD", study-day string (3am IST cutoff)
  seconds: { type: Number, default: 0 },
}, { timestamps: true })

watchLogSchema.index({ userId: 1, date: 1 }, { unique: true })

export default mongoose.model('WatchLog', watchLogSchema)
