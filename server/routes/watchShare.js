// server/routes/watchShare.js
// Share: pick items from your watchlist → get a short code.
// Redeem: someone else enters the code → items get copied into their list.

import express from 'express'
import crypto from 'crypto'
import authMiddleware from '../middleware/auth.js'
import WatchItem from '../models/WatchItem.js'
import ShareCode from '../models/ShareCode.js'

const router = express.Router()
router.use(authMiddleware)

function generateCode() {
  return 'WATCH-' + crypto.randomBytes(3).toString('hex').toUpperCase()
}

// POST /api/watch/share   { itemIds: [] }
router.post('/share', async (req, res) => {
  try {
    const { itemIds } = req.body
    if (!Array.isArray(itemIds) || !itemIds.length) {
      return res.status(400).json({ error: 'itemIds required' })
    }

    const items = await WatchItem.find({ _id: { $in: itemIds }, userId: req.user.id }).lean()
    if (!items.length) return res.status(404).json({ error: 'No matching items found' })

    let code
    let attempts = 0
    do {
      code = generateCode()
      attempts++
    } while (await ShareCode.exists({ code }) && attempts < 5)

    const shareCode = await ShareCode.create({
      code,
      ownerUserId: req.user.id,
      items: items.map((i) => ({
        type: i.type,
        youtubeId: i.youtubeId,
        title: i.title,
        thumbnail: i.thumbnail,
        channelTitle: i.channelTitle,
      })),
    })

    res.json({ code: shareCode.code, itemCount: items.length })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// POST /api/watch/redeem   { code, folderId }
router.post('/redeem', async (req, res) => {
  try {
    const { code, folderId } = req.body
    if (!code || !folderId) return res.status(400).json({ error: 'code and folderId are required' })

    const shareCode = await ShareCode.findOne({ code: code.trim().toUpperCase() })
    if (!shareCode) return res.status(404).json({ error: 'Invalid code' })
    if (shareCode.expiresAt && shareCode.expiresAt < new Date()) {
      return res.status(410).json({ error: 'This code has expired' })
    }

    // don't re-add items the user already has
    const existing = await WatchItem.find({
      userId: req.user.id,
      youtubeId: { $in: shareCode.items.map((i) => i.youtubeId) },
    }).select('youtubeId').lean()
    const existingIds = new Set(existing.map((e) => e.youtubeId))

    const toInsert = shareCode.items
      .filter((i) => !existingIds.has(i.youtubeId))
      .map((i) => ({
        userId: req.user.id,
        folderId,
        type: i.type,
        youtubeId: i.youtubeId,
        title: i.title,
        thumbnail: i.thumbnail,
        channelTitle: i.channelTitle,
        source: 'shared',
        sharedFromCode: shareCode.code,
      }))

    const inserted = toInsert.length ? await WatchItem.insertMany(toInsert) : []

    shareCode.usedBy.push({ userId: req.user.id })
    await shareCode.save()

    res.json({
      added: inserted.length,
      skipped: shareCode.items.length - inserted.length,
      items: inserted,
    })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

export default router