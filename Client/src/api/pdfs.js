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

export async function uploadPdf(file, title, isGlobal = false, folder = '') {
  const form = new FormData()
  form.append('file', file)
  form.append('title', title || file.name)
  form.append('global', isGlobal ? 'true' : 'false')
  if (folder) form.append('folder', folder)
  const res = await api.post('/pdfs/upload', form, { headers: { 'Content-Type': 'multipart/form-data' } })
  return res.data
}

// Uploads multiple files one-by-one into the same folder, reporting
// progress as it goes. Sequential (not Promise.all) on purpose — large
// batches of study PDFs shouldn't all hit Cloudinary at once, and a failed
// file shouldn't take the rest down with it.
export async function uploadPdfsBulk(files, isGlobal = false, folder = '', onProgress) {
  const results = []
  for (let i = 0; i < files.length; i++) {
    const file = files[i]
    try {
      const doc = await uploadPdf(file, file.name.replace(/\.pdf$/i, ''), isGlobal, folder)
      results.push({ file, doc, error: null })
    } catch (e) {
      results.push({ file, doc: null, error: e?.response?.data?.error || 'Upload failed' })
    }
    onProgress?.(i + 1, files.length)
  }
  return results
}

export async function updatePdf(id, { title, folder } = {}) {
  const body = {}
  if (title !== undefined) body.title = title
  if (folder !== undefined) body.folder = folder
  const res = await api.patch(`/pdfs/${id}`, body)
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