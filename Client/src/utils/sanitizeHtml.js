// src/utils/sanitizeHtml.js
// Minimal allowlist-style sanitizer for admin-authored direction/question
// HTML (tables, <p>, <b>, etc — plan doc Section 4.3/4.4 allow raw HTML in
// `direction.content` and `question.questionText`). Content only ever comes
// from the 2 trusted practice-admin emails, but we still strip anything
// script-like defensively (plan doc Section 14 edge case checklist).
//
// Shared between components/practicetest/SplitQuestionView.js (live
// engine) and pages/PracticeTestSolutions.jsx (review) so both render
// exactly the same trusted subset.
export function sanitizeHtml(html) {
  if (!html) return ''
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<iframe[\s\S]*?<\/iframe>/gi, '')
    .replace(/ on\w+="[^"]*"/gi, '')
    .replace(/ on\w+='[^']*'/gi, '')
    .replace(/javascript:/gi, '')
}