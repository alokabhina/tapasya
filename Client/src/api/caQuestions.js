// src/api/caQuestions.js
import api from './client'

export async function getCAQuestionsMeta() {
  const res = await api.get('/ca-questions/meta')
  return res.data // { categories, months }
}

export async function checkCAQuestionsAdmin() {
  const res = await api.get('/ca-questions/is-admin')
  return res.data.isAdmin
}

export async function getCAQuestions({ month, category, page = 1, limit = 30 } = {}) {
  const res = await api.get('/ca-questions', { params: { month, category, page, limit } })
  return res.data // { items, total, page, pages }
}

export async function getCAQuestionsPractice({ month, category, count = 10 } = {}) {
  const res = await api.get('/ca-questions/practice', { params: { month, category, count } })
  return res.data.items
}

export async function bulkImportCAQuestions(items, month) {
  const res = await api.post('/ca-questions/bulk-import', { items, month })
  return res.data // { inserted, skipped, errors }
}

export async function deleteCAQuestion(id) {
  const res = await api.delete(`/ca-questions/${id}`)
  return res.data
}