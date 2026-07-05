// src/api/admin.js
import api from './client'

export const ADMIN_EMAIL = 'alokabhiii9@gmail.com'

export const getOverview = () => api.get('/admin/overview').then(r => r.data)

export const getUsers = (search = '', page = 1) =>
  api.get('/admin/users', { params: { search, page } }).then(r => r.data)

export const getUserDetail = (id) => api.get(`/admin/users/${id}`).then(r => r.data)

export const banUser = (id, banned, reason = '') =>
  api.put(`/admin/users/${id}/ban`, { banned, reason }).then(r => r.data)

export const timeoutUser = (id, hours, reason = '') =>
  api.put(`/admin/users/${id}/timeout`, { hours, reason }).then(r => r.data)

export const updateUser = (id, updates) => api.put(`/admin/users/${id}`, updates).then(r => r.data)

export const deleteUser = (id) => api.delete(`/admin/users/${id}`).then(r => r.data)

export const getGroups = () => api.get('/admin/groups').then(r => r.data)

export const deleteGroup = (id) => api.delete(`/admin/groups/${id}`).then(r => r.data)