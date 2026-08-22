// server/routes/cronCurrentAffairs.js
// Same CRON_SECRET pattern as routes/cronChannelSync.js and routes/push.js's
// cronRouter — Vercel Cron hits this once a day (see vercel.json). Not
// mounted under authMiddleware since it's Vercel calling it, not a logged
// in user.
//
// IMPORTANT: Vercel Cron only fires on a deployed/production Vercel project
// — it never runs against a local dev server (localhost:5173/4000). For
// local testing, or to pull fresh items immediately after deploying instead
// of waiting for the next scheduled run, use the admin "Fetch Now" button
// in the Current Affairs page instead (POST /api/current-affairs/fetch-now
// in routes/currentAffairs.js) — same underlying logic, just triggered by
// an admin request instead of Vercel's scheduler.
import express from 'express'
import { syncCurrentAffairsFromFeeds } from '../services/currentAffairsSync.js'

export const cronCurrentAffairsRouter = express.Router()

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

cronCurrentAffairsRouter.all('/', async (req, res) => {
  if (!checkCronSecret(req, res)) return
  try {
    const result = await syncCurrentAffairsFromFeeds()
    res.json({ ok: true, ...result })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})