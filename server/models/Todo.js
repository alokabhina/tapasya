import mongoose from 'mongoose'
const todoSchema = new mongoose.Schema({
  userId:          { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  text:            { type: String, required: true },
  subjectId:       { type: mongoose.Schema.Types.ObjectId, ref: 'Subject' },
  subjectName:     String,
  subjectColor:    String,
  photoUrl:        String,
  photoUploadedAt: Date,
  done:            { type: Boolean, default: false },
  date:            String,
  priority:        { type: String, enum: ['High', 'Medium', 'Low'], default: 'Medium' },
  estMins:         Number,
  completedAt:     String,
  // Optional link to a YT Study Pathsala watchlist video. When set, marking
  // this todo done/undone also flips the linked WatchItem's `completed`
  // flag (and vice versa — see routes/todos.js and routes/watch.js).
  linkedWatchItem: {
    itemId:    { type: mongoose.Schema.Types.ObjectId, ref: 'WatchItem', default: null },
    youtubeId: String,
    title:     String,
    thumbnail: String,
  },
  // Optional link to a weak topic surfaced by Mock Tracker — lets the
  // WeakTopicsList "Remind me" button create a todo pointing back to it.
  linkedMockWeakTopic: {
    sectionName: String,
    topicName:   String,
    correctPct:  Number,
    examName:    String,
  },
}, { timestamps: true })
todoSchema.index({ userId: 1, date: 1 })
export default mongoose.model('Todo', todoSchema)