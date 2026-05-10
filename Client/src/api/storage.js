import api from './client'
export async function uploadPhoto(file) {
  const form = new FormData()
  form.append('file', file)
  const { data } = await api.post('/upload/photo', form, {
    headers: { 'Content-Type': 'multipart/form-data' }
  })
  return data.url
}