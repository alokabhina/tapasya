// src/api/folders.js
import api from './client'

export async function getFolders() {
  const res = await api.get('/folders')
  return res.data // [{ _id, name, fromPlaylist }]
}

export async function createFolder(name) {
  const res = await api.post('/folders', { name })
  return res.data
}

export async function deleteFolder(id) {
  const res = await api.delete(`/folders/${id}`)
  return res.data
}