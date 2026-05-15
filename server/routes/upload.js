// backend: routes/upload.js
// Fix: cloudinary.config() lazy call karo — module load time pe env vars nahi hote
// Use memoryStorage + upload_stream (no multer-storage-cloudinary needed)

import express        from 'express'
import multer         from 'multer'
import cloudinary     from 'cloudinary'
import authMiddleware from '../middleware/auth.js'
import { Readable }   from 'stream'

// DO NOT call cloudinary.config() here at module level —
// dotenv hasn't run yet when this module loads.
// Instead, configure lazily inside the route handler.

const upload = multer({
  storage: multer.memoryStorage(),
  limits:  { fileSize: 8 * 1024 * 1024 },
})

function getCloudinary() {
  const cloud = cloudinary.v2
  cloud.config({
    cloud_name: process.env.CLOUDINARY_NAME,
    api_key:    process.env.CLOUDINARY_KEY,
    api_secret: process.env.CLOUDINARY_SECRET,
  })
  return cloud
}

function uploadToCloudinary(buffer) {
  return new Promise((resolve, reject) => {
    const cloud  = getCloudinary()
    const stream = cloud.uploader.upload_stream(
      { folder: 'tapasya', resource_type: 'image' },
      (error, result) => { if (error) return reject(error); resolve(result) }
    )
    Readable.from(buffer).pipe(stream)
  })
}

const router = express.Router()

router.post('/photo', authMiddleware, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' })
    const result = await uploadToCloudinary(req.file.buffer)
    res.json({ url: result.secure_url })
  } catch (err) {
    console.error('Cloudinary upload error:', err.message)
    res.status(500).json({ error: err.message || 'Upload failed' })
  }
})

export default router