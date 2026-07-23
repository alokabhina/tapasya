import mongoose from 'mongoose'

// ── VocabQuestion ──────────────────────────────────────────────────────────
// Personal "question bank" — user pastes/adds their own practice questions
// (from today's vocab reading, mock tests, etc), separate from the
// auto-generated word↔meaning quiz in VocabWord/UserVocabProgress.
//
// Two formats, both MCQ-style (options[] + correctAnswer that must exactly
// match one option) — the only difference is presentation:
//  - 'mcq'        → question asked directly, options are the 4 answer choices
//  - 'fill-blank' → question text contains "___" for the blank (cloze /
//                    sentence-completion style), options are the words that
//                    could fill it
const vocabQuestionSchema = new mongoose.Schema({
  question:      { type: String, required: true, trim: true },
  format:        { type: String, enum: ['mcq', 'fill-blank'], default: 'mcq' },
  options:       { type: [String], default: [] },
  correctAnswer: { type: String, required: true, trim: true },
  explanation:   { type: String, default: '' },

  // Optional short passage/paragraph for context — used for Reading
  // Comprehension vocabulary questions or multi-sentence cloze tests.
  // Rendered above the question if present.
  passage: { type: String, default: '' },

  // Covers the exam-relevant vocab question categories (Prelims/Mains style):
  // synonym, antonym, word-meaning, idiom, phrasal-verb, one-word (substitution),
  // root-word, cloze (sentence completion / fillers), word-usage (correct usage /
  // word-swap), general (catch-all).
  vocabType: {
    type: String,
    enum: ['synonym', 'antonym', 'word-meaning', 'idiom', 'phrasal-verb', 'one-word', 'root-word', 'cloze', 'word-usage', 'general'],
    default: 'general',
  },
  difficulty: { type: String, enum: ['easy', 'medium', 'hard'], default: 'medium' },

  relatedWord: { type: String, default: '', trim: true }, // free-text, e.g. "Abate" — optional link back to a word
  studyDate:   { type: String, default: '' }, // "YYYY-MM-DD" (study-day, 3am IST) — jis din padha tha
  tags:        { type: [String], default: [] },
  source:      { type: String, enum: ['manual', 'json-upload'], default: 'manual' },
  addedBy:     { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
}, { timestamps: true })

vocabQuestionSchema.index({ vocabType: 1, difficulty: 1 })
vocabQuestionSchema.index({ format: 1 })
vocabQuestionSchema.index({ studyDate: 1 })
vocabQuestionSchema.index({ addedBy: 1 })

export default mongoose.model('VocabQuestion', vocabQuestionSchema)