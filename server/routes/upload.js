// backend: routes/upload.js
import express from 'express'
import multer from 'multer'
import { v2 as cloudinary } from 'cloudinary'
import { CloudinaryStorage } from 'multer-storage-cloudinary'
import authMiddleware from '../middleware/auth.js'

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_NAME,
  api_key:    process.env.CLOUDINARY_KEY,
  api_secret: process.env.CLOUDINARY_SECRET,
})

const storage = new CloudinaryStorage({ cloudinary, params: { folder: 'tapasya' } })
const upload  = multer({ storage })

const router = express.Router()
router.post('/photo', authMiddleware, upload.single('file'), (req, res) => {
  res.json({ url: req.file.path })
})
export default router