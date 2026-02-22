import { IServerApi, ServerStatusResponse } from '../types/models/server'

/**
 * 本地服务器模块接口实现
 * 负责通过 IPC 调用与本地图片服务器交互
 */

const { ipcRenderer } = window.electron || {}

/**
 * 服务器 API 调用对象
 */
export const serverApi: IServerApi = {
  /** 检查服务器是否正在运行 */
  async isRunning(): Promise<boolean> {
    return await ipcRenderer.invoke('server:isRunning')
  },

  /** 获取服务器基础 URL */
  async getUrl(): Promise<string | null> {
    return await ipcRenderer.invoke('server:getUrl')
  },

  /** 获取服务器详细状态 */
  async getStatus(): Promise<ServerStatusResponse> {
    return await ipcRenderer.invoke('server:getStatus')
  }
}
