import { create } from 'zustand'
import { login as loginApi, getCurrentUser } from '@/api/auth'

export const useAuthStore = create((set, get) => ({
  user: null,
  token: localStorage.getItem('token') || null,
  isAuthenticated: !!localStorage.getItem('token'),

  login: async (username, password) => {
    try {
      const response = await loginApi(username, password)
      const token = response.access_token
      localStorage.setItem('token', token)
      set({ token, isAuthenticated: true })
      
      // 获取用户信息
      await get().fetchUser()
      
      return response
    } catch (error) {
      throw error
    }
  },

  fetchUser: async () => {
    try {
      const userData = await getCurrentUser()
      set({ user: userData })
      return userData
    } catch (error) {
      // Token可能已过期
      get().logout()
      throw error
    }
  },

  logout: () => {
    set({ user: null, token: null, isAuthenticated: false })
    localStorage.removeItem('token')
    window.location.href = '/login'
  }
}))

// 初始化时获取用户信息
const token = localStorage.getItem('token')
if (token) {
  useAuthStore.getState().fetchUser().catch(() => {
    useAuthStore.getState().logout()
  })
}

