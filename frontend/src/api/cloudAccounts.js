import api from './index'

export const getCloudAccounts = (params) => {
  return api.get('/cloud-accounts', { params })
}

export const getCloudAccount = (id) => {
  return api.get(`/cloud-accounts/${id}`)
}

export const createCloudAccount = (data) => {
  return api.post('/cloud-accounts', data)
}

export const updateCloudAccount = (id, data) => {
  return api.put(`/cloud-accounts/${id}`, data)
}

export const deleteCloudAccount = (id) => {
  return api.delete(`/cloud-accounts/${id}`)
}

export const createAccessKey = (accountId, data) => {
  return api.post(`/cloud-accounts/${accountId}/access-keys`, data)
}

export const updateAccessKey = (accountId, keyId, data) => {
  return api.put(`/cloud-accounts/${accountId}/access-keys/${keyId}`, data)
}

export const deleteAccessKey = (accountId, keyId) => {
  return api.delete(`/cloud-accounts/${accountId}/access-keys/${keyId}`)
}

export const getCloudProviderValues = () => {
  return api.get('/cloud-accounts/field-values/cloud_provider')
}

