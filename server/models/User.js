import mongoose from 'mongoose'
const userSchema = new mongoose.Schema({
  displayName: { type: String, default: 'Aspirant' },
  email:       { type: String, unique: true, sparse: true },
  password:    String, // hashed — null for Google OAuth users
  photoURL:    String,
  isGuest:     { type: Boolean, default: false },
  googleId:    String,
  dailyGoalSeconds: { type: Number, default: 21600 },
  // groupId removed — users can now create/join unlimited groups freely

  // ── Admin controls ────────────────────────────────────────────────────
  isBanned:     { type: Boolean, default: false },
  banReason:    { type: String, default: '' },
  bannedAt:     { type: Date, default: null },
  timeoutUntil: { type: Date, default: null }, // temporary suspension, auto-lifts after this time
}, { timestamps: true })
export default mongoose.model('User', userSchema)