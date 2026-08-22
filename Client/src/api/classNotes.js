// src/api/classNotes.js
import api from './client'

export async function getClassNotes({ subject, q, page = 1, limit = 20 } = {}) {
  const res = await api.get('/class-notes', { params: { subject, q, page, limit } })
  return res.data // { items, total, page, pages }
}

export async function getClassNotesMeta() {
  const res = await api.get('/class-notes/meta')
  return res.data // { subjects }
}

export async function checkClassNotesAdmin() {
  const res = await api.get('/class-notes/is-admin')
  return res.data.isAdmin
}

export async function bulkImportClassNotes(items) {
  const res = await api.post('/class-notes/bulk-import', { items })
  return res.data // { inserted, skipped, errors }
}

export async function updateClassNote(id, update) {
  const res = await api.put(`/class-notes/${id}`, update)
  return res.data
}

export async function deleteClassNote(id) {
  const res = await api.delete(`/class-notes/${id}`)
  return res.data
}
