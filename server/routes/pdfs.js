// server/routes/pdfs.js
// PDF Library: upload a PDF, list/fetch it for reading, and save an
// annotated copy after marking it up client-side. The annotated copy is
// ALWAYS a new Cloudinary resource — the original's public_id is never
// re-uploaded to or deleted, so it can never be corrupted by an annotation
// save, even if that save fails halfway.
//
// Global uploads: the PDF-library admin (see PDF_ADMIN_EMAIL) can mark an
// upload as "global" — every user then sees it in their library. A regular
// user's markup on a global PDF is stored in a separate PdfAnnotation row
// keyed to (their userId, that doc) — never on the shared PdfDoc itself, so
// one person's highlighting can never show up for anyone else.
import express from 'express'
import multer from 'multer'
import cloudinary from 'cloudinary'
import { Readable } from 'stream'
import authMiddleware from '../middleware/auth.js'
import PdfDoc, { PdfAnnotation } from '../models/PdfDoc.js'
import User from '../models/User.js'

// Separate from the main app's ADMIN_EMAIL (middleware/admin.js) — this is
// specifically who can publish PDFs visible to everyone, per explicit request.
const PDF_ADMIN_EMAIL = 'alokabhinandan123@gmail.com'

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB — study PDFs/books can be sizeable
  fileFilter: (req, file, cb) => {
    if (file.mimetype !== 'application/pdf') return cb(new Error('Only PDF files are allowed'))
    cb(null, true)
  },
})

// multer's own errors (wrong file type, too large) otherwise fall through
// to Express's default HTML error page — this wraps them into clean JSON
// the frontend can actually show the user.
function handleUpload(req, res, next) {
  upload.single('file')(req, res, (err) => {
    if (err) return res.status(400).json({ error: err.message || 'Upload failed' })
    next()
  })
}

function getCloudinary() {
  const cloud = cloudinary.v2
  cloud.config({
    cloud_name: process.env.CLOUDINARY_NAME,
    api_key: process.env.CLOUDINARY_KEY,
    api_secret: process.env.CLOUDINARY_SECRET,
  })
  return cloud
}

function uploadPdfToCloudinary(buffer, publicId, { overwrite = false } = {}) {
  return new Promise((resolve, reject) => {
    const cloud = getCloudinary()
    const stream = cloud.uploader.upload_stream(
      { folder: 'tapasya/pdfs', resource_type: 'raw', public_id: publicId, format: 'pdf', overwrite, invalidate: overwrite },
      (error, result) => { if (error) return reject(error); resolve(result) }
    )
    Readable.from(buffer).pipe(stream)
  })
}

async function isPdfAdmin(userId) {
  const user = await User.findById(userId).select('email')
  return user?.email?.toLowerCase() === PDF_ADMIN_EMAIL.toLowerCase()
}

// Merges a user's personal annotation (for a global doc they don't own)
// into the doc's plain object, so the frontend always just reads
// `annotatedUrl`/`annotatedAt` regardless of who uploaded the PDF.
function withMyAnnotation(doc, annotation) {
  const obj = doc.toObject ? doc.toObject() : doc
  if (!annotation) return obj
  return { ...obj, annotatedUrl: annotation.annotatedUrl, annotatedAt: annotation.annotatedAt }
}

const router = express.Router()
router.use(authMiddleware)

