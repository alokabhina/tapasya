import mongoose from 'mongoose'
const userSchema = new mongoose.Schema({
  displayName: { type: String, default: 'Aspirant' },
  email:       { type: String, unique: true, sparse: true },
  password:    String, // hashed — null for Google OAuth users
  photoURL:    String,
  isGuest:     { type: Boolean, default: false },
  googleId:    String,
  dailyGoalSeconds: { type: Number, default: 21600 },
  groupId:     { type: mongoose.Schema.Types.ObjectId, ref: 'Group' },
}, { timestamps: true })
export default mongoose.model('User', userSchema)