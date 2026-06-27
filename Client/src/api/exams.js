// src/api/exams.js
import api from './client'

export const getExams     = ()       => api.get('/exams').then(r => r.data)
export const createExam   = (data)   => api.post('/exams', data).then(r => r.data)
export const updateExam   = (id, d)  => api.put(`/exams/${id}`, d).then(r => r.data)
export const deleteExam   = (id)     => api.delete(`/exams/${id}`).then(r => r.data)