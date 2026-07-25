// src/api/todos.js — offline-first

import api from './client'
import { putTodoOffline, getTodosOffline, deleteTodoOffline, saveTodosOffline } from '@/utils/offlineDB'
import { queueAddTodo, queueUpdateTodo, queueDeleteTodo } from '@/utils/syncQueue'

// Home.jsx (and any other mounted page) listens for this to refresh its
// todo widgets — without it, a todo added on /todo wouldn't show up on
// Home's card until a full page reload, since Home only fetched once on mount.
function notifyTodosChanged() {
  window.dispatchEvent(new CustomEvent('tapasya:todos-changed'))
}

// ── GET todos ─────────────────────────────────────────────────────────────────
export async function getTodos(startDate, endDate) {
  if (navigator.onLine) {
    try {
      const data = await api.get('/todos', { params: { startDate, endDate } }).then(r => r.data)
      // Merge into offline store (don't wipe other date ranges)
      const allOffline = await getTodosOffline()
      const outside = allOffline.filter(t => {
        const d = t.date || ''
        return !(!startDate || d >= startDate) || !(!endDate || d <= endDate)
      })
      await saveTodosOffline([
        ...outside,
        ...data.map(t => ({ ...t, id: String(t._id || t.id) })),
      ])
      return data
    } catch (err) {
      console.warn('[Todos] Server failed, using cache:', err.message)
      return getTodosOffline(startDate, endDate)
    }
  }
  return getTodosOffline(startDate, endDate)
}

// ── ADD todo ──────────────────────────────────────────────────────────────────
export async function addTodo(data) {
  const localId = `local_${Date.now()}_${Math.random().toString(36).slice(2)}`
  const local = { ...data, id: localId, _id: localId, done: false, createdAt: new Date().toISOString() }

  // Offline-first: save immediately
  await putTodoOffline(local)
  notifyTodosChanged()

  if (navigator.onLine) {
    try {
      const saved = await api.post('/todos', data).then(r => r.data)
      const withId = { ...saved, id: String(saved._id || saved.id) }
      await putTodoOffline(withId)
      return withId
    } catch (err) {
      console.warn('[Todos] Add failed, queued:', err.message)
      queueAddTodo(data)
      return local
    }
  } else {
    queueAddTodo(data)
    return local
  }
}

// ── UPDATE todo ───────────────────────────────────────────────────────────────
export async function updateTodo(id, data) {
  // Optimistic local update
  const allOffline = await getTodosOffline()
  const updated = allOffline.map(t => String(t.id) === String(id) ? { ...t, ...data } : t)
  await saveTodosOffline(updated)
  notifyTodosChanged()

  if (navigator.onLine) {
    try {
      return await api.put(`/todos/${id}`, data).then(r => r.data)
    } catch (err) {
      console.warn('[Todos] Update failed, queued:', err.message)
      queueUpdateTodo(id, data)
      return { ...data, id }
    }
  } else {
    queueUpdateTodo(id, data)
    return { ...data, id }
  }
}

// ── DELETE todo ───────────────────────────────────────────────────────────────
export async function deleteTodo(id) {
  await deleteTodoOffline(String(id))
  notifyTodosChanged()

  if (navigator.onLine) {
    try {
      return await api.delete(`/todos/${id}`).then(r => r.data)
    } catch (err) {
      console.warn('[Todos] Delete failed, queued:', err.message)
      queueDeleteTodo(id)
      return { ok: true }
    }
  } else {
    queueDeleteTodo(id)
    return { ok: true }
  }
}