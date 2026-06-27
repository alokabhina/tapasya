import mongoose from 'mongoose'

const vocabWordSchema = new mongoose.Schema({
  word:       { type: String, required: true, trim: true },
  meaning:    { type: String, required: true, trim: true },
  wordType:   { type: String, enum: ['synonym', 'antonym', 'one-word', 'idiom', 'general'], default: 'general' },
  difficulty: { type: String, enum: ['easy', 'medium', 'hard'], default: 'medium' },
  example:    { type: String, default: '' },
  tags:       { type: [String], default: [] },
  source:     { type: String, enum: ['seed', 'manual', 'json-upload'], default: 'manual' },
  addedBy:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
}, { timestamps: true })

vocabWordSchema.index({ word: 1 })
vocabWordSchema.index({ wordType: 1, difficulty: 1 })
vocabWordSchema.index({ addedBy: 1 })

export default mongoose.model('VocabWord', vocabWordSchema)