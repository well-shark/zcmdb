import api from './index'

export const getTags = (params) => {
  return api.get('/tags', { params })
}

export const createTag = (data) => {
  return api.post('/tags', data)
}

export const updateTag = (id, data) => {
  return api.put(`/tags/${id}`, data)
}

export const deleteTag = (id) => {
  return api.delete(`/tags/${id}`)
}

export const getAssetTags = (assetId) => {
  return api.get(`/tags/assets/${assetId}/tags`)
}

export const addAssetTags = (assetId, tagIds) => {
  return api.post(`/tags/assets/${assetId}/tags`, tagIds)
}

export const removeAssetTag = (assetId, tagId) => {
  return api.delete(`/tags/assets/${assetId}/tags/${tagId}`)
}

export const setAssetTags = (assetId, tagIds) => {
  return api.put(`/tags/assets/${assetId}/tags`, tagIds)
}

