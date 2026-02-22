/**
 * 法务模块类型模型定义
 */

/** 允许打开的子窗口子路由定义 */
export type LegalRoute = 'terms' | 'privacy' | 'support'

/** 法务 API 业务对象接口定义 */
export interface ILegalApi {
  /**
   * 通知主进程打开独立的子窗口 (独立进程)
   * @param route 路由子路径
   */
  openSubWindow(route: LegalRoute): void
}
