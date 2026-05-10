import api from './client'
export const getTodos    = (startDate, endDate) =>
  api.get('/todos', { params: { startDate, endDate } }).then(r => r.data)
export const addTodo     = (data)       => api.post('/todos', data).then(r => r.data)
export const updateTodo  = (id, data)   => api.put(`/todos/${id}`, data).then(r => r.data)
export const deleteTodo  = (id)         => api.delete(`/todos/${id}`).then(r => r.data)