// routes/vocab.js
// Vocab Master — personal learning tool (alag from VocabBlitz game)

import express from 'express'
import VocabWord from '../models/VocabWord.js'
import UserVocabProgress from '../models/UserVocabProgress.js'
import authMiddleware from '../middleware/auth.js'

const router = express.Router()

// ── POST /api/vocab/seed — bulk seed from JSON array (admin use) ──────────────
router.post('/seed', authMiddleware, async (req, res) => {
  try {
    const words = req.body // array of word objects
    if (!Array.isArray(words) || !words.length)
      return res.status(400).json({ error: 'Send an array of words' })

    const docs = words.map(w => ({ ...w, source: 'seed', addedBy: req.user.id }))
    const inserted = await VocabWord.insertMany(docs, { ordered: false })
    res.json({ inserted: inserted.length })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// ── POST /api/vocab/upload — paste ChatGPT JSON output ───────────────────────
router.post('/upload', authMiddleware, async (req, res) => {
  try {
    const words = req.body // array: [{word, meaning, type, difficulty}]
    if (!Array.isArray(words) || !words.length)
      return res.status(400).json({ error: 'Send an array of words' })

    const docs = words.map(w => ({
      word:       w.word?.trim(),
      meaning:    w.meaning?.trim(),
      wordType:   ['synonym','antonym','one-word','idiom','general'].includes(w.type) ? w.type : 'general',
      difficulty: ['easy','medium','hard'].includes(w.difficulty) ? w.difficulty : 'medium',
      example:    w.example?.trim() || '',
      tags:       w.tags || [],
      source:     'json-upload',
      addedBy:    req.user.id,
    })).filter(d => d.word && d.meaning)

    // Upsert by word to avoid duplicates
    const ops = docs.map(d => ({
      updateOne: {
        filter: { word: d.word },
        update: { $setOnInsert: d },
        upsert: true,
      }
    }))
    const result = await VocabWord.bulkWrite(ops)
    res.json({ upserted: result.upsertedCount, matched: result.matchedCount })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// ── POST /api/vocab/add — single word manual add ─────────────────────────────
router.post('/add', authMiddleware, async (req, res) => {
  try {
    const { word, meaning, wordType, difficulty, example, tags } = req.body
    if (!word || !meaning)
      return res.status(400).json({ error: 'word and meaning are required' })

    const existing = await VocabWord.findOne({ word: word.trim() })
    if (existing) return res.status(409).json({ error: 'Word already exists' })

    const doc = await VocabWord.create({
      word: word.trim(), meaning: meaning.trim(),
      wordType: wordType || 'general', difficulty: difficulty || 'medium',
      example: example?.trim() || '', tags: tags || [],
      source: 'manual', addedBy: req.user.id,
    })
    res.status(201).json(doc)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// ── GET /api/vocab/words — dictionary view (paginated, filterable) ─────────────
router.get('/words', authMiddleware, async (req, res) => {
  try {
    const { search, wordType, difficulty, tag, attempted, page = 1, limit = 30 } = req.query
    const filter = {}
    if (search) filter.word = { $regex: search, $options: 'i' }
    if (wordType && wordType !== 'all') filter.wordType = wordType
    if (difficulty && difficulty !== 'all') filter.difficulty = difficulty
    if (tag) filter.tags = tag

    // "attempted" tab — only words this user has tried at least once in a quiz
    if (attempted === 'true') {
      const attemptedProgress = await UserVocabProgress.find({
        userId: req.user.id, seenCount: { $gt: 0 }
      }).select('wordId').lean()
      filter._id = { $in: attemptedProgress.map(p => p.wordId) }
    }

    const total = await VocabWord.countDocuments(filter)
    const words = await VocabWord.find(filter)
      .sort({ createdAt: -1 })
      .skip((+page - 1) * +limit)
      .limit(+limit)
      .lean()

    // Attach user's progress for each word
    const wordIds = words.map(w => w._id)
    const progressList = await UserVocabProgress.find({
      userId: req.user.id, wordId: { $in: wordIds }
    }).lean()
    const progressMap = {}
    progressList.forEach(p => { progressMap[p.wordId.toString()] = p })

    const enriched = words.map(w => ({
      ...w,
      progress: progressMap[w._id.toString()] || null
    }))

    res.json({ words: enriched, total, page: +page, pages: Math.ceil(total / +limit) })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// ── GET /api/vocab/quiz — smart 80/20 word selection ─────────────────────────
router.get('/quiz', authMiddleware, async (req, res) => {
  try {
    const { n = 10, pool = 'all', tag } = req.query
    const count = Math.min(+n, 50)

    // Base word filter
    const wordFilter = {}
    if (pool === 'today') {
      // Words added today (seed + manual)
      const today = new Date(); today.setHours(0,0,0,0)
      wordFilter.createdAt = { $gte: today }
    }
    if (tag) wordFilter.tags = tag

    const allWords = await VocabWord.find(wordFilter).lean()
    if (!allWords.length) return res.json({ words: [] })

    const wordIds = allWords.map(w => w._id)
    const progressList = await UserVocabProgress.find({
      userId: req.user.id, wordId: { $in: wordIds }
    }).lean()

    const progressMap = {}
    progressList.forEach(p => { progressMap[p.wordId.toString()] = p })

    // Categorize: unseen, weak, seen
    const unseen = [], weak = [], seen = []
    allWords.forEach(w => {
      const p = progressMap[w._id.toString()]
      if (!p || p.seenCount === 0)       unseen.push(w)
      else if (p.wrongCount > 0)         weak.push(w)
      else                               seen.push(w)
    })

    // 80/20 logic
    const prioritySlots = Math.ceil(count * 0.8)
    const reviewSlots   = count - prioritySlots

    const shuffle = arr => arr.sort(() => Math.random() - 0.5)

    let selected = []
    // Fill priority slots from unseen + weak
    const priority = shuffle([...unseen, ...weak])
    selected = priority.slice(0, prioritySlots)

    // If priority not enough, fill from seen
    if (selected.length < prioritySlots) {
      const extra = shuffle([...seen]).slice(0, prioritySlots - selected.length)
      selected.push(...extra)
    }

    // Fill review slots from seen
    const reviewPool = shuffle([...seen]).filter(w =>
      !selected.find(s => s._id.toString() === w._id.toString())
    )
    selected.push(...reviewPool.slice(0, reviewSlots))

    // If total still not enough, add more from any pool
    if (selected.length < count) {
      const remaining = shuffle([...unseen, ...weak, ...seen])
        .filter(w => !selected.find(s => s._id.toString() === w._id.toString()))
      selected.push(...remaining.slice(0, count - selected.length))
    }

    // Enrich with progress
    const enriched = selected.slice(0, count).map(w => ({
      ...w,
      progress: progressMap[w._id.toString()] || null
    }))

    const finalWords = shuffle(enriched)

    // ── Build 4-option MCQ for each word: 1 correct meaning + 3 random distractor meanings ──
    const meaningPool = allWords.map(w => w.meaning).filter(Boolean)
    const withOptions = finalWords.map(w => {
      const distractorPool = meaningPool.filter(m => m !== w.meaning)
      const distractors = shuffle([...distractorPool]).slice(0, 3)
      const options = shuffle([w.meaning, ...distractors]) // random position, never fixed
      return { ...w, options }
    })

    res.json({ words: withOptions })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// ── POST /api/vocab/progress — save quiz answer ───────────────────────────────
router.post('/progress', authMiddleware, async (req, res) => {
  try {
    const { wordId, correct } = req.body
    if (!wordId) return res.status(400).json({ error: 'wordId required' })

    const today = new Date().toISOString().split('T')[0]

    const p = await UserVocabProgress.findOneAndUpdate(
      { userId: req.user.id, wordId },
      {
        $inc: {
          seenCount:  1,
          wrongCount: correct ? 0 : 1,
          masteryScore: correct ? 5 : -10,
        },
        $set: { lastSeenAt: new Date(), lastSeenDate: today }
      },
      { upsert: true, new: true }
    )

    // Clamp masteryScore 0-100
    if (p.masteryScore < 0)   await UserVocabProgress.updateOne({ _id: p._id }, { masteryScore: 0 })
    if (p.masteryScore > 100) await UserVocabProgress.updateOne({ _id: p._id }, { masteryScore: 100 })

    res.json({ ok: true, progress: p })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// ── GET /api/vocab/stats — overall user stats ─────────────────────────────────
router.get('/stats', authMiddleware, async (req, res) => {
  try {
    const [totalWords, progressDocs] = await Promise.all([
      VocabWord.countDocuments(),
      UserVocabProgress.find({ userId: req.user.id }).lean()
    ])

    const seen     = progressDocs.filter(p => p.seenCount > 0).length
    const mastered = progressDocs.filter(p => p.masteryScore >= 80).length
    const weak     = progressDocs.filter(p => p.wrongCount > 0 && p.masteryScore < 80).length
    const unseen   = totalWords - seen

    res.json({ totalWords, seen, mastered, weak, unseen })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// ── GET /api/vocab/word-of-day — aaj ka word ─────────────────────────────────
router.get('/word-of-day', authMiddleware, async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0]

    // Find a word user hasn't seen today
    const seen = await UserVocabProgress.find({
      userId: req.user.id,
      lastSeenDate: today
    }).lean()
    const seenIds = seen.map(s => s.wordId)

    let word = await VocabWord.findOne({ _id: { $nin: seenIds } }).lean()
    if (!word) {
      // All seen today — pick random
      word = await VocabWord.findOne().lean()
    }

    res.json({ word })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// ── DELETE /api/vocab/word/:id — delete a word (manual/upload only) ───────────
router.delete('/word/:id', authMiddleware, async (req, res) => {
  try {
    const word = await VocabWord.findById(req.params.id)
    if (!word) return res.status(404).json({ error: 'Word not found' })
    if (word.source === 'seed') return res.status(403).json({ error: 'Cannot delete seed words' })

    await VocabWord.findByIdAndDelete(req.params.id)
    await UserVocabProgress.deleteMany({ wordId: req.params.id })
    res.json({ ok: true })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

export default router