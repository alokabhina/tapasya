// server/utils/practiceTestValidator.js
// Validates an admin-uploaded practice-test JSON payload (plan doc Section
// 5) before it's saved as a PracticeTest. Collects every problem instead of
// stopping at the first one, so the admin sees the full error list in one
// go on the upload screen — no fix-one-reupload-find-the-next loop.
import { normalizeAllTopics } from './topicNormalizer.js'

const DIRECTION_TYPES = ['passage', 'puzzle', 'data-table', 'sentence-set', 'instruction']
const DIFFICULTIES = ['easy', 'medium', 'hard']

// existingTopics: every distinct topic already used under the target
// subject — passed in by the route so fuzzy-matching (topicNormalizer.js)
// has something real to compare against.
export function validatePracticeTestPayload(payload, existingTopics = []) {
  const errors = []

  if (!payload || typeof payload !== 'object') {
    return { valid: false, errors: ['Payload JSON object nahi hai'], normalized: null, topicSuggestions: [] }
  }
  if (!payload.title?.trim()) errors.push('title required hai')
  if (!Array.isArray(payload.sections) || payload.sections.length === 0) {
    errors.push('sections ek non-empty array hona chahiye')
    return { valid: false, errors, normalized: null, topicSuggestions: [] }
  }

  const allSuggestions = []

  const normalizedSections = payload.sections.map((section, sIdx) => {
    const label = section?.name ? `Section "${section.name}"` : `Section #${sIdx + 1}`

    if (!section?.name?.trim()) errors.push(`${label}: name required hai`)
    if (!(section?.durationSec > 0)) errors.push(`${label}: durationSec ek positive number hona chahiye`)
    if (!Array.isArray(section?.questions) || section.questions.length === 0) {
      errors.push(`${label}: kam se kam ek question chahiye`)
    }

    const directions = Array.isArray(section?.directions) ? section.directions : []
    const directionIds = new Set()
    directions.forEach((d, dIdx) => {
      if (!d?.groupId) { errors.push(`${label}, direction #${dIdx + 1}: groupId required hai`); return }
      if (directionIds.has(d.groupId)) errors.push(`${label}: duplicate direction groupId "${d.groupId}"`)
      directionIds.add(d.groupId)
      if (!DIRECTION_TYPES.includes(d.type)) errors.push(`${label}, direction "${d.groupId}": type in mein se ek hona chahiye — ${DIRECTION_TYPES.join(', ')}`)
      if (!d.content?.trim()) errors.push(`${label}, direction "${d.groupId}": content required hai`)
    })

    const seenQNos = new Set()
    const questions = Array.isArray(section?.questions) ? section.questions : []
    questions.forEach((q) => {
      const qLabel = `${label}, Question ${q?.qNo ?? '?'}`
      if (q?.qNo == null) { errors.push(`${qLabel}: qNo required hai`); return }
      if (seenQNos.has(q.qNo)) errors.push(`${qLabel}: is section mein qNo duplicate hai`)
      seenQNos.add(q.qNo)

      if (!q.questionText?.trim()) errors.push(`${qLabel}: questionText required hai`)
      if (!Array.isArray(q.options) || q.options.length < 2) {
        errors.push(`${qLabel}: kam se kam 2 options chahiye`)
      } else {
        const keys = q.options.map((o) => o.key)
        if (new Set(keys).size !== keys.length) errors.push(`${qLabel}: option keys unique honi chahiye`)
        if (!keys.includes(q.correctKey)) errors.push(`${qLabel}: correctKey "${q.correctKey}" options mein nahi mila`)
      }
      if (q.groupId != null && !directionIds.has(q.groupId)) {
        errors.push(`${qLabel}: groupId "${q.groupId}" ka koi matching direction is section mein nahi hai`)
      }
      if (q.difficulty && !DIFFICULTIES.includes(q.difficulty)) {
        errors.push(`${qLabel}: difficulty in mein se ek honi chahiye — ${DIFFICULTIES.join(', ')}`)
      }
      if (!q.topic?.trim()) errors.push(`${qLabel}: topic required hai`)
    })

    // Topic normalization sirf tab chalta hai jab yeh section otherwise clean
    // ho — ek error-bhara section pe "similar topic" suggestion dikhana
    // besides-the-point hai.
    const { questions: normalizedQuestions, suggestions } = normalizeAllTopics(questions, existingTopics)
    suggestions.forEach((s) => allSuggestions.push({ section: section?.name, ...s }))

    const marksCorrect = section?.marksCorrect ?? 1
    const sectionTotalMarks = normalizedQuestions.length * marksCorrect
    // No cutoff given by the admin? Default it to 75% of that section's
    // total marks instead of leaving it null (null used to mean "no cutoff
    // shown at all" on the result page, which isn't what an admin who just
    // forgot to type a number wants).
    const cutoff = section?.cutoff != null && section?.cutoff !== ''
      ? Number(section.cutoff)
      : Math.round(sectionTotalMarks * 0.75 * 100) / 100

    return {
      name: section?.name?.trim() || `Section ${sIdx + 1}`,
      order: sIdx,
      durationSec: section?.durationSec || 0,
      marksCorrect,
      marksWrong: section?.marksWrong ?? 0.25,
      cutoff,
      hasCalculator: !!section?.hasCalculator,
      directions,
      questions: normalizedQuestions,
    }
  })

  const totalQuestions = normalizedSections.reduce((sum, s) => sum + s.questions.length, 0)
  const totalMarks = normalizedSections.reduce((sum, s) => sum + s.questions.length * (s.marksCorrect || 0), 0)
  const totalDurationSec = normalizedSections.reduce((sum, s) => sum + (s.durationSec || 0), 0)

  return {
    valid: errors.length === 0,
    errors,
    topicSuggestions: allSuggestions,
    normalized: errors.length === 0 ? {
      title: payload.title.trim(),
      examTag: payload.examTag || '',
      instructions: payload.instructions || '',
      sections: normalizedSections,
      totalQuestions, totalMarks, totalDurationSec,
    } : null,
  }
}