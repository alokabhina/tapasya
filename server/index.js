import express from 'express'
import mongoose from 'mongoose'
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
import examRoutes    from './routes/exams.js'
import vocabRoutes     from './routes/vocab.js'
import syllabusRoutes  from './routes/syllabus.js'
import pushRoutes, { cronRouter as pushCronRouter } from './routes/push.js'
import adminRoutes    from './routes/admin.js'
import moneyRoutes    from './routes/money.js'
import breakRoutes    from './routes/breaks.js'
import { checkAndFetchVocab } from './utils/opentdbFetcher.js'

dotenv.config()
const app = express()

app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:5173' }))
app.use(express.json())

mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('✅ MongoDB connected')
    // Auto-supplement vocab questions if count is low (non-blocking)
    checkAndFetchVocab()
  })
  .catch((e) => { console.error('❌ MongoDB error:', e.message); process.exit(1) })

app.use('/api/auth',     authRoutes)
app.use('/api/subjects', subjectRoutes)
app.use('/api/sessions', sessionRoutes)
app.use('/api/todos',    todoRoutes)
app.use('/api/badges',   badgeRoutes)
app.use('/api/groups',   groupRoutes)
app.use('/api/upload',   uploadRoutes)
app.use('/api/games',    gameRoutes)
app.use('/api/exams',   examRoutes)
app.use('/api/vocab',     vocabRoutes)
app.use('/api/syllabus',  syllabusRoutes)
app.use('/api/push',      pushRoutes)
app.use('/api/cron/push', pushCronRouter)
app.use('/api/admin',     adminRoutes)
app.use('/api/money',     moneyRoutes)
app.use('/api/breaks',    breakRoutes)

// Health check
app.get('/api/health', (_, res) => res.json({ ok: true }))

app.listen(process.env.PORT || 4000, () =>
  console.log(`🚀 Server running on port ${process.env.PORT || 4000}`)
)