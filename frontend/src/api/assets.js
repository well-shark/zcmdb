import api from './index'

export const getAssets = (params) => {
  return api.get('/assets', { params })
}

export const getAsset = (id) => {
  return api.get(`/assets/${id}`)
}

export const createAsset = (data) => {
  return api.post('/assets', data)
}

export const updateAsset = (id, data) => {
  return api.put(`/assets/${id}`, data)
}

export const deleteAsset = (id) => {
  return api.delete(`/assets/${id}`)
}

export const batchImport = (data) => {
  return api.post('/assets/batch-import', data)
}

export const getFieldValues = (assetType, field) => {
  return api.get('/assets/field-values', {
    params: {
      asset_type: assetType,
      field: field
    }
  })
}

export const downloadImportTemplate = (assetType) => {
  return api.get(`/assets/batch-import/template/${assetType}`, {
    responseType: 'blob'
  })
}

export const batchImportAssets = (assetType, file) => {
  const formData = new FormData()
  formData.append('file', file)
  return api.post(`/assets/batch-import?asset_type=${assetType}`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  })
}

export const getExpiringAssets = (assetType, days) => {
  return api.get('/assets/expiring', {
    params: {
      asset_type: assetType,
      days: days
    }
  })
}
