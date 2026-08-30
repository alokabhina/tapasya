// server/models/PdfDoc.js
// A user's PDF library entry. `originalUrl`/`originalPublicId` are NEVER
// touched once uploaded — annotation exports always create a brand new
// Cloudinary resource and only update `annotatedUrl`/`annotatedPublicId`,
// so the original file is never at risk of being overwritten or corrupted.
import mongoose from 'mongoose'

const pdfDocSchema = new mongoose.Schema({
  userId:             { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title:              { type: String, required: true },
  originalUrl:         { type: String, required: true },
  originalPublicId:    { type: String, required: true },
  annotatedUrl:        { type: String, default: null },
  annotatedPublicId:   { type: String, default: null },
  annotatedAt:         { type: Date, default: null },
  // Persisted VECTOR strokes (NOT a flattened image) — { [pageNum]: Stroke[] }.
  // This is what the reader loads back so old marks stay fully editable and
  // ERASABLE in every future session; annotatedUrl above is only a flattened
  // "export" copy for downloading/opening outside the app, and is never used
  // to re-open the doc for editing (that would bake old strokes permanently
  // into the page's pixels, making them impossible to erase — the exact bug
  // this field exists to avoid).
  annotationsData:     { type: mongoose.Schema.Types.Mixed, default: null },
  fileSizeBytes:       { type: Number, default: 0 },
  pageCount:           { type: Number, default: 0 },
  // Freeform folder name for organizing the library (e.g. "Quant",
  // "English") — null/empty means it sits in the "Ungrouped" bucket.
  // Kept as a plain string on the doc itself rather than a separate Folder
  // collection: a folder exists simply because at least one PDF references
  // it, which is exactly how the "create a folder, put PDFs in it" flow
  // works from the UI (no empty-folder bookkeeping needed).
  folder:              { type: String, default: null, trim: true },
  // Uploaded by the PDF-library admin, visible to every user (not just the
  // uploader). Regular users can read/annotate it, but their markup goes
  // into a personal PdfAnnotation layer (see model below) — the shared
  // original and its `annotatedUrl` field here stay exactly as the admin
  // left them, untouched by anyone else's markup.
  isGlobal:            { type: Boolean, default: false },
  // Scheduled release ("timer lock") — if set and in the future, non-owners
  // can see the card (title/size/folder) but the API withholds the actual
  // file URLs until this time passes, so it can't be opened yet. A live
  // countdown to this timestamp is shown on the card. Lets an admin upload
  // a whole batch of PDFs today and have each one unlock automatically on
  // its own date/time. The owner (whoever uploaded it) always has full
  // access regardless, to preview/edit before release.
  unlockAt:            { type: Date, default: null },
}, { timestamps: true })

pdfDocSchema.index({ userId: 1, createdAt: -1 })
pdfDocSchema.index({ isGlobal: 1 })
pdfDocSchema.index({ userId: 1, folder: 1 })

// Personal annotation layer for GLOBAL PDFs only — one row per (user, doc).
// A regular user's markup on a shared/global PDF lives here, never on the
// PdfDoc itself, so it can never affect what other users see.
const pdfAnnotationSchema = new mongoose.Schema({
  userId:       { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  pdfDocId:     { type: mongoose.Schema.Types.ObjectId, ref: 'PdfDoc', required: true },
  annotatedUrl:      { type: String, required: true },
  annotatedPublicId: { type: String, required: true },
  annotatedAt:       { type: Date, default: Date.now },
  // Same reasoning as PdfDoc.annotationsData above, just for a global doc's
  // personal per-user markup layer.
  annotationsData:   { type: mongoose.Schema.Types.Mixed, default: null },
}, { timestamps: true })

pdfAnnotationSchema.index({ userId: 1, pdfDocId: 1 }, { unique: true })

export const PdfAnnotation = mongoose.model('PdfAnnotation', pdfAnnotationSchema)
export default mongoose.model('PdfDoc', pdfDocSchema)