import mongoose from 'mongoose'

// NOTE: deliberately its own collection, separate from Session (study).
// Nothing in study stats/streak/goal logic queries this model, and nothing
// here ever queries Session — the two are architecturally disjoint so a
// break can never leak into study numbers.
const breakSessionSchema = new mongoose.Schema({
  userId:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type:      { type: String, enum: ['lunch', 'walk', 'nap', 'rest', 'custom'], default: 'rest' },
  label:     { type: String, default: '' }, // used when type === 'custom'
  startTime: { type: Date, required: true },
  endTime:   { type: Date, required: true },
  duration:  { type: Number, required: true }, // seconds
  date:      { type: String, required: true }, // "YYYY-MM-DD", study-day aligned
}, { timestamps: true })

breakSessionSchema.index({ userId: 1, date: 1 })

export default mongoose.model('BreakSession', breakSessionSchema)