/**
 * 身份认证模块请求参数定义
 * 包含登录、注册及更新用户信息的参数接口
 */

/**
 * 登录请求参数
 */
export interface LoginParams {
  email: string
  password: string
}

/**
 * 注册请求参数
 */
export interface RegisterParams {
  email: string
  password: string
  name?: string
}

/**
 * 更新邮箱请求参数
 */
export interface UpdateEmailParams {
  email: string
  password: string
}

/**
 * 更新密码请求参数
 */
export interface UpdatePasswordParams {
  newPassword: string
  oldPassword: string
}
