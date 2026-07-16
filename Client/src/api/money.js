// src/api/money.js
// Thin API wrapper — same shape as api/todos.js, minus offline-first
// (kept deliberately simple for v1; can add offline support later the
// same way todos does, if it turns out to be needed).

import api from './client'

export async function getTransactions({ startDate, endDate, type, category } = {}) {
  const { data } = await api.get('/money', { params: { startDate, endDate, type, category } })
  return data
}

export async function addTransaction(payload) {
  const { data } = await api.post('/money', payload)
  return data
}

export async function updateTransaction(id, payload) {
  const { data } = await api.put(`/money/${id}`, payload)
  return data
}

export async function deleteTransaction(id) {
  const { data } = await api.delete(`/money/${id}`)
  return data
}

export async function getMoneyCategories(type) {
  const { data } = await api.get('/money/categories', { params: { type } })
  return data
}