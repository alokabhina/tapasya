import mongoose from 'mongoose'

const questionSchema = new mongoose.Schema({
  gameType:     { type: String, required: true, enum: ['calculation', 'series', 'vocab', 'syllogism', 'survival', 'grammar'] },
  questionText: { type: String, required: true },
  options:      { type: [String], required: true },
  answer:       { type: String, required: true },
  explanation:  { type: String, default: '' },
  difficulty:   { type: String, enum: ['easy', 'medium', 'hard'], default: 'medium' },
  topic:        { type: String, default: 'general' },
  tags:         { type: [String], default: [] },
  timeLimit:    { type: Number, default: 15 }, // seconds
  level:        { type: Number, default: 1 },  // for calculation climb L1–L6
  source:       { type: String, default: 'seed', enum: ['seed', 'opentdb'] },
  priorityScore:{ type: Number, default: 0 },  // higher = serve more often (spaced rep)
}, { timestamps: true })

questionSchema.index({ gameType: 1, difficulty: 1, level: 1 })
questionSchema.index({ gameType: 1, source: 1 })

export default mongoose.model('Question', questionSchema)