import mongoose from 'mongoose'

const examSchema = new mongoose.Schema({
  userId:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name:     { type: String, required: true, trim: true },
  examDate: { type: String, required: true }, // YYYY-MM-DD
  color:    { type: String, default: '#a855f7' },
  notes:    { type: String, default: '' },
}, { timestamps: true })

export default mongoose.model('Exam', examSchema)