// routes/vocab.js
// Vocab Master — personal learning tool (alag from VocabBlitz game)

import express from 'express'
import VocabWord from '../models/VocabWord.js'
import UserVocabProgress from '../models/UserVocabProgress.js'
import UserVocabStreak from '../models/UserVocabStreak.js'
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
      wordType:   ['synonym','antonym','one-word','idiom','root-word','general'].includes(w.type) ? w.type : 'general',
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

// Simple deterministic PRNG (mulberry32) so the same seed always
// produces the same shuffle order — lets us paginate a randomized
// list safely without skipping/duplicating words across pages.
function mulberry32(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
function seededShuffle(arr, seed) {
  const rand = mulberry32(seed)
  const out = [...arr]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

// ── GET /api/vocab/words — dictionary view (paginated, filterable) ─────────────
router.get('/words', authMiddleware, async (req, res) => {
  try {
    const { search, wordType, difficulty, tag, attempted, masteryFilter, mine, letter, page = 1, limit = 30, seed } = req.query
    const filter = {}
    if (search) filter.word = { $regex: search, $options: 'i' }
    if (letter && letter !== 'all') filter.word = { $regex: `^${letter}`, $options: 'i' }
    if (wordType && wordType !== 'all') filter.wordType = wordType
    if (difficulty && difficulty !== 'all') filter.difficulty = difficulty
    if (tag) filter.tags = tag
    if (mine === 'true') filter.addedBy = req.user.id

    // "attempted" tab — only words this user has tried at least once in a quiz
    if (attempted === 'true') {
      const attemptedProgress = await UserVocabProgress.find({
        userId: req.user.id, seenCount: { $gt: 0 }
      }).select('wordId').lean()
      filter._id = { $in: attemptedProgress.map(p => p.wordId) }
    }

    // "Mastered / Weak / Unseen" quick-filter chips
    if (masteryFilter === 'mastered') {
      const ids = await UserVocabProgress.find({
        userId: req.user.id, masteryScore: { $gte: 80 }
      }).select('wordId').lean()
      filter._id = { $in: ids.map(p => p.wordId) }
    } else if (masteryFilter === 'weak') {
      const ids = await UserVocabProgress.find({
        userId: req.user.id, seenCount: { $gt: 0 }, masteryScore: { $lt: 40 }
      }).select('wordId').lean()
      filter._id = { $in: ids.map(p => p.wordId) }
    } else if (masteryFilter === 'unseen') {
      const seenIds = await UserVocabProgress.find({
        userId: req.user.id, seenCount: { $gt: 0 }
      }).select('wordId').lean()
      filter._id = { $nin: seenIds.map(p => p.wordId) }
    }

    // Random order every fresh visit (instead of always createdAt-newest-first),
    // so the same handful of words don't always land on page 1.
    // The client sends a `seed` it generated once per session/load() call, and
    // reuses it for loadMore() pagination calls so pages don't overlap/skip.
    const rngSeed = Number(seed) || Math.floor(Math.random() * 2 ** 31)

    const total = await VocabWord.countDocuments(filter)

    // Pull just the ids+createdAt (cheap) to compute a stable shuffled order,
    // then fetch the actual page slice by _id — keeps this fast even with
    // large dictionaries instead of loading every full doc into memory.
    const idDocs = await VocabWord.find(filter).select('_id').sort({ _id: 1 }).lean()
    const shuffledIds = seededShuffle(idDocs.map(d => d._id.toString()), rngSeed)
    const pageIds = shuffledIds.slice((+page - 1) * +limit, (+page - 1) * +limit + +limit)

    const pageDocs = await VocabWord.find({ _id: { $in: pageIds } }).lean()
    const docsById = {}
    pageDocs.forEach(d => { docsById[d._id.toString()] = d })
    const words = pageIds.map(id => docsById[id]).filter(Boolean)

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

    res.json({ words: enriched, total, page: +page, pages: Math.ceil(total / +limit), seed: rngSeed })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// ── GET /api/vocab/quiz — smart 80/20 word selection ─────────────────────────
router.get('/quiz', authMiddleware, async (req, res) => {
  try {
    const { n = 10, pool = 'all', tag, mode = 'recognition', wordIds } = req.query
    const count = Math.min(+n, 50)
    const now = new Date()

    // ── Custom quiz: user picked specific words (e.g. "give me just these 20") ──
    if (wordIds) {
      const ids = String(wordIds).split(',').map(s => s.trim()).filter(Boolean)
      const allWords = await VocabWord.find({ _id: { $in: ids } }).lean()
      if (!allWords.length) return res.json({ words: [] })

      const progressList = await UserVocabProgress.find({
        userId: req.user.id, wordId: { $in: allWords.map(w => w._id) }
      }).lean()
      const progressMap = {}
      progressList.forEach(p => { progressMap[p.wordId.toString()] = p })

      const shuffle = arr => arr.sort(() => Math.random() - 0.5)
      const enriched = shuffle(allWords.map(w => ({ ...w, progress: progressMap[w._id.toString()] || null })))
      const withOptions = buildOptions(enriched, allWords, mode)
      return res.json({ words: withOptions.slice(0, count) })
    }

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

    const wordIdsAll = allWords.map(w => w._id)
    const progressList = await UserVocabProgress.find({
      userId: req.user.id, wordId: { $in: wordIdsAll }
    }).lean()

    const progressMap = {}
    progressList.forEach(p => { progressMap[p.wordId.toString()] = p })

    // Categorize using SM-2 due dates: unseen, due-now (overdue/never-reviewed-but-attempted), not-due-yet
    const unseen = [], dueNow = [], notDue = []
    allWords.forEach(w => {
      const p = progressMap[w._id.toString()]
      if (!p || p.seenCount === 0) { unseen.push(w); return }
      const due = p.nextReviewDate ? new Date(p.nextReviewDate) : null
      if (!due || due <= now || p.wrongCount > 0) dueNow.push(w)
      else notDue.push(w)
    })

    // 80/20 — 80% priority (unseen + due-now, sorted so most-overdue comes first), 20% review (not yet due)
    const prioritySlots = Math.ceil(count * 0.8)
    const reviewSlots   = count - prioritySlots

    const shuffle = arr => arr.sort(() => Math.random() - 0.5)
    const byMostOverdue = (a, b) => {
      const pa = progressMap[a._id.toString()], pb = progressMap[b._id.toString()]
      const da = pa?.nextReviewDate ? new Date(pa.nextReviewDate).getTime() : 0
      const db = pb?.nextReviewDate ? new Date(pb.nextReviewDate).getTime() : 0
      return da - db // older due date (more overdue) first; unseen (no progress) sort with shuffle below
    }

    let selected = []
    const priorityPool = shuffle([...unseen, ...dueNow])
    // keep the due-now ones biased toward most overdue, unseen interspersed via shuffle above
    priorityPool.sort((a, b) => {
      const aHasProgress = !!progressMap[a._id.toString()]
      const bHasProgress = !!progressMap[b._id.toString()]
      if (aHasProgress && bHasProgress) return byMostOverdue(a, b)
      return 0 // leave shuffle order for unseen vs unseen / unseen vs due mix
    })
    selected = priorityPool.slice(0, prioritySlots)

    // If priority not enough, fill from notDue
    if (selected.length < prioritySlots) {
      const extra = shuffle([...notDue]).slice(0, prioritySlots - selected.length)
      selected.push(...extra)
    }

    // Fill review slots from notDue (already-healthy words, light touch review)
    const reviewPool = shuffle([...notDue]).filter(w =>
      !selected.find(s => s._id.toString() === w._id.toString())
    )
    selected.push(...reviewPool.slice(0, reviewSlots))

    // If total still not enough, add more from any pool
    if (selected.length < count) {
      const remaining = shuffle([...unseen, ...dueNow, ...notDue])
        .filter(w => !selected.find(s => s._id.toString() === w._id.toString()))
      selected.push(...remaining.slice(0, count - selected.length))
    }

    const finalWords = shuffle(selected.slice(0, count).map(w => ({
      ...w,
      progress: progressMap[w._id.toString()] || null
    })))

    const withOptions = buildOptions(finalWords, allWords, mode)
    res.json({ words: withOptions })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// ── Build 4-option MCQ. mode='recognition' → word shown, guess meaning (default).
//    mode='reverse' → meaning shown, guess the word (harder, tests recall). ──
function buildOptions(selectedWords, allWordsPool, mode) {
  const shuffle = arr => [...arr].sort(() => Math.random() - 0.5)
  if (mode === 'reverse') {
    const wordPool = allWordsPool.map(w => w.word).filter(Boolean)
    return selectedWords.map(w => {
      const distractorPool = wordPool.filter(x => x !== w.word)
      const distractors = shuffle(distractorPool).slice(0, 3)
      const options = shuffle([w.word, ...distractors])
      return { ...w, mode: 'reverse', options }
    })
  }
  const meaningPool = allWordsPool.map(w => w.meaning).filter(Boolean)
  return selectedWords.map(w => {
    const distractorPool = meaningPool.filter(m => m !== w.meaning)
    const distractors = shuffle(distractorPool).slice(0, 3)
    const options = shuffle([w.meaning, ...distractors])
    return { ...w, mode: 'recognition', options }
  })
}

// ── POST /api/vocab/progress — save quiz answer ───────────────────────────────
router.post('/progress', authMiddleware, async (req, res) => {
  try {
    const { wordId, correct } = req.body
    if (!wordId) return res.status(400).json({ error: 'wordId required' })

    const today = new Date().toISOString().split('T')[0]
    const existing = await UserVocabProgress.findOne({ userId: req.user.id, wordId })

    // ── SM-2 lite ──────────────────────────────────────────────────────────
    let repetitions  = existing?.repetitions  || 0
    let easeFactor    = existing?.easeFactor   || 2.5
    let intervalDays  = existing?.intervalDays || 0
    let masteryScore  = existing?.masteryScore || 0

    if (correct) {
      repetitions += 1
      if (repetitions === 1)      intervalDays = 1
      else if (repetitions === 2) intervalDays = 6
      else                        intervalDays = Math.round(intervalDays * easeFactor)
      easeFactor = Math.max(1.3, easeFactor + 0.1)
      masteryScore = Math.min(100, masteryScore + 5)
    } else {
      repetitions  = 0
      intervalDays = 1 // review again tomorrow after a miss
      easeFactor   = Math.max(1.3, easeFactor - 0.2)
      masteryScore = Math.max(0, masteryScore - 10)
    }

    const nextReviewDate = new Date()
    nextReviewDate.setDate(nextReviewDate.getDate() + intervalDays)

    const p = await UserVocabProgress.findOneAndUpdate(
      { userId: req.user.id, wordId },
      {
        $inc: { seenCount: 1, wrongCount: correct ? 0 : 1 },
        $set: {
          lastSeenAt: new Date(), lastSeenDate: today,
          repetitions, easeFactor, intervalDays, nextReviewDate,
          masteryScore,
        },
      },
      { upsert: true, new: true }
    )

    // ── Daily streak + target ────────────────────────────────────────────
    let streak = await UserVocabStreak.findOne({ userId: req.user.id })
    if (!streak) streak = new UserVocabStreak({ userId: req.user.id })

    if (streak.lastActiveDate !== today) {
      const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1)
      const yStr = yesterday.toISOString().split('T')[0]
      streak.currentStreak = streak.lastActiveDate === yStr ? streak.currentStreak + 1 : 1
      streak.todayCount = 0
      streak.lastActiveDate = today
    }
    streak.todayCount += 1
    streak.longestStreak = Math.max(streak.longestStreak, streak.currentStreak)
    await streak.save()

    res.json({ ok: true, progress: p, streak })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// ── GET /api/vocab/streak — today's progress toward daily target + streak ────
router.get('/streak', authMiddleware, async (req, res) => {
  try {
    let streak = await UserVocabStreak.findOne({ userId: req.user.id }).lean()
    if (!streak) streak = { dailyTarget: 10, todayCount: 0, currentStreak: 0, longestStreak: 0, lastActiveDate: '' }

    const today = new Date().toISOString().split('T')[0]
    // If user hasn't been active today yet, show today's count as 0 (don't mutate here, just display)
    const todayCount = streak.lastActiveDate === today ? streak.todayCount : 0

    res.json({ ...streak, todayCount })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// ── POST /api/vocab/streak/target — set daily word-revision target ──────────
router.post('/streak/target', authMiddleware, async (req, res) => {
  try {
    const { dailyTarget } = req.body
    const target = Math.max(5, Math.min(100, +dailyTarget || 10))
    const streak = await UserVocabStreak.findOneAndUpdate(
      { userId: req.user.id },
      { $set: { dailyTarget: target } },
      { upsert: true, new: true }
    )
    res.json(streak)
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