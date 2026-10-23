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

// Inverse of localDateTimeToIso — turns a stored UTC ISO string back into the
// "YYYY-MM-DDTHH:mm" local string a datetime-local input expects.
export function isoToLocalInput(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  if (isNaN(d)) return ''
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
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

// Big phone photos are 3-8MB each — shrink them in the browser first
// (max 2000px on the long side, JPEG 85%) so uploads are fast and the
// server's 8MB/pic limit is never hit. Falls back to the original file if
// anything goes wrong (or for GIFs, which would lose their animation).
export async function compressImage(file, maxDim = 2000, quality = 0.85) {
  if (!file?.type?.startsWith('image/') || file.type === 'image/gif') return file
  try {
    const bmp = await createImageBitmap(file, { imageOrientation: 'from-image' })
    const scale = Math.min(1, maxDim / Math.max(bmp.width, bmp.height))
    if (scale === 1 && file.size < 600 * 1024) { bmp.close?.(); return file }
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(bmp.width * scale)
    canvas.height = Math.round(bmp.height * scale)
    const ctx = canvas.getContext('2d')
    ctx.fillStyle = '#ffffff' // JPEG has no alpha — avoid black backgrounds on transparent PNGs
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(bmp, 0, 0, canvas.width, canvas.height)
    bmp.close?.()
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality))
    if (!blob || blob.size >= file.size) return file
    return new File([blob], file.name.replace(/\.[^.]+$/, '') + '.jpg', { type: 'image/jpeg' })
  } catch {
    return file
  }
}

// One library item = optional PDF + 0..10 revision pics (at least one).
export async function uploadBundle({ pdf = null, images = [], title = '', summary = '', isGlobal = false, folder = '', unlockAt = '' }) {
  const form = new FormData()
  if (pdf) form.append('file', pdf)
  const small = await Promise.all(images.map((f) => compressImage(f)))
  small.forEach((f) => form.append('images', f))
  form.append('title', title || pdf?.name || images[0]?.name || '')
  if (summary) form.append('summary', summary)
  form.append('global', isGlobal ? 'true' : 'false')
  if (folder) form.append('folder', folder)
  if (unlockAt) form.append('unlockAt', localDateTimeToIso(unlockAt))
  const res = await api.post('/pdfs/upload', form, { headers: { 'Content-Type': 'multipart/form-data' } })
  return res.data
}

export async function uploadPdf(file, title, isGlobal = false, folder = '', unlockAt = '') {
  return uploadBundle({ pdf: file, title: title || file.name, isGlobal, folder, unlockAt })
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

export async function updatePdf(id, { title, summary, folder, unlockAt } = {}) {
  const body = {}
  if (title !== undefined) body.title = title
  if (summary !== undefined) body.summary = summary
  if (folder !== undefined) body.folder = folder
  if (unlockAt !== undefined) body.unlockAt = unlockAt ? localDateTimeToIso(unlockAt) : ''
  const res = await api.patch(`/pdfs/${id}`, body)
  return res.data
}

// Attach more revision pics to an existing item (e.g. add today's 2 pics to the CA PDF).
export async function addPdfImages(id, files) {
  const form = new FormData()
  const small = await Promise.all(files.map((f) => compressImage(f)))
  small.forEach((f) => form.append('images', f))
  const res = await api.post(`/pdfs/${id}/images`, form, { headers: { 'Content-Type': 'multipart/form-data' } })
  return res.data
}

export async function removePdfImage(id, publicId) {
  const res = await api.delete(`/pdfs/${id}/images`, { params: { pid: publicId } })
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