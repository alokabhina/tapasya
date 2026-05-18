// src/utils/offlineDB.js
// Lightweight IndexedDB wrapper — subjects, sessions, todos cache karo

const DB_NAME    = 'tapasya_offline'
const DB_VERSION = 1

const STORES = {
  subjects: 'subjects',   // { id, name, color, todaySeconds }
  sessions: 'sessions',   // { id, subjectId, date, duration, ... }
  todos:    'todos',      // { id/\_id, text, done, date, ... }
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