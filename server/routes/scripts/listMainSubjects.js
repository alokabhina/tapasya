// scripts/debugSyllabusSubjectLinks.js
//
// The previous script (listMainSubjects.js) iterated Subjects and counted
// matching SyllabusTopics for each — but it showed 0 for every subject,
// even ones obviously created from Syllabus Tracker. That's unexpected,
// so this script comes at it from the OTHER direction: it reads every
// SyllabusTopic directly, groups them by their subjectId, and reports:
//   - how many topics reference that subjectId
//   - whether a Subject document with that exact _id actually exists
//   - if it exists, what its name/scope currently are
//
// This will tell us definitively whether the topics are pointing at real
// Subject documents (and the previous script had a query bug) or at
// subjectIds that don't correspond to any current Subject (orphaned link).
//
// Run with:  node scripts/debugSyllabusSubjectLinks.js
// Read-only — makes no changes.

import mongoose from 'mongoose'
import dotenv from 'dotenv'
import Subject from '../models/Subject.js'
import SyllabusTopic from '../models/Syllabus.js'

dotenv.config()

async function run() {
  await mongoose.connect(process.env.MONGO_URI)
  console.log('Connected.\n')

  const topics = await SyllabusTopic.find({}).select('subjectId userId').lean()
  console.log(`Total SyllabusTopic documents in DB: ${topics.length}\n`)

  if (topics.length === 0) {
    console.log('No syllabus topics exist at all in the database.')
    await mongoose.disconnect()
    return
  }

  // Group topic count by subjectId (as string)
  const countBySubjectId = {}
  for (const t of topics) {
    const key = t.subjectId ? String(t.subjectId) : '(null/undefined)'
    countBySubjectId[key] = (countBySubjectId[key] || 0) + 1
  }

  const uniqueIds = Object.keys(countBySubjectId)
  console.log(`Unique subjectId values referenced by topics: ${uniqueIds.length}\n`)

  console.log('subjectId'.padEnd(28), 'TopicCount'.padEnd(12), 'SubjectExists?'.padEnd(16), 'Subject Name (if found)')
  console.log('-'.repeat(100))

  for (const id of uniqueIds) {
    let subjectDoc = null
    if (mongoose.Types.ObjectId.isValid(id)) {
      subjectDoc = await Subject.findById(id).lean()
    }
    console.log(
      id.padEnd(28),
      String(countBySubjectId[id]).padEnd(12),
      (subjectDoc ? 'YES' : 'NO - missing!').padEnd(16),
      subjectDoc ? `"${subjectDoc.name}" (scope: ${subjectDoc.scope || 'none'})` : ''
    )
  }

  const missing = uniqueIds.filter(id => !mongoose.Types.ObjectId.isValid(id))
  if (missing.length) {
    console.log(`\n${missing.length} topic(s) have an invalid/non-ObjectId subjectId value:`, missing)
  }

  await mongoose.disconnect()
}

run().catch((e) => {
  console.error('Failed:', e)
  process.exit(1)
})