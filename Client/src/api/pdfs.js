// src/api/pdfs.js
import api from './client'

export async function getPdfs() {
  const res = await api.get('/pdfs')
  return res.data // PdfDoc[]
}

export async function checkPdfAdmin() {
  const res = await api.get('/pdfs/is-admin')
  return res.data.isAdmin
}

export async function getPdf(id) {
  const res = await api.get(`/pdfs/${id}`)
  return res.data
}

export async function uploadPdf(file, title, isGlobal = false) {
  const form = new FormData()
  form.append('file', file)
  form.append('title', title || file.name)
  form.append('global', isGlobal ? 'true' : 'false')
  const res = await api.post('/pdfs/upload', form, { headers: { 'Content-Type': 'multipart/form-data' } })
  return res.data
}

// blob = the exported, annotated PDF (built client-side with pdf-lib)
export async function saveAnnotatedPdf(id, blob) {
  const form = new FormData()
  form.append('file', blob, 'annotated.pdf')
  const res = await api.post(`/pdfs/${id}/annotated`, form, { headers: { 'Content-Type': 'multipart/form-data' } })
  return res.data
}

export async function deletePdf(id) {
  const res = await api.delete(`/pdfs/${id}`)
  return res.data
}