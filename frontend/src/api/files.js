import api from './index'

export const uploadLicenseFile = (file) => {
  const formData = new FormData()
  formData.append('file', file)
  return api.post('/files/license', formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  })
}

export const downloadLicenseFile = (filePath) => {
  return api.get(`/files/license/${filePath}`, { responseType: 'blob' })
}

