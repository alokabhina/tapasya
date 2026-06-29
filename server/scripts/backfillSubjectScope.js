// scripts/backfillSubjectScope.js
//
// One-time migration: before the `scope` field existed, "Add subject"
// inside Syllabus Tracker created rows in the *same* Subject collection
// used by Home/Timer — which is why old syllabus-only subjects still
// show up on the Home page even after the code fix.
//
// This script finds subjects that:
//   - have no `scope` set (i.e. predate this field), AND
//   - are referenced by at least one SyllabusTopic, AND
//   - are NOT referenced by any Timer Session
// ...and marks them `scope: 'syllabus'`, so they stop appearing on Home.
//
// Subjects used by both Syllabus and Timer, or only by Timer, or by
// neither, are left untouched (kept as 'main') — safer to leave a subject
// visible than to accidentally hide a real study subject.
//
// Run once with:  node scripts/backfillSubjectScope.js
// Safe to re-run — it's idempotent (only touches scope-less docs).

import mongoose from 'mongoose'
import dotenv from 'dotenv'
import Subject from '../models/Subject.js'
import SyllabusTopic from '../models/Syllabus.js'
import Session from '../models/Session.js'

dotenv.config()

async function run() {
  await mongoose.connect(process.env.MONGO_URI)
  console.log('Connected. Scanning subjects without a scope...')

  const legacySubjects = await Subject.find({ scope: { $exists: false } }).lean()
  console.log(`Found ${legacySubjects.length} subject(s) with no scope set.`)

  let migrated = 0
  for (const sub of legacySubjects) {
    const [usedInSyllabus, usedInSessions] = await Promise.all([
      SyllabusTopic.exists({ subjectId: sub._id }),
      Session.exists({ subjectId: sub._id }),
    ])

    if (usedInSyllabus && !usedInSessions) {
      await Subject.updateOne({ _id: sub._id }, { $set: { scope: 'syllabus' } })
      migrated++
      console.log(`  -> "${sub.name}" (${sub._id}) marked as scope: syllabus`)
    } else {
      await Subject.updateOne({ _id: sub._id }, { $set: { scope: 'main' } })
    }
  }

  console.log(`Done. ${migrated} subject(s) re-classified as syllabus-only.`)
  await mongoose.disconnect()
}

run().catch((e) => {
  console.error('Migration failed:', e)
  process.exit(1)
})