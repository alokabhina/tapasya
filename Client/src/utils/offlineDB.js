// src/utils/offlineDB.js
// Lightweight IndexedDB wrapper — subjects, sessions, todos, pdfs cache karo

const DB_NAME    = 'tapasya_offline'
const DB_VERSION = 2 // v2: added pdfs (metadata) + pdfFiles (actual bytes) stores

const STORES = {
  subjects: 'subjects',   // { id, name, color, todaySeconds }
  sessions: 'sessions',   // { id, subjectId, date, duration, ... }
  todos:    'todos',      // { id/\_id, text, done, date, ... }
  pdfs:     'pdfs',       // { id, title, folder, originalUrl, annotationsData, ... } — same shape as GET /api/pdfs
  pdfFiles: 'pdfFiles',   // { id, blob, cachedAt } — the actual PDF bytes, so it opens with zero internet
}

let _db = null

async function getDB() {
  if (_db) return _db
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = (e) => {
      const db = e.target.result
      if (!db.objectStoreNames.contains(STORES.subjects)) {
        db.createObjectStore(STORES.subjects, { keyPath: 'id' })
      }
      if (!db.objectStoreNames.contains(STORES.sessions)) {
        const s = db.createObjectStore(STORES.sessions, { keyPath: 'id' })
        s.createIndex('date', 'date', { unique: false })
      }
      if (!db.objectStoreNames.contains(STORES.todos)) {
        const t = db.createObjectStore(STORES.todos, { keyPath: 'id' })
        t.createIndex('date', 'date', { unique: false })
      }
      if (!db.objectStoreNames.contains(STORES.pdfs)) {
        db.createObjectStore(STORES.pdfs, { keyPath: 'id' })
      }
      if (!db.objectStoreNames.contains(STORES.pdfFiles)) {
        db.createObjectStore(STORES.pdfFiles, { keyPath: 'id' })
      }
    }
    req.onsuccess  = (e) => { _db = e.target.result; resolve(_db) }
    req.onerror    = ()  => reject(req.error)
  })
}

function tx(storeName, mode = 'readonly') {
  return getDB().then(db => {
    const transaction = db.transaction(storeName, mode)
    const store = transaction.objectStore(storeName)
    return { store, transaction }
  })
}

function promisify(req) {
  return new Promise((res, rej) => {
    req.onsuccess = () => res(req.result)
    req.onerror   = () => rej(req.error)
  })
}

// ── Subjects ──────────────────────────────────────────────────────────────────

export async function saveSubjectsOffline(subjects) {
  const { store } = await tx(STORES.subjects, 'readwrite')
  // Clear old + write fresh
  store.clear()
  for (const s of subjects) {
    store.put({ ...s, id: String(s.id || s._id) })
  }
}

export async function getSubjectsOffline() {
  const { store } = await tx(STORES.subjects)
  return promisify(store.getAll())
}

// ── Sessions ──────────────────────────────────────────────────────────────────

export async function saveSessionOffline(session) {
  const { store } = await tx(STORES.sessions, 'readwrite')
  const id = session.id || session._id || `local_${Date.now()}_${Math.random().toString(36).slice(2)}`
  return promisify(store.put({ ...session, id }))
}

export async function saveSessionsOffline(sessions) {
  const { store } = await tx(STORES.sessions, 'readwrite')
  store.clear()
  for (const s of sessions) {
    const id = s.id || s._id || `local_${Date.now()}`
    store.put({ ...s, id })
  }
}

export async function getSessionsOffline(startDate, endDate) {
  const { store } = await tx(STORES.sessions)
  const all = await promisify(store.getAll())
  if (!startDate && !endDate) return all
  return all.filter(s => {
    const d = s.date || ''
    return (!startDate || d >= startDate) && (!endDate || d <= endDate)
  })
}

export async function deleteSessionOffline(id) {
  const { store } = await tx(STORES.sessions, 'readwrite')
  return promisify(store.delete(id))
}

// ── Todos ─────────────────────────────────────────────────────────────────────

export async function saveTodosOffline(todos) {
  const { store } = await tx(STORES.todos, 'readwrite')
  store.clear()
  for (const t of todos) {
    const id = String(t.id || t._id)
    store.put({ ...t, id })
  }
}

export async function getTodosOffline(startDate, endDate) {
  const { store } = await tx(STORES.todos)
  const all = await promisify(store.getAll())
  if (!startDate && !endDate) return all
  return all.filter(t => {
    const d = t.date || ''
    return (!startDate || d >= startDate) && (!endDate || d <= endDate)
  })
}

export async function putTodoOffline(todo) {
  const { store } = await tx(STORES.todos, 'readwrite')
  const id = String(todo.id || todo._id || `local_${Date.now()}`)
  return promisify(store.put({ ...todo, id }))
}

export async function deleteTodoOffline(id) {
  const { store } = await tx(STORES.todos, 'readwrite')
  return promisify(store.delete(String(id)))
}

// ── PDFs (metadata) ──────────────────────────────────────────────────────────
// Same shape as what GET /api/pdfs returns — title, folder, originalUrl,
// annotationsData (the actual strokes, see PdfReader), unlockAt, etc. This
// is what lets PDF Library show your list of PDFs even with zero internet.

export async function savePdfsOffline(docs) {
  const { store } = await tx(STORES.pdfs, 'readwrite')
  store.clear()
  for (const d of docs) {
    store.put({ ...d, id: String(d._id || d.id) })
  }
}

export async function getPdfsOffline() {
  const { store } = await tx(STORES.pdfs)
  return promisify(store.getAll())
}

export async function deletePdfOffline(id) {
  const { store } = await tx(STORES.pdfs, 'readwrite')
  return promisify(store.delete(String(id)))
}

// ── PDF files (actual bytes) ─────────────────────────────────────────────────
// Stored as real Blobs — IndexedDB supports these natively, no base64
// encoding needed. This is what makes a PDF actually OPENABLE offline, not
// just visible in the list.

export async function savePdfFileOffline(id, blob) {
  const { store } = await tx(STORES.pdfFiles, 'readwrite')
  return promisify(store.put({ id: String(id), blob, cachedAt: Date.now() }))
}

export async function getPdfFileOffline(id) {
  const { store } = await tx(STORES.pdfFiles)
  try {
    return await promisify(store.get(String(id)))
  } catch {
    return null
  }
}

export async function hasPdfFileOffline(id) {
  const rec = await getPdfFileOffline(id)
  return !!rec
}

export async function deletePdfFileOffline(id) {
  const { store } = await tx(STORES.pdfFiles, 'readwrite')
  return promisify(store.delete(String(id)))
}

// Roughly how much space all cached PDF files are taking up — handy for a
// "X PDFs available offline (~Y MB)" indicator in the UI.
export async function getPdfFilesOfflineStats() {
  const { store } = await tx(STORES.pdfFiles)
  const all = await promisify(store.getAll())
  return { count: all.length, bytes: all.reduce((sum, r) => sum + (r.blob?.size || 0), 0) }
}