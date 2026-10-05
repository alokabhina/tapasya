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
  // Optional time limit for this task — "HH:mm" (24h, IST wall-clock), e.g.
  // startTime "12:00", endTime "13:00" = "12 baje se 1 baje tak". When
  // startTime arrives, the server cron (routes/push.js -> /api/cron/push/todos
  // -> utils/todoReminders.js) sends a Web Push so the phone shows
  // "Ye todo karna hai" even with the app closed. Times before 03:00 belong to
  // the NEXT calendar day of the study day in `date` (3am study-day rule).
  startTime:       { type: String, match: /^([01]\d|2[0-3]):[0-5]\d$/ },
  endTime:         { type: String, match: /^([01]\d|2[0-3]):[0-5]\d$/ },
  // Set once the start-time push has gone out, so it never fires twice.
  remindedAt:      Date,
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
// Reminder cron scans by date + done across all users
todoSchema.index({ date: 1, done: 1 })
export default mongoose.model('Todo', todoSchema)