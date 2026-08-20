import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import authRoutes    from './routes/auth.js'
import subjectRoutes from './routes/subjects.js'
import sessionRoutes from './routes/sessions.js'
import todoRoutes    from './routes/todos.js'
import badgeRoutes   from './routes/badges.js'
import groupRoutes   from './routes/groups.js'
import uploadRoutes  from './routes/upload.js'
import gameRoutes    from './routes/games.js'
import speedMathRoutes from './routes/speedmath.js'
import examRoutes    from './routes/exams.js'
import vocabRoutes     from './routes/vocab.js'
import syllabusRoutes  from './routes/syllabus.js'
import pushRoutes, { cronRouter as pushCronRouter } from './routes/push.js'
import adminRoutes    from './routes/admin.js'
import moneyRoutes    from './routes/money.js'
import breakRoutes    from './routes/breaks.js'
import watchRoutes    from './routes/watch.js'
import watchShareRoutes from './routes/watchShare.js'
import channelRoutes  from './routes/channels.js'
import folderRoutes   from './routes/folders.js'
import pdfRoutes      from './routes/pdfs.js'
import mockExamsRoutes from './routes/mockExams.js'
import { checkAndFetchVocab } from './utils/opentdbFetcher.js'
import { connectDB } from './utils/db.js'

dotenv.config()
const app = express()

app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:5173' }))
app.use(express.json())

// FIX: cached connection instead of a bare mongoose.connect() call —
// see utils/db.js for why this matters on Vercel serverless.
// Every request first awaits connectDB(); on a warm instance this is an
// instant no-op (cached.conn already set), so it costs nothing per request
// while guaranteeing we never open a stray extra connection.
let vocabCheckDone = false
app.use(async (req, res, next) => {
  try {
    await connectDB()
    if (!vocabCheckDone) {
      vocabCheckDone = true
      checkAndFetchVocab() // non-blocking, runs once per warm instance
    }
    next()
  } catch (e) {
    console.error('❌ MongoDB error:', e.message)
    res.status(503).json({ error: 'Database unavailable, try again' })
  }
})

app.use('/api/auth',     authRoutes)
app.use('/api/subjects', subjectRoutes)
app.use('/api/sessions', sessionRoutes)
app.use('/api/todos',    todoRoutes)
app.use('/api/badges',   badgeRoutes)
app.use('/api/groups',   groupRoutes)
app.use('/api/upload',   uploadRoutes)
app.use('/api/games',    gameRoutes)
app.use('/api/speedmath', speedMathRoutes)
app.use('/api/exams',   examRoutes)
app.use('/api/vocab',     vocabRoutes)
app.use('/api/syllabus',  syllabusRoutes)
app.use('/api/push',      pushRoutes)
app.use('/api/cron/push', pushCronRouter)
app.use('/api/admin',     adminRoutes)
app.use('/api/money',     moneyRoutes)
app.use('/api/breaks',    breakRoutes)
app.use('/api/watch',     watchRoutes)
app.use('/api/watch',     watchShareRoutes)   // adds /api/watch/share + /api/watch/redeem
app.use('/api/channels',  channelRoutes)
app.use('/api/folders',   folderRoutes)
app.use('/api/pdfs',      pdfRoutes)
app.use('/api/mock-exams', mockExamsRoutes)

// Health check
app.get('/api/health', (_, res) => res.json({ ok: true }))

// Only bind a port for local dev / always-on hosts. On Vercel this file is
// invoked as a serverless function per-request, so app.listen() is skipped
// there (Vercel's Node runtime handles the request/response cycle itself).
if (!process.env.VERCEL) {
  app.listen(process.env.PORT || 4000, () =>
    console.log(`🚀 Server running on port ${process.env.PORT || 4000}`)
  )
}

export default app