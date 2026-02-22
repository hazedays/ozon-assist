/**
 * 用户认证 Store
 * 使用 Appwrite SDK 处理登录、注册、注销及会话维持
 */
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { Client, Account, type Models } from 'appwrite'

const client = new Client()
  .setEndpoint(import.meta.env.VITE_APPWRITE_ENDPOINT)
  .setProject(import.meta.env.VITE_APPWRITE_PROJECT_ID)

const account = new Account(client)

export const useAuthStore = defineStore('auth', () => {
  const user = ref<Models.User<Models.Preferences> | null>(null)
  const isLoading = ref(false)
  const isAuthenticated = computed(() => !!user.value)

  // 登录
  const login = async (email: string, password: string) => {
    isLoading.value = true
    try {
      // 创建邮箱会话
      await account.createEmailPasswordSession(email, password)

      // 获取当前用户信息
      user.value = await account.get()

      // 保存到 localStorage
      localStorage.setItem('isAuthenticated', 'true')

      return user.value
    } catch (error: any) {
      console.error('Login error:', error)
      throw new Error(error.message || '登录失败')
    } finally {
      isLoading.value = false
    }
  }

  // 注册
  const register = async (email: string, password: string, name: string) => {
    isLoading.value = true
    try {
      // 创建账户
      await account.create('unique()', email, password, name)

      // 自动登录
      await login(email, password)
    } catch (error: any) {
      console.error('Register error:', error)
      throw new Error(error.message || '注册失败')
    } finally {
      isLoading.value = false
    }
  }

  // 登出
  const logout = async () => {
    isLoading.value = true
    try {
      await account.deleteSession('current')
      user.value = null
      localStorage.removeItem('isAuthenticated')
    } catch (error: any) {
      console.error('Logout error:', error)
      throw new Error(error.message || '登出失败')
    } finally {
      isLoading.value = false
    }
  }

  // 检查会话
  const checkSession = async () => {
    isLoading.value = true
    try {
      user.value = await account.get()
      localStorage.setItem('isAuthenticated', 'true')
      return true
    } catch {
      user.value = null
      localStorage.removeItem('isAuthenticated')
      return false
    } finally {
      isLoading.value = false
    }
  }

  // 获取用户信息
  const fetchUser = async () => {
    try {
      user.value = await account.get()
      return user.value
    } catch (_error) {
      console.error('Fetch user error:', _error)
      return null
    }
  }

  // 更新邮箱
  const updateEmail = async (email: string, password: string) => {
    try {
      user.value = await account.updateEmail(email, password)
      return user.value
    } catch (error: any) {
      console.error('Update email error:', error)
      throw new Error(error.message || '更新邮箱失败')
    }
  }

  // 更新密码
  const updatePassword = async (newPassword: string, oldPassword: string) => {
    try {
      user.value = await account.updatePassword(newPassword, oldPassword)
      return user.value
    } catch (error: any) {
      console.error('Update password error:', error)
      throw new Error(error.message || '更新密码失败')
    }
  }

  // 更新用户名
  const updateName = async (name: string) => {
    try {
      user.value = await account.updateName(name)
      return user.value
    } catch (error: any) {
      console.error('Update name error:', error)
      throw new Error(error.message || '更新用户名失败')
    }
  }

  return {
    user,
    isLoading,
    isAuthenticated,
    login,
    register,
    logout,
    checkSession,
    fetchUser,
    updateEmail,
    updatePassword,
    updateName
  }
})
