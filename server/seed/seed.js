// seed/seed.js
// Run once: node seed/seed.js
// Loads all question JSON files into MongoDB

import mongoose from 'mongoose'
import dotenv from 'dotenv'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import Question from '../models/Question.js'

dotenv.config()

const __dirname = dirname(fileURLToPath(import.meta.url))

const FILES = [
  'questions_calculation.json',
  'questions_series.json',
  'questions_vocab.json',
  'questions_syllogism.json',
]

async function seed() {
  await mongoose.connect(process.env.MONGO_URI)
  console.log('✅ MongoDB connected')

  for (const file of FILES) {
    const path = join(__dirname, file)
    let questions
    try {
      questions = JSON.parse(readFileSync(path, 'utf-8'))
    } catch (e) {
      console.warn(`⚠️  Skipping ${file}: ${e.message}`)
      continue
    }

    if (!questions.length) {
      console.warn(`⚠️  ${file} is empty, skipping`)
      continue
    }

    // Remove existing seed questions for this game type to avoid duplicates
    const gameType = questions[0]?.gameType
    if (gameType) {
      await Question.deleteMany({ gameType, source: 'seed' })
    }

    await Question.insertMany(questions.map(q => ({ ...q, source: 'seed' })), { ordered: false })
    console.log(`✅ Seeded ${questions.length} questions from ${file}`)
  }

  await mongoose.disconnect()
  console.log('🎉 Seeding complete!')
}

seed().catch(e => { console.error(e); process.exit(1) })
