/**
 * 身份认证 IPC & 云端服务接口
 * 负责封装与 Appwrite 后端的通信逻辑，实现账户管理、登录登录与注销
 */
import { Client, Account, ID } from 'appwrite'
import {
  LoginParams,
  RegisterParams,
  UpdateEmailParams,
  UpdatePasswordParams
} from '../types/params/auth'
import { IAuthApi, User } from '../types/models/auth'
import logger from '@renderer/core/logger'

// 配置 Appwrite 客户端
const client = new Client()
  .setEndpoint(import.meta.env.VITE_APPWRITE_ENDPOINT)
  .setProject(import.meta.env.VITE_APPWRITE_PROJECT_ID)

// 初始化账户接口
const account = new Account(client)

/**
 * 身份认证 API 调用对象
 * 管理所有由 Appwrite 托管的凭据操作及状态检查
 */
export const authApi: IAuthApi = {
  /**
   * 提交登录认证，建立邮箱会话并获取当前用户信息
   * @param params 登录所需的邮箱及密码
   * @returns 认证成功后的用户信息模型
   */
  async login({ email, password }: LoginParams): Promise<User> {
    try {
      await account.createEmailPasswordSession({ email, password })
      return await account.get()
    } catch (error: any) {
      logger.error('登录异常:', error)
      throw new Error(error.message || '登录失败，请核实您的账户凭据')
    }
  },

  /**
   * 注册并初始化账户，随后自动登录以建立会话
   * @param params 注册所需的邮箱、密码及可选的用户姓名
   * @returns 注册并认证成功后的用户信息模型
   */
  async register({ email, password, name }: RegisterParams): Promise<User> {
    try {
      await account.create({
        userId: ID.unique(),
        email,
        password,
        name: name || email.split('@')[0]
      })
      return await this.login({ email, password })
    } catch (error: any) {
      logger.error('注册异常:', error)
      throw new Error(error.message || '账户初始化失败，请稍后重试')
    }
  },

  /**
   * 获取当前活跃会话的用户信息，判断是否为认证状态
   * @returns 当前用户信息对象，若无会话则返回 null
   */
  async getCurrentUser(): Promise<User | null> {
    try {
      return await account.get()
    } catch {
      return null
    }
  },

  /**
   * 注销当前所有会话并清理本地凭据
   */
  async logout(): Promise<void> {
    try {
      await account.deleteSession({ sessionId: 'current' })
    } catch (error: any) {
      logger.error('注销异常:', error)
      throw new Error(error.message || '会话注销异常')
    }
  },

  /**
   * 更新当前用户的姓名
   * @param name 新的账户昵称
   */
  async updateName(name: string): Promise<User> {
    try {
      return await account.updateName({ name })
    } catch (error: any) {
      logger.error('昵称更新异常:', error)
      throw new Error(error.message || '昵称更新失败')
    }
  },

  /**
   * 安全更新当前用户的邮箱地址
   * @param params 邮箱更新所需的验证数据
   */
  async updateEmail({ email, password }: UpdateEmailParams): Promise<User> {
    try {
      return await account.updateEmail({ email, password })
    } catch (error: any) {
      logger.error('邮箱更新异常:', error)
      throw new Error(error.message || '邮箱地址更新失败')
    }
  },

  /**
   * 修改当前用户的登录密码
   * @param params 包含新老密码的更新包
   */
  async updatePassword({ newPassword, oldPassword }: UpdatePasswordParams): Promise<User> {
    try {
      return await account.updatePassword({ password: newPassword, oldPassword })
    } catch (error: any) {
      logger.error('密码更新异常:', error)
      throw new Error(error.message || '认证密码更新失败')
    }
  }
}

export default authApi
