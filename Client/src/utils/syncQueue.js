// src/utils/syncQueue.js
// Pending operations queue — online aane par flush karo

import { saveSession } from '@/api/sessions'
import { addTodo as apiAddTodo, updateTodo as apiUpdateTodo, deleteTodo as apiDeleteTodo } from '@/api/todos'
import { putTodoOffline, deleteTodoOffline } from './offlineDB'

const QUEUE_KEY = 'tapasya_sync_queue'

export function getQueue() {
  try { return JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]') } catch { return [] }
}

export function addToQueue(op) {
  const queue = getQueue()
  queue.push({ ...op, queuedAt: Date.now() })
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue))
}

function saveQueue(q) {
  localStorage.setItem(QUEUE_KEY, JSON.stringify(q))
}

// ── Enqueue helpers ───────────────────────────────────────────────────────────

export function queueSession(session) {
  addToQueue({ type: 'SAVE_SESSION', payload: session })
}

export function queueAddTodo(todo) {
  addToQueue({ type: 'ADD_TODO', payload: todo })
}

export function queueUpdateTodo(id, data) {
  // Collapse duplicate updates for same todo
  const queue = getQueue().filter(op =>
    !(op.type === 'UPDATE_TODO' && op.payload.id === id)
  )
  queue.push({ type: 'UPDATE_TODO', payload: { id, data }, queuedAt: Date.now() })
  saveQueue(queue)
}

export function queueDeleteTodo(id) {
  // Remove any pending add/update for this todo — no point syncing
  const queue = getQueue().filter(op =>
    !((op.type === 'ADD_TODO' || op.type === 'UPDATE_TODO') &&
      String(op.payload.id || op.payload._id) === String(id))
  )
  queue.push({ type: 'DELETE_TODO', payload: { id }, queuedAt: Date.now() })
  saveQueue(queue)
}

// ── Flush — call when back online ─────────────────────────────────────────────

let _flushing = false

export async function flushQueue() {
  if (_flushing) return
  const queue = getQueue()
  if (queue.length === 0) return

  _flushing = true
  const remaining = []

  for (const op of queue) {
    try {
      if (op.type === 'SAVE_SESSION') {
        await saveSession(op.payload)

      } else if (op.type === 'ADD_TODO') {
        const saved = await apiAddTodo(op.payload)
        // Update offline store with server-assigned id
        await putTodoOffline({ ...op.payload, ...saved, id: String(saved._id || saved.id) })

      } else if (op.type === 'UPDATE_TODO') {
        await apiUpdateTodo(op.payload.id, op.payload.data)

      } else if (op.type === 'DELETE_TODO') {
        try {
          await apiDeleteTodo(op.payload.id)
        } catch (e) {
          // 404 = already deleted on server — ok
          if (e?.response?.status !== 404) throw e
        }
        await deleteTodoOffline(op.payload.id)
      }
    } catch (err) {
      console.warn('[SyncQueue] op failed, will retry:', op.type, err?.message)
      remaining.push(op)
    }
  }

  saveQueue(remaining)
  _flushing = false

  if (remaining.length < queue.length) {
    console.log(`[SyncQueue] Flushed ${queue.length - remaining.length} ops, ${remaining.length} remaining`)
  }
}

export function getPendingCount() {
  return getQueue().length
}