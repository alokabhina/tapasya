// src/api/subjects.js — offline-first

import api from './client'
import { saveSubjectsOffline, getSubjectsOffline } from '@/utils/offlineDB'

export async function getSubjects() {
  if (navigator.onLine) {
    try {
      const data = await api.get('/subjects').then(r => r.data)
      await saveSubjectsOffline(data.map(s => ({ ...s, id: String(s._id || s.id) })))
      return data
    } catch {
      return getSubjectsOffline()
    }
  }
  return getSubjectsOffline()
}

export async function addSubject(data) {
  if (navigator.onLine) {
    const saved = await api.post('/subjects', data).then(r => r.data)
    const subjects = await getSubjectsOffline()
    await saveSubjectsOffline([
      ...subjects,
      { ...saved, id: String(saved._id || saved.id) },
    ])
    return saved
  }
  // Offline: create local temp subject
  const local = { ...data, id: `local_${Date.now()}`, _id: `local_${Date.now()}` }
  const subjects = await getSubjectsOffline()
  await saveSubjectsOffline([...subjects, local])
  return local
}

export async function updateSubject(id, data) {
  // Optimistic local update
  const subjects = await getSubjectsOffline()
  await saveSubjectsOffline(subjects.map(s => s.id === String(id) ? { ...s, ...data } : s))

  if (navigator.onLine) {
    return api.put(`/subjects/${id}`, data).then(r => r.data)
  }
  return { ...data, id }
}

export async function deleteSubject(id) {
  const subjects = await getSubjectsOffline()
  await saveSubjectsOffline(subjects.filter(s => s.id !== String(id)))

  if (navigator.onLine) {
    return api.delete(`/subjects/${id}`).then(r => r.data)
  }
  return { ok: true }
}