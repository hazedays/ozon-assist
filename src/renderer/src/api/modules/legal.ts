/**
 * 法务相关 IPC 接口
 * 负责与主进程通信，打开独立的子窗口 (Terms, Privacy, Support)
 */
import { ILegalApi, LegalRoute } from '../types/models/legal'

const { ipcRenderer } = window.electron || {}

/**
 * 法务 API 调用对象实现
 */
export const legalApi: ILegalApi = {
  /**
   * 通知主进程打开独立的子窗口
   * @param route 路由子路径
   */
  openSubWindow(route: LegalRoute): void {
    ipcRenderer?.send('open-sub-window', route)
  }
}

export default legalApi
