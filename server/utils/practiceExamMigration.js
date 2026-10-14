// server/utils/practiceExamMigration.js
// One-time, idempotent backfill for the new Exam -> Subject hierarchy.
// Every PracticeSubject that still has no examId gets attached to a
// PracticeExam named after its legacy `examCategory` ("Banking" by default);
// the exam is created on the fly if it doesn't exist yet.
//
// Called lazily from routes/practiceExams.js (once per server process) so a
// fresh deploy never shows an empty landing page — no manual script needed.
// Safe to run any number of times: it only touches subjects with examId null.
import PracticeExam from '../models/PracticeExam.js'
import PracticeSubject from '../models/PracticeSubject.js'

let done = false
let inflight = null

export function ensureExamsMigrated() {
  if (done) return Promise.resolve()
  if (inflight) return inflight
  inflight = (async () => {
    const orphans = await PracticeSubject.find({ $or: [{ examId: null }, { examId: { $exists: false } }] })
      .select('_id examCategory createdBy').lean()
    if (orphans.length) {
      const byCategory = new Map()
      for (const s of orphans) {
        const name = (s.examCategory || 'Banking').trim() || 'Banking'
        if (!byCategory.has(name)) byCategory.set(name, { createdBy: s.createdBy, ids: [] })
        byCategory.get(name).ids.push(s._id)
      }
      let order = await PracticeExam.countDocuments()
      for (const [name, { createdBy, ids }] of byCategory) {
        let exam = await PracticeExam.findOne({ name })
        if (!exam) exam = await PracticeExam.create({ name, createdBy, order: order++ })
        await PracticeSubject.updateMany({ _id: { $in: ids } }, { $set: { examId: exam._id } })
      }
    }
    done = true
  })().finally(() => { inflight = null })
  return inflight
}