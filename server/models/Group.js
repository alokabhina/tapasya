import mongoose from 'mongoose'
const groupSchema = new mongoose.Schema({
  name:        String,
  ownerUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  inviteCode:  { type: String, unique: true },
  members: [{
    userId:       { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    displayName:  String,
    weeklyHours:  { type: Number, default: 0 },
    totalHours:   { type: Number, default: 0 },
    joinedAt:     { type: Date, default: Date.now },
  }],
}, { timestamps: true })
export default mongoose.model('Group', groupSchema)