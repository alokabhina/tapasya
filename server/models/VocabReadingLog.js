import mongoose from 'mongoose'

// Har din ka "actively reading vocab" time — sirf tab count hota hai jab user
// interact kar raha ho (20 sec se zyada idle ho to client heartbeat bhejna band
// kar deta hai, isliye yeh field sirf genuine reading time reflect karta hai)
const vocabReadingLogSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  date:   { type: String, required: true }, // "YYYY-MM-DD"
  seconds: { type: Number, default: 0 },
}, { timestamps: true })

vocabReadingLogSchema.index({ userId: 1, date: 1 }, { unique: true })

export default mongoose.model('VocabReadingLog', vocabReadingLogSchema)