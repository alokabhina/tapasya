import mongoose from 'mongoose'

const badgeSchema = new mongoose.Schema({
  userId:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  badgeId:     { type: String, required: true }, // e.g. 'first_session', 'streak_7'
  unlockedAt:  { type: Date, default: Date.now }, // client BadgeCard.jsx isse padhta hai
}, { timestamps: true })

// Prevent duplicate badges per user
badgeSchema.index({ userId: 1, badgeId: 1 }, { unique: true })

export default mongoose.model('Badge', badgeSchema)