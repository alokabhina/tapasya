// server/models/WatchFolder.js
// Independent from the app's global Subject model — these are custom
// folders the user names themselves just for YT Study Hub
// (e.g. "Physics", "Static GK"). A playlist import auto-creates its own
// folder named after the playlist.

import mongoose from 'mongoose'

const watchFolderSchema = new mongoose.Schema({
  userId:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name:        { type: String, required: true, trim: true },
  // true if this folder was auto-created from a playlist import
  fromPlaylist: { type: Boolean, default: false },
}, { timestamps: true })

watchFolderSchema.index({ userId: 1, name: 1 })

export default mongoose.model('WatchFolder', watchFolderSchema)