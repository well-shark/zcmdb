import api from './index'

export const exportDatabase = () => {
  return api.get('/migration/export', {
    responseType: 'json'
  })
}

export const importDatabase = (file) => {
  const formData = new FormData()
  formData.append('file', file)
  return api.post('/migration/import', formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  })
}

