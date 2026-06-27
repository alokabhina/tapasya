// seed/seedVocab.js
// Run once: node seed/seedVocab.js
// Seeds VocabWord collection with initial bank exam vocabulary

import mongoose from 'mongoose'
import dotenv from 'dotenv'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import VocabWord from '../models/VocabWord.js'

dotenv.config()

const __dirname = dirname(fileURLToPath(import.meta.url))

async function seedVocab() {
  await mongoose.connect(process.env.MONGO_URI)
  console.log('✅ MongoDB connected')

  const words = JSON.parse(readFileSync(join(__dirname, 'vocab_seed.js'), 'utf-8'))

  // Remove existing seed words to avoid duplicates
  await VocabWord.deleteMany({ source: 'seed' })
  console.log('🗑️  Cleared existing seed words')

  const inserted = await VocabWord.insertMany(
    words.map(w => ({ ...w, source: 'seed', addedBy: null })),
    { ordered: false }
  )
  console.log(`✅ Seeded ${inserted.length} vocab words`)

  await mongoose.disconnect()
  console.log('🎉 Vocab seeding complete!')
}

seedVocab().catch(e => { console.error(e); process.exit(1) })