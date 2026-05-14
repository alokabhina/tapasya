// server/models/GroupMessage.js
import mongoose from 'mongoose'

const groupMessageSchema = new mongoose.Schema({
  groupId:     { type: mongoose.Schema.Types.ObjectId, ref: 'Group', required: true, index: true },
  userId:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  displayName: { type: String, default: 'Anonymous' },
  photoURL:    { type: String, default: null },
  text:        { type: String, required: true, maxlength: 500 },
  isAdmin:     { type: Boolean, default: false },
}, { timestamps: true })

export default mongoose.model('GroupMessage', groupMessageSchema)
