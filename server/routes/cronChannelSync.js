// server/routes/cronChannelSync.js
// Same CRON_SECRET pattern as routes/push.js's cronRouter — Vercel Cron hits
// this on a schedule (see vercel.json). Not mounted under authMiddleware
// since it's not a logged-in user hitting it, just the cron secret.

import express from 'express'
import { syncChannelUploads, syncLiveStatus } from '../utils/channelSync.js'

export const cronChannelRouter = express.Router()

function checkCronSecret(req, res) {
  const authHeader = req.headers['authorization']
  const bearerSecret = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null
  const secret = bearerSecret || req.headers['x-cron-secret']
  if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
    res.status(401).json({ error: 'Unauthorized' })
    return false
  }
  return true
}

// GET/POST /api/cron/channels/uploads — cheap (1 unit/channel), run a few times a day
cronChannelRouter.all('/uploads', async (req, res) => {
  if (!checkCronSecret(req, res)) return
  try {
    const result = await syncChannelUploads()
    res.json({ ok: true, ...result })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// GET/POST /api/cron/channels/live — expensive (100 units/channel), run sparingly (e.g. hourly)
cronChannelRouter.all('/live', async (req, res) => {
  if (!checkCronSecret(req, res)) return
  try {
    const result = await syncLiveStatus()
    res.json({ ok: true, ...result })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})
