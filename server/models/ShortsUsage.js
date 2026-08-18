// server/models/ShortsUsage.js
// One document per user per study-day (see utils/dayBoundary.js — resets
// at 3am IST, same boundary as Todo/Timer, not plain midnight). Tracks how
// many distinct Shorts the user has opened today, to enforce the daily cap.
import mongoose from 'mongoose'

const shortsUsageSchema = new mongoose.Schema({
  userId:              { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  date:                { type: String, required: true }, // getStudyDayString(), e.g. "2026-08-17"
  count:                { type: Number, default: 0 },      // total Shorts watched today
  lastBatchAt:          { type: Date, default: null },      // when the last batch was issued
  lastBatchStartCount:  { type: Number, default: 0 },       // `count` value when that batch was issued
  lastBatchSize:        { type: Number, default: 0 },       // how many were in that batch (usually 10)
  batchesIssuedToday:   { type: Number, default: 0 },       // for picking a fresh slice of the pool each batch
}, { timestamps: true })

shortsUsageSchema.index({ userId: 1, date: 1 }, { unique: true })

export default mongoose.model('ShortsUsage', shortsUsageSchema)