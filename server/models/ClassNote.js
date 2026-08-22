// server/models/ClassNote.js
// Global (not per-user) structured notes from live-class PDFs. The PDF
// itself is never uploaded here — the admin runs it through an external AI
// (ChatGPT etc.) by hand, gets back JSON matching this shape, and pastes it
// into the Bulk Importer (see components/shared/BulkJsonImporter.jsx). No
// in-app LLM call, no cost, no API key needed on the server for this.
import mongoose from 'mongoose'

const classNoteSchema = new mongoose.Schema({
  subject:  { type: String, required: true, trim: true },   // 'Economy', 'Polity', ...
  topic:    { type: String, required: true, trim: true },   // 'Monetary Policy'
  date:     { type: Date, required: true },                  // date of the live class

  summary:  { type: String, default: '' },                   // 2-3 line overview

  keyPoints: [{ type: String }],

  importantFacts: [{
    fact: { type: String, required: true },
    type: { type: String, enum: ['number', 'concept', 'date', 'name', 'other'], default: 'other' },
  }],

  definitions: [{
    term:    { type: String, required: true },
    meaning: { type: String, required: true },
  }],

  createdByEmail: { type: String, default: null },
}, { timestamps: true })

classNoteSchema.index({ subject: 1, date: -1 })
classNoteSchema.index({ topic: 'text', summary: 'text' })

export default mongoose.model('ClassNote', classNoteSchema)
