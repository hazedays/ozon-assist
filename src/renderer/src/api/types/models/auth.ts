/**
 * 身份认证模块返回模型定义
 * 定义了用户信息及会话状态、API 导出对象接口
 */
import { Models } from 'appwrite'
import {
  LoginParams,
  RegisterParams,
  UpdateEmailParams,
  UpdatePasswordParams
} from '../params/auth'

/**
 * 用户信息模型 (基于 Appwrite 实现)
 */
export type User = Models.User<Models.Preferences>

/**
 * 身份认证 API 调用接口定义
 * 定义了常用的账户管理与会话创建方法
 */
export interface IAuthApi {
  /** 提交登录认证，建立邮箱会话 */
  login: (params: LoginParams) => Promise<User>

  /** 注册并初始化账户，返回创建的用户对象 */
  register: (params: RegisterParams) => Promise<User>

  /** 获取当前活跃会话的用户信息，若无会话则返回 null */
  getCurrentUser: () => Promise<User | null>

  /** 注销当前所有会话并清理本地凭证 */
  logout: () => Promise<void>

  /** 更新当前用户的姓名 */
  updateName: (name: string) => Promise<User>

  /** 安全更新当前用户的邮箱地址 */
  updateEmail: (params: UpdateEmailParams) => Promise<User>

  /** 修改当前用户的登录密码 */
  updatePassword: (params: UpdatePasswordParams) => Promise<User>
}