// GET /api/pdfs/is-admin   → { isAdmin } — frontend uses this to show the
// "global upload" option only to the right person.
router.get('/is-admin', async (req, res) => {
  try {
    res.json({ isAdmin: await isPdfAdmin(req.user.id) })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// POST /api/pdfs/upload   multipart: file, title, global ('true'/'false')
router.post('/upload', handleUpload, async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' })
    const title = (req.body.title || req.file.originalname || 'Untitled').replace(/\.pdf$/i, '')

    // "global" is only ever honoured for the actual admin — anyone else
    // sending the flag just gets a normal private upload, silently.
    const wantsGlobal = req.body.global === 'true'
    const isGlobal = wantsGlobal && await isPdfAdmin(req.user.id)

    const publicId = `${req.user.id}-${Date.now()}-original`
    const result = await uploadPdfToCloudinary(req.file.buffer, publicId)

    const doc = await PdfDoc.create({
      userId: req.user.id,
      title,
      originalUrl: result.secure_url,
      originalPublicId: result.public_id,
      fileSizeBytes: req.file.size,
      isGlobal,
    })
    res.json(doc)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// GET /api/pdfs   → my own PDFs + every global PDF (with MY annotation, if any)
router.get('/', async (req, res) => {
  try {
    const [own, global] = await Promise.all([
      PdfDoc.find({ userId: req.user.id }),
      PdfDoc.find({ isGlobal: true, userId: { $ne: req.user.id } }),
    ])

    let globalWithMine = global
    if (global.length) {
      const myAnnotations = await PdfAnnotation.find({
        userId: req.user.id,
        pdfDocId: { $in: global.map((d) => d._id) },
      })
      const byDocId = new Map(myAnnotations.map((a) => [String(a.pdfDocId), a]))
      globalWithMine = global.map((d) => withMyAnnotation(d, byDocId.get(String(d._id))))
    }

    const all = [
      ...own.map((d) => ({ ...d.toObject(), isMine: true })),
      ...globalWithMine.map((d) => ({ ...d, isMine: false })),
    ]
    all.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    res.json(all)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// GET /api/pdfs/:id
router.get('/:id', async (req, res) => {
  try {
    const doc = await PdfDoc.findOne({ _id: req.params.id })
    if (!doc) return res.status(404).json({ error: 'Not found' })
    if (String(doc.userId) !== req.user.id && !doc.isGlobal) {
      return res.status(404).json({ error: 'Not found' })
    }
    if (String(doc.userId) === req.user.id) return res.json(doc)

    const mine = await PdfAnnotation.findOne({ userId: req.user.id, pdfDocId: doc._id })
    res.json(withMyAnnotation(doc, mine))
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// POST /api/pdfs/:id/annotated   multipart: file
// Saves the annotated export as a SEPARATE Cloudinary resource. Never
// touches originalUrl/originalPublicId. For a doc you own, updates it
// directly; for a global doc you DON'T own, your markup goes into your own
// PdfAnnotation row instead — the shared doc is completely unaffected.
router.post('/:id/annotated', handleUpload, async (req, res) => {
  try {
    const doc = await PdfDoc.findOne({ _id: req.params.id })
    if (!doc) return res.status(404).json({ error: 'Not found' })
    if (String(doc.userId) !== req.user.id && !doc.isGlobal) {
      return res.status(404).json({ error: 'Not found' })
    }
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' })

    // Stable public_id (no timestamp) + overwrite — every save from now on
    // replaces this SAME Cloudinary file in place. Doesn't matter how many
    // times you re-annotate and save, it's always the one "annotated" slot,
    // never a growing pile of files.
    const publicId = String(doc.userId) === req.user.id
      ? `${doc._id}-annotated`
      : `${doc._id}-annotated-${req.user.id}` // personal layer for a global doc
    const result = await uploadPdfToCloudinary(req.file.buffer, publicId, { overwrite: true })

    if (String(doc.userId) === req.user.id) {
      doc.annotatedUrl = result.secure_url
      doc.annotatedPublicId = result.public_id
      doc.annotatedAt = new Date()
      await doc.save()
      return res.json(doc)
    }

    // Global doc, not mine — personal annotation layer only.
    const annotation = await PdfAnnotation.findOneAndUpdate(
      { userId: req.user.id, pdfDocId: doc._id },
      { annotatedUrl: result.secure_url, annotatedPublicId: result.public_id, annotatedAt: new Date() },
      { upsert: true, new: true }
    )
    res.json(withMyAnnotation(doc, annotation))
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// DELETE /api/pdfs/:id   — only the uploader (so only the admin can remove
// a global PDF; a regular user deleting one just removes their own copy's
// personal annotation, not the shared file).
router.delete('/:id', async (req, res) => {
  try {
    const doc = await PdfDoc.findOne({ _id: req.params.id })
    if (!doc) return res.status(404).json({ error: 'Not found' })

    if (String(doc.userId) !== req.user.id) {
      // Not the owner — for a global doc, just clear MY personal markup.
      if (!doc.isGlobal) return res.status(404).json({ error: 'Not found' })
      const ann = await PdfAnnotation.findOneAndDelete({ userId: req.user.id, pdfDocId: doc._id })
      if (ann?.annotatedPublicId) {
        await getCloudinary().uploader.destroy(ann.annotatedPublicId, { resource_type: 'raw' }).catch(() => {})
      }
      return res.json({ deleted: true, personalOnly: true })
    }

    await PdfDoc.deleteOne({ _id: doc._id })
    const cloud = getCloudinary()
    await cloud.uploader.destroy(doc.originalPublicId, { resource_type: 'raw' }).catch(() => {})
    if (doc.annotatedPublicId) {
      await cloud.uploader.destroy(doc.annotatedPublicId, { resource_type: 'raw' }).catch(() => {})
    }
    // Clean up everyone else's personal annotations on this now-deleted doc too.
    await PdfAnnotation.deleteMany({ pdfDocId: doc._id }).catch(() => {})

    res.json({ deleted: true })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

export default router