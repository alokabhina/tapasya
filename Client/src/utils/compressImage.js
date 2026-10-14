// src/utils/compressImage.js
// Shrinks an admin-pasted screenshot before upload: max 1400px wide, WebP.
// A typical full-screen snip (1-3 MB PNG) becomes ~80-250 KB, which keeps
// uploads fast, Cloudinary storage small, and the request well under the
// server's 4 MB limit. GIF/SVG are passed through untouched; if re-encoding
// somehow isn't smaller, the original file is kept.
export async function compressImage(file, { maxWidth = 1400, quality = 0.9 } = {}) {
  if (!file?.type?.startsWith('image/') || file.type === 'image/gif' || file.type === 'image/svg+xml') return file
  try {
    const bitmap = await loadBitmap(file)
    const scale = Math.min(1, maxWidth / bitmap.width)
    const w = Math.max(1, Math.round(bitmap.width * scale))
    const h = Math.max(1, Math.round(bitmap.height * scale))
    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d')
    ctx.drawImage(bitmap, 0, 0, w, h)
    bitmap.close?.()
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/webp', quality))
    if (!blob || blob.size >= file.size) return file
    const base = (file.name || 'image').replace(/\.[^.]+$/, '')
    return new File([blob], `${base}.webp`, { type: 'image/webp' })
  } catch {
    return file
  }
}

function loadBitmap(file) {
  if (typeof createImageBitmap === 'function') return createImageBitmap(file)
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = URL.createObjectURL(file)
  })
}