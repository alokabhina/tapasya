// server/models/PushSubscription.js
import mongoose from 'mongoose'

const pushSubscriptionSchema = new mongoose.Schema({
  userId:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  endpoint: { type: String, required: true, unique: true },
  keys: {
    p256dh: { type: String, required: true },
    auth:   { type: String, required: true },
  },
  // Generic per-slot send-tracker (avoids duplicate sends same day)
  // e.g. { morning: "2026-06-30", afternoon: "2026-06-30" }
  sentSlots: { type: Map, of: String, default: {} },
}, { timestamps: true })

pushSubscriptionSchema.index({ userId: 1 })

export default mongoose.model('PushSubscription', pushSubscriptionSchema)