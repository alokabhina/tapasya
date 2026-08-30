// src/api/pdfs.js
import api from './client'

// datetime-local inputs give a plain "YYYY-MM-DDTHH:mm" string with NO
// timezone info. `new Date(...)` on that string is correctly interpreted
// as the BROWSER's local time (e.g. IST) right here on the client — so we
// convert it to a real UTC ISO string before sending, otherwise the
// server (which usually runs in UTC) would parse the same digits as UTC
// and unlock the PDF hours off from what was actually picked.
function localDateTimeToIso(value) {
  if (!value) return ''
  const d = new Date(value)
  return isNaN(d) ? '' : d.toISOString()
}

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

export async function uploadPdf(file, title, isGlobal = false, folder = '', unlockAt = '') {
  const form = new FormData()
  form.append('file', file)
  form.append('title', title || file.name)
  form.append('global', isGlobal ? 'true' : 'false')
  if (folder) form.append('folder', folder)
  if (unlockAt) form.append('unlockAt', localDateTimeToIso(unlockAt))
  const res = await api.post('/pdfs/upload', form, { headers: { 'Content-Type': 'multipart/form-data' } })
  return res.data
}

// Uploads multiple files one-by-one into the same folder, reporting
// progress as it goes. Sequential (not Promise.all) on purpose — large
// batches of study PDFs shouldn't all hit Cloudinary at once, and a failed
// file shouldn't take the rest down with it.
// unlockAt (optional): a single datetime-local string applied to every file
// in this batch — e.g. upload today's whole set of PDFs but have them all
// unlock together tomorrow morning. Any file can still get its own
// different time afterwards via updatePdf(id, { unlockAt }).
export async function uploadPdfsBulk(files, isGlobal = false, folder = '', onProgress, unlockAt = '') {
  const results = []
  for (let i = 0; i < files.length; i++) {
    const file = files[i]
    try {
      const doc = await uploadPdf(file, file.name.replace(/\.pdf$/i, ''), isGlobal, folder, unlockAt)
      results.push({ file, doc, error: null })
    } catch (e) {
      results.push({ file, doc: null, error: e?.response?.data?.error || 'Upload failed' })
    }
    onProgress?.(i + 1, files.length)
  }
  return results
}

export async function updatePdf(id, { title, folder, unlockAt } = {}) {
  const body = {}
  if (title !== undefined) body.title = title
  if (folder !== undefined) body.folder = folder
  if (unlockAt !== undefined) body.unlockAt = unlockAt ? localDateTimeToIso(unlockAt) : ''
  const res = await api.patch(`/pdfs/${id}`, body)
  return res.data
}

// Renames a whole folder in one go (moves every PDF in oldName -> newName).
export async function renamePdfFolder(oldName, newName) {
  const res = await api.patch('/pdfs/folder/rename', { oldName, newName })
  return res.data // { renamed, folder }
}

// blob = the exported, annotated PDF (built client-side with pdf-lib)
// annotations = the raw stroke data { [pageNum]: Stroke[] } — saved
// alongside the flattened PDF so future sessions reload real, still-
// erasable strokes instead of a flattened image (old marks stay editable).
export async function saveAnnotatedPdf(id, blob, annotations) {
  const form = new FormData()
  form.append('file', blob, 'annotated.pdf')
  if (annotations) form.append('annotationsJson', JSON.stringify(annotations))
  const res = await api.post(`/pdfs/${id}/annotated`, form, { headers: { 'Content-Type': 'multipart/form-data' } })
  return res.data
}

export async function deletePdf(id) {
  const res = await api.delete(`/pdfs/${id}`)
  return res.data
}