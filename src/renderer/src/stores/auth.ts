/**
 * 身份认证 Store
 * 业务逻辑驱动的认证状态管理，基于 authApi 实现
 */
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { authApi } from '../api/modules/auth'
import { User } from '../api/types/models/auth'
import { LoginParams, RegisterParams } from '../api/types/params/auth'
import logger from '@renderer/core/logger'

/**
 * 身份认证 Store (采用 kebab-case 命名，文件夹已指明其为 store)
 */
export const useAuthStore = defineStore('auth', () => {
  // 当前登录状态的用户模型
  const user = ref<User | null>(null)

  // 正在进行异步操作的标志
  const isLoading = ref(false)

  /** 是否已完成身份认证并拥有有效会话 */
  const isAuthenticated = computed(() => !!user.value)

  /**
   * 提交登录认证
   * @param params 登录邮箱及密码
   * @returns 认证成功后的用户信息模型
   */
  const login = async (params: LoginParams) => {
    isLoading.value = true
    try {
      const userData = await authApi.login(params)
      user.value = userData
      localStorage.setItem('isAuthenticated', 'true')
      return userData
    } catch (error: any) {
      logger.error('登录认证失败:', error)
      throw error
    } finally {
      isLoading.value = false
    }
  }

  /**
   * 注册新账户并自动登录
   * @param params 注册所需的账户详情
   * @returns 注册并认证成功后的用户信息模型
   */
  const register = async (params: RegisterParams) => {
    isLoading.value = true
    try {
      const userData = await authApi.register(params)
      user.value = userData
      localStorage.setItem('isAuthenticated', 'true')
      return userData
    } catch (error: any) {
      logger.error('注册账户失败:', error)
      throw error
    } finally {
      isLoading.value = false
    }
  }

  /**
   * 注销当前会话并清理本地凭据缓存
   */
  const logout = async () => {
    isLoading.value = true
    try {
      await authApi.logout()
      user.value = null
      localStorage.removeItem('isAuthenticated')
    } catch (error: any) {
      logger.error('注销会话失败:', error)
      throw error
    } finally {
      isLoading.value = false
    }
  }

  /**
   * 检查当前活跃的云端会话，实现持久化登录恢复
   * @returns 是否成功恢复或维持会话
   */
  const checkSession = async () => {
    isLoading.value = true
    try {
      const userData = await authApi.getCurrentUser()
      if (userData) {
        user.value = userData
        localStorage.setItem('isAuthenticated', 'true')
        return true
      }
      return false
    } catch {
      user.value = null
      localStorage.removeItem('isAuthenticated')
      return false
    } finally {
      isLoading.value = false
    }
  }

  /**
   * 获取并同步当前用户信息
   * 若无法获取则清空本地认证状态
   */
  const fetchUser = async () => {
    try {
      const userData = await authApi.getCurrentUser()
      user.value = userData
      return userData
    } catch (error: any) {
      logger.error('获取用户信息失败:', error)
      return null
    }
  }

  /**
   * 修改当前用户的昵称
   * @param name 新的昵称
   */
  const updateName = async (name: string) => {
    try {
      const userData = await authApi.updateName(name)
      user.value = userData
      return userData
    } catch (error: any) {
      logger.error('更新昵称失败:', error)
      throw error
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
    updateName
  }
})
