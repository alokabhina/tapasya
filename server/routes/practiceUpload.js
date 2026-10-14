// server/routes/practiceUpload.js
// Admin-only image upload for Practice Tests (puzzle / DI / direction-sense
// diagrams, solution figures). Deliberately separate from routes/upload.js,
// which is open to every logged-in user and meant for todo photos.
//
// The client compresses/resizes before sending (utils/compressImage.js), so
// 4 MB is plenty and also stays under Vercel's ~4.5 MB request-body limit.
import express from 'express'
import multer from 'multer'
import cloudinary from 'cloudinary'
import { Readable } from 'stream'
import authMiddleware from '../middleware/auth.js'
import practiceAdminMiddleware from '../middleware/practiceAdmin.js'

const ALLOWED = ['image/png', 'image/jpeg', 'image/webp', 'image/gif']

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 4 * 1024 * 1024 },
  fileFilter: (req, file, cb) => cb(null, ALLOWED.includes(file.mimetype)),
})

function getCloudinary() {
  const cloud = cloudinary.v2
  cloud.config({
    cloud_name: process.env.CLOUDINARY_NAME,
    api_key: process.env.CLOUDINARY_KEY,
    api_secret: process.env.CLOUDINARY_SECRET,
  })
  return cloud
}

function uploadToCloudinary(buffer) {
  return new Promise((resolve, reject) => {
    const stream = getCloudinary().uploader.upload_stream(
      { folder: 'tapasya/practice', resource_type: 'image' },
      (error, result) => (error ? reject(error) : resolve(result)),
    )
    Readable.from(buffer).pipe(stream)
  })
}

const router = express.Router()
router.use(authMiddleware)

// POST /api/practice-upload/image  (multipart, field "file") -> { url }
router.post('/image', practiceAdminMiddleware, (req, res) => {
  upload.single('file')(req, res, async (err) => {
    if (err) {
      const tooBig = err.code === 'LIMIT_FILE_SIZE'
      return res.status(tooBig ? 413 : 400).json({ error: tooBig ? 'Image 4MB se badi hai' : err.message })
    }
    try {
      if (!req.file) return res.status(400).json({ error: 'Sirf PNG / JPG / WEBP / GIF image upload ho sakti hai' })
      const result = await uploadToCloudinary(req.file.buffer)
      // f_auto,q_auto: Cloudinary khud best format/quality serve karta hai (WebP/AVIF) — light pages
      const url = result.secure_url.replace('/upload/', '/upload/f_auto,q_auto/')
      res.json({ url })
    } catch (e) {
      console.error('Practice image upload error:', e.message)
      res.status(500).json({ error: e.message || 'Upload failed' })
    }
  })
})

export default router