// server/routes/pdfs.js
// PDF Library: upload a PDF (and/or revision pictures), list/fetch it for
// reading, and save an annotated copy after marking it up client-side. The
// annotated copy is ALWAYS a new Cloudinary resource — the original's
// public_id is never re-uploaded to or deleted, so it can never be corrupted
// by an annotation save, even if that save fails halfway.
//
// Items: one library item = optional PDF + 0..MAX_IMAGES revision pics.
// (PDF only → opens in the reader; pics only → opens in the image viewer;
// both → the user picks from a chooser on the client.)
//
// Global uploads: the two admins (see middleware/caAdmin.js — main admin +
// alokabhinandan123@gmail.com) can mark an upload as "global" — every user
// then sees it in their library, and either admin can edit it (title,
// summary, pics, unlock time). A regular user's markup on a global PDF is
// stored in a separate PdfAnnotation row keyed to (their userId, that doc) —
// never on the shared PdfDoc itself, so one person's highlighting can never
// show up for anyone else.
import express from 'express'
import multer from 'multer'
import cloudinary from 'cloudinary'
import { Readable } from 'stream'
import authMiddleware from '../middleware/auth.js'
import { isCaAdmin } from '../middleware/caAdmin.js'
import PdfDoc, { PdfAnnotation, PdfReadStat } from '../models/PdfDoc.js'
import User from '../models/User.js'

const MAX_IMAGES = 10
const MAX_IMAGE_BYTES = 8 * 1024 * 1024
const MAX_SUMMARY = 500

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024, files: MAX_IMAGES + 1 }, // 25MB — study PDFs/books can be sizeable
  fileFilter: (req, file, cb) => {
    if (file.fieldname === 'file') {
      if (file.mimetype !== 'application/pdf') return cb(new Error('Only PDF files are allowed'))
    } else if (file.fieldname === 'images') {
      if (!file.mimetype.startsWith('image/')) return cb(new Error('Only image files are allowed'))
    } else {
      return cb(new Error('Unexpected file field'))
    }
    cb(null, true)
  },
})

// multer's own errors (wrong file type, too large) otherwise fall through
// to Express's default HTML error page — this wraps them into clean JSON
// the frontend can actually show the user.
function wrapMulter(handler) {
  return (req, res, next) => {
    handler(req, res, (err) => {
      if (err) return res.status(400).json({ error: err.message || 'Upload failed' })
      next()
    })
  }
}
const handleSingle = wrapMulter(upload.single('file'))                       // annotated export
const handleBundle = wrapMulter(upload.fields([{ name: 'file', maxCount: 1 }, { name: 'images', maxCount: MAX_IMAGES }]))
const handleImages = wrapMulter(upload.array('images', MAX_IMAGES))          // add pics later

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

function uploadImageToCloudinary(buffer, publicId) {
  return new Promise((resolve, reject) => {
    const cloud = getCloudinary()
    const stream = cloud.uploader.upload_stream(
      { folder: 'tapasya/pdf-pics', resource_type: 'image', public_id: publicId },
      (error, result) => { if (error) return reject(error); resolve(result) }
    )
    Readable.from(buffer).pipe(stream)
  })
}

async function uploadImages(files, userId) {
  const stamp = Date.now()
  return Promise.all(files.map(async (f, i) => {
    const r = await uploadImageToCloudinary(f.buffer, `${userId}-${stamp}-pic${i}`)
    return { url: r.secure_url, publicId: r.public_id }
  }))
}

function imagesTooBig(files) {
  return files.some((f) => f.size > MAX_IMAGE_BYTES)
}

// "Admin" = the two people allowed to publish/edit global items.
const isPdfAdmin = isCaAdmin

// Adds the flags the frontend relies on. Computed BEFORE any lock-stripping
// so a locked card still knows it holds a PDF / how many pics it has.
function shape(docObj, { userId, admin }) {
  const isMine = String(docObj.userId) === String(userId)
  return {
    ...docObj,
    isMine,
    canEdit: isMine || (!!docObj.isGlobal && admin),
    hasPdf: !!docObj.originalUrl,
    imageCount: (docObj.images || []).length,
  }
}

// Merges a user's personal annotation (for a global doc they don't own)
// into the doc's plain object, so the frontend always just reads
// `annotatedUrl`/`annotatedAt` regardless of who uploaded the PDF.
function withMyAnnotation(doc, annotation) {
  const obj = doc.toObject ? doc.toObject() : doc
  if (!annotation) return obj
  return {
    ...obj,
    annotatedUrl: annotation.annotatedUrl,
    annotatedAt: annotation.annotatedAt,
    annotationsData: annotation.annotationsData ?? null,
  }
}

// Strips file URLs from a doc that's scheduled to unlock later — the card
// (title/summary/size/folder/unlockAt) still shows so the countdown renders,
// but there's nothing to actually open yet.
function withLockApplied(docObj) {
  if (!docObj.unlockAt || new Date(docObj.unlockAt).getTime() <= Date.now()) {
    return { ...docObj, locked: false }
  }
  // eslint-disable-next-line no-unused-vars
  const { originalUrl, originalPublicId, annotatedUrl, annotatedPublicId, annotationsData, images, ...safe } = docObj
  return { ...safe, locked: true }
}

function cleanSummary(v) {
  return String(v ?? '').trim().slice(0, MAX_SUMMARY)
}

const router = express.Router()
router.use(authMiddleware)

// GET /api/pdfs/is-admin   → { isAdmin } — frontend uses this to show the
// "global upload" option only to the right people.
router.get('/is-admin', async (req, res) => {
  try {
    res.json({ isAdmin: await isPdfAdmin(req.user.id) })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// ── Reading analytics (global items only) ──────────────────────────────────
// POST /api/pdfs/:id/read   body: { seconds?, kind?: 'pdf'|'pics', start?: bool }
// Heartbeat from the reader: `start` bumps the open-count, `seconds` (≤ 60 per
// ping, so a bug or a hand-made request can't inflate the numbers) is added to
// that person's total. The two admins aren't tracked — their own test reads
// would just pollute the numbers they're trying to look at.
router.post('/:id/read', async (req, res) => {
  try {
    if (!/^[a-f\d]{24}$/i.test(req.params.id)) return res.json({ tracked: false })
    const doc = await PdfDoc.findById(req.params.id).select('isGlobal userId unlockAt')
    if (!doc || !doc.isGlobal) return res.json({ tracked: false })
    if (await isPdfAdmin(req.user.id)) return res.json({ tracked: false })
    if (doc.unlockAt && doc.unlockAt.getTime() > Date.now()) return res.json({ tracked: false }) // still locked — nothing to read

    const seconds = Math.max(0, Math.min(60, Math.round(Number(req.body.seconds) || 0)))
    const start = req.body.start === true
    if (!seconds && !start) return res.json({ tracked: true })

    const inc = {}
    if (seconds) inc[req.body.kind === 'pics' ? 'picSeconds' : 'pdfSeconds'] = seconds
    if (start) inc.opens = 1
    await PdfReadStat.updateOne(
      { userId: req.user.id, pdfDocId: doc._id },
      { $inc: inc, $set: { lastReadAt: new Date() }, $setOnInsert: { firstReadAt: new Date() } },
      { upsert: true }
    )
    res.json({ tracked: true })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// GET /api/pdfs/admin/overview   → admins only. One row per item that anyone has read:
// { pdfDocId, readers, seconds, opens, lastReadAt } — drives the little "👁 5 · 2h" badge on each card.
router.get('/admin/overview', async (req, res) => {
  try {
    if (!(await isPdfAdmin(req.user.id))) return res.status(403).json({ error: 'Admin access only' })
    const rows = await PdfReadStat.aggregate([
      { $group: {
        _id: '$pdfDocId',
        readers: { $sum: 1 },
        seconds: { $sum: { $add: ['$pdfSeconds', '$picSeconds'] } },
        opens: { $sum: '$opens' },
        lastReadAt: { $max: '$lastReadAt' },
      } },
    ])
    res.json(rows.map((r) => ({ pdfDocId: String(r._id), readers: r.readers, seconds: r.seconds, opens: r.opens, lastReadAt: r.lastReadAt })))
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// GET /api/pdfs/:id/readers   → admins only. Who read this item, and for how long.
router.get('/:id/readers', async (req, res) => {
  try {
    if (!(await isPdfAdmin(req.user.id))) return res.status(403).json({ error: 'Admin access only' })
    if (!/^[a-f\d]{24}$/i.test(req.params.id)) return res.status(404).json({ error: 'Not found' })
    const stats = await PdfReadStat.find({ pdfDocId: req.params.id }).lean()
    const users = await User.find({ _id: { $in: stats.map((s) => s.userId) } }).select('displayName email photoURL').lean()
    const byId = new Map(users.map((u) => [String(u._id), u]))
    const readers = stats
      .map((s) => {
        const u = byId.get(String(s.userId))
        return {
          userId: String(s.userId),
          name: u?.displayName || 'Unknown',
          email: u?.email || '',
          photoURL: u?.photoURL || '',
          pdfSeconds: s.pdfSeconds || 0,
          picSeconds: s.picSeconds || 0,
          seconds: (s.pdfSeconds || 0) + (s.picSeconds || 0),
          opens: s.opens || 0,
          firstReadAt: s.firstReadAt,
          lastReadAt: s.lastReadAt,
        }
      })
      .sort((a, b) => b.seconds - a.seconds)
    res.json({
      readers,
      totals: {
        readers: readers.length,
        seconds: readers.reduce((n, r) => n + r.seconds, 0),
        opens: readers.reduce((n, r) => n + r.opens, 0),
      },
    })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// POST /api/pdfs/upload
// multipart: file (pdf, optional), images (0..10, optional) — at least one of
// the two — plus title, summary, global ('true'/'false'), folder, unlockAt.
router.post('/upload', handleBundle, async (req, res) => {
  try {
    const pdfFile = req.files?.file?.[0] || null
    const imgFiles = req.files?.images || []
    if (!pdfFile && !imgFiles.length) return res.status(400).json({ error: 'No file uploaded' })
    if (imagesTooBig(imgFiles)) return res.status(400).json({ error: 'Har pic 8MB se chhoti honi chahiye' })

    const stripExt = (n) => String(n || '').replace(/\.(pdf|jpe?g|png|webp|gif|heic|heif)$/i, '')
    const title = stripExt(req.body.title) || stripExt(pdfFile?.originalname) || stripExt(imgFiles[0]?.originalname) || 'Untitled'
    const folder = (req.body.folder || '').trim() || null

    // "global" is only ever honoured for the admins — anyone else
    // sending the flag just gets a normal private upload, silently.
    const admin = await isPdfAdmin(req.user.id)
    const isGlobal = req.body.global === 'true' && admin

    // unlockAt is an ISO string — only kept if it's actually still in the future.
    let unlockAt = null
    if (req.body.unlockAt) {
      const d = new Date(req.body.unlockAt)
      if (!isNaN(d) && d.getTime() > Date.now()) unlockAt = d
    }

    let pdfResult = null
    if (pdfFile) pdfResult = await uploadPdfToCloudinary(pdfFile.buffer, `${req.user.id}-${Date.now()}-original`)
    const images = imgFiles.length ? await uploadImages(imgFiles, req.user.id) : []

    const doc = await PdfDoc.create({
      userId: req.user.id,
      title,
      summary: cleanSummary(req.body.summary),
      folder,
      originalUrl: pdfResult?.secure_url ?? null,
      originalPublicId: pdfResult?.public_id ?? null,
      fileSizeBytes: pdfFile?.size ?? 0,
      images,
      isGlobal,
      unlockAt,
    })
    res.json({ ...shape(doc.toObject(), { userId: req.user.id, admin }), locked: false })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// GET /api/pdfs   → my own items + every global item (with MY annotation, if any)
router.get('/', async (req, res) => {
  try {
    const admin = await isPdfAdmin(req.user.id)
    const ctx = { userId: req.user.id, admin }
    const [own, global] = await Promise.all([
      PdfDoc.find({ userId: req.user.id }),
      PdfDoc.find({ isGlobal: true, userId: { $ne: req.user.id } }),
    ])

    let globalWithMine = global.map((d) => d.toObject())
    if (global.length) {
      const myAnnotations = await PdfAnnotation.find({
        userId: req.user.id,
        pdfDocId: { $in: global.map((d) => d._id) },
      })
      const byDocId = new Map(myAnnotations.map((a) => [String(a.pdfDocId), a]))
      globalWithMine = global.map((d) => withMyAnnotation(d, byDocId.get(String(d._id))))
    }

    const all = [
      ...own.map((d) => ({ ...shape(d.toObject(), ctx), locked: false })), // owner always has full access
      // Admins bypass the unlock timer too, so either of them can preview/edit before release.
      ...globalWithMine.map((d) => {
        const s = shape(d, ctx)
        return admin ? { ...s, locked: false } : withLockApplied(s)
      }),
    ]
    all.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    res.json(all)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// Owner of the item, or an admin for a global item.
async function loadEditable(req) {
  const doc = await PdfDoc.findOne({ _id: req.params.id })
  if (!doc) return { error: 'Not found' }
  const admin = await isPdfAdmin(req.user.id)
  const mine = String(doc.userId) === req.user.id
  if (!mine && !(doc.isGlobal && admin)) return { error: 'Not found' }
  return { doc, admin, mine }
}

// PATCH /api/pdfs/:id   body: { title?, summary?, folder?, unlockAt? }
// Owner, or either admin for a global item. Used to rename, set the card
// summary, move into a different folder (folder: '' → "Ungrouped"), or
// set/change/clear the scheduled-unlock time (unlockAt: '' → unlock now).
router.patch('/:id', async (req, res) => {
  try {
    const { doc, admin, error } = await loadEditable(req)
    if (error) return res.status(404).json({ error })

    if (req.body.title != null) doc.title = String(req.body.title).trim() || doc.title
    if (req.body.summary !== undefined) doc.summary = cleanSummary(req.body.summary)
    if (req.body.folder !== undefined) doc.folder = (req.body.folder || '').trim() || null
    if (req.body.unlockAt !== undefined) {
      if (!req.body.unlockAt) {
        doc.unlockAt = null
      } else {
        const d = new Date(req.body.unlockAt)
        doc.unlockAt = isNaN(d) ? null : d
      }
    }
    await doc.save()
    res.json({ ...shape(doc.toObject(), { userId: req.user.id, admin }), locked: false })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// PATCH /api/pdfs/folder/rename   body: { oldName, newName } — owner only.
// Folders aren't a separate collection (see PdfDoc.folder comment), so
// "renaming a folder" means bulk-updating every item of this user's that's
// currently in oldName to point at newName instead.
router.patch('/folder/rename', async (req, res) => {
  try {
    const oldName = String(req.body.oldName || '').trim()
    const newName = String(req.body.newName || '').trim()
    if (!oldName || !newName) return res.status(400).json({ error: 'oldName aur newName dono chahiye' })
    if (oldName === newName) return res.json({ renamed: 0 })

    const result = await PdfDoc.updateMany(
      { userId: req.user.id, folder: oldName },
      { $set: { folder: newName } }
    )
    res.json({ renamed: result.modifiedCount ?? result.nModified ?? 0, folder: newName })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// POST /api/pdfs/:id/images   multipart: images (1..10) — add pics to an existing item.
router.post('/:id/images', handleImages, async (req, res) => {
  try {
    const { doc, admin, error } = await loadEditable(req)
    if (error) return res.status(404).json({ error })
    const files = req.files || []
    if (!files.length) return res.status(400).json({ error: 'No images uploaded' })
    if (imagesTooBig(files)) return res.status(400).json({ error: 'Har pic 8MB se chhoti honi chahiye' })
    if ((doc.images?.length || 0) + files.length > MAX_IMAGES) {
      return res.status(400).json({ error: `Ek item mein max ${MAX_IMAGES} pics ho sakti hain` })
    }
    const added = await uploadImages(files, req.user.id)
    doc.images.push(...added)
    await doc.save()
    res.json({ ...shape(doc.toObject(), { userId: req.user.id, admin }), locked: false })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// DELETE /api/pdfs/:id/images?pid=<publicId>   — remove one pic from an item.
router.delete('/:id/images', async (req, res) => {
  try {
    const { doc, admin, error } = await loadEditable(req)
    if (error) return res.status(404).json({ error })
    const pid = String(req.query.pid || '')
    const idx = (doc.images || []).findIndex((im) => im.publicId === pid)
    if (idx === -1) return res.status(404).json({ error: 'Pic nahi mili' })
    if (!doc.originalUrl && doc.images.length <= 1) {
      return res.status(400).json({ error: 'Kam se kam ek PDF ya pic rehni chahiye — poora item delete kar do' })
    }
    const [removed] = doc.images.splice(idx, 1)
    await doc.save()
    await getCloudinary().uploader.destroy(removed.publicId, { resource_type: 'image' }).catch(() => {})
    res.json({ ...shape(doc.toObject(), { userId: req.user.id, admin }), locked: false })
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
    const admin = await isPdfAdmin(req.user.id)
    const ctx = { userId: req.user.id, admin }
    if (String(doc.userId) === req.user.id) return res.json({ ...shape(doc.toObject(), ctx), locked: false })

    const mine = await PdfAnnotation.findOne({ userId: req.user.id, pdfDocId: doc._id })
    const s = shape(withMyAnnotation(doc, mine), ctx)
    res.json(admin ? { ...s, locked: false } : withLockApplied(s))
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// POST /api/pdfs/:id/annotated   multipart: file, annotationsJson (optional)
// Saves the annotated export as a SEPARATE Cloudinary resource. Never
// touches originalUrl/originalPublicId. For a doc you own, updates it
// directly; for a global doc you DON'T own, your markup goes into your own
// PdfAnnotation row instead — the shared doc is completely unaffected.
// `annotationsJson` (if sent) is the RAW stroke data — { [pageNum]: Stroke[]
// } as JSON — saved alongside the flattened PDF so the reader can reload
// the actual editable/erasable strokes next time instead of the flattened
// pixels (see PdfDoc.annotationsData comment).
router.post('/:id/annotated', handleSingle, async (req, res) => {
  try {
    const doc = await PdfDoc.findOne({ _id: req.params.id })
    if (!doc) return res.status(404).json({ error: 'Not found' })
    if (String(doc.userId) !== req.user.id && !doc.isGlobal) {
      return res.status(404).json({ error: 'Not found' })
    }
    if (!doc.originalUrl) return res.status(400).json({ error: 'Is item mein PDF nahi hai' })
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' })

    let annotationsData
    if (req.body.annotationsJson) {
      try { annotationsData = JSON.parse(req.body.annotationsJson) } catch { annotationsData = undefined }
    }

    // Stable public_id (no timestamp) + overwrite — every save from now on
    // replaces this SAME Cloudinary file in place. Doesn't matter how many
    // times you re-annotate and save, it's always the one "annotated" slot,
    // never a growing pile of files.
    const publicId = String(doc.userId) === req.user.id
      ? `${doc._id}-annotated`
      : `${doc._id}-annotated-${req.user.id}` // personal layer for a global doc
    const result = await uploadPdfToCloudinary(req.file.buffer, publicId, { overwrite: true })

    const admin = await isPdfAdmin(req.user.id)
    const ctx = { userId: req.user.id, admin }

    if (String(doc.userId) === req.user.id) {
      doc.annotatedUrl = result.secure_url
      doc.annotatedPublicId = result.public_id
      doc.annotatedAt = new Date()
      if (annotationsData !== undefined) doc.annotationsData = annotationsData
      await doc.save()
      return res.json({ ...shape(doc.toObject(), ctx), locked: false })
    }

    // Global doc, not mine — personal annotation layer only.
    const update = { annotatedUrl: result.secure_url, annotatedPublicId: result.public_id, annotatedAt: new Date() }
    if (annotationsData !== undefined) update.annotationsData = annotationsData
    const annotation = await PdfAnnotation.findOneAndUpdate(
      { userId: req.user.id, pdfDocId: doc._id },
      update,
      { upsert: true, new: true }
    )
    res.json({ ...shape(withMyAnnotation(doc, annotation), ctx), locked: false })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// DELETE /api/pdfs/:id   — the uploader, or either admin for a global item
// (so both admins can clean up each other's uploads). A regular user deleting
// a global item just removes their own personal annotation, not the shared file.
router.delete('/:id', async (req, res) => {
  try {
    const doc = await PdfDoc.findOne({ _id: req.params.id })
    if (!doc) return res.status(404).json({ error: 'Not found' })

    const adminOnGlobal = doc.isGlobal && String(doc.userId) !== req.user.id && await isPdfAdmin(req.user.id)

    if (String(doc.userId) !== req.user.id && !adminOnGlobal) {
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
    if (doc.originalPublicId) {
      await cloud.uploader.destroy(doc.originalPublicId, { resource_type: 'raw' }).catch(() => {})
    }
    if (doc.annotatedPublicId) {
      await cloud.uploader.destroy(doc.annotatedPublicId, { resource_type: 'raw' }).catch(() => {})
    }
    for (const im of doc.images || []) {
      await cloud.uploader.destroy(im.publicId, { resource_type: 'image' }).catch(() => {})
    }
    await PdfReadStat.deleteMany({ pdfDocId: doc._id }).catch(() => {})
    // Clean up everyone else's personal annotations on this now-deleted doc too
    // (their Cloudinary copies as well, so nothing is left orphaned).
    const personal = await PdfAnnotation.find({ pdfDocId: doc._id }).catch(() => [])
    for (const a of personal) {
      if (a.annotatedPublicId) await cloud.uploader.destroy(a.annotatedPublicId, { resource_type: 'raw' }).catch(() => {})
    }
    await PdfAnnotation.deleteMany({ pdfDocId: doc._id }).catch(() => {})

    res.json({ deleted: true })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

export default router