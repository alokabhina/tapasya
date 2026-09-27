// server/scripts/fixNegativeMarksSign.js
//
// WHY THIS EXISTS
// ────────────────
// utils/practiceScoring.js does `score -= section.marksWrong` (and the
// question-level override), so marksWrong must be stored as a POSITIVE
// magnitude — utils/practiceTestValidator.js now rejects a negative
// marksWrong on new uploads with an explicit error for exactly this reason.
//
// But that validator only guards the upload path going forward. Any
// PracticeTest document created *before* that fix — if it was saved with
// marksWrong as a negative number (e.g. -0.25, meaning the old code added
// it instead of subtracting) — still has that negative value sitting in
// the DB. With today's scoring.js doing a subtraction, a stored -0.25
// makes `score -= (-0.25)` ADD 0.25 for every wrong answer instead of
// deducting it. That's almost certainly the "purane test mein marks galat
// dikha raha" bug — new tests are fine because the validator now blocks
// bad data at upload time, old ones were never touched.
//
// This script finds every PracticeTest with a negative marksWrong (section
// level or per-question override) and flips it to its positive magnitude,
// leaving everything else untouched.
//
// USAGE
// ─────
//   node server/scripts/fixNegativeMarksSign.js            # dry run — just prints what it would change
//   node server/scripts/fixNegativeMarksSign.js --apply    # actually saves the fix
//
// Safe to re-run — once a value is positive it's left alone (idempotent).

import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import path from 'path'

// Load server/.env explicitly by path, not by cwd — so this still works
// when run from the project root (e.g. `node server/scripts/fixNegativeMarksSign.js`)
// instead of from inside server/.
const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.join(__dirname, '..', '.env') })

if (!process.env.MONGO_URI) {
  console.error('MONGO_URI not found — check that server/.env has a MONGO_URI= line.')
  process.exit(1)
}

import mongoose from 'mongoose'
import { connectDB } from '../utils/db.js'
import PracticeTest from '../models/PracticeTest.js'

const APPLY = process.argv.includes('--apply')

async function main() {
  await connectDB()

  const tests = await PracticeTest.find({})
  let testsTouched = 0
  let fieldsFixed = 0

  for (const test of tests) {
    let touched = false

    for (const section of test.sections) {
      if (section.marksWrong < 0) {
        console.log(`[${test.title}] section "${section.name}": marksWrong ${section.marksWrong} -> ${Math.abs(section.marksWrong)}`)
        section.marksWrong = Math.abs(section.marksWrong)
        touched = true
        fieldsFixed++
      }
      for (const q of section.questions) {
        if (q.marksWrongOverride != null && q.marksWrongOverride < 0) {
          console.log(`[${test.title}] section "${section.name}" Q${q.qNo}: marksWrongOverride ${q.marksWrongOverride} -> ${Math.abs(q.marksWrongOverride)}`)
          q.marksWrongOverride = Math.abs(q.marksWrongOverride)
          touched = true
          fieldsFixed++
        }
      }
    }

    if (touched) {
      testsTouched++
      if (APPLY) await test.save()
    }
  }

  console.log('')
  console.log(`${testsTouched} test(s), ${fieldsFixed} field(s) with a negative marksWrong found.`)
  console.log(APPLY ? 'Saved.' : 'Dry run only — re-run with --apply to actually save these fixes.')

  await mongoose.disconnect()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})