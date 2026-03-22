import { ipcMain, ipcRenderer, shell } from 'electron'
import { serverService } from '../server'
import { getUnpackedPath } from '@main/utils'

class ServerRendererService {
  constructor() {}

  initRendererServer() {
    // 处理检查服务器运行状态的请求
    ipcMain.handle('server:isRunning', () => {
      return serverService.isRunning()
    })

    // 获取服务器 URL
    ipcMain.handle('server:getUrl', () => {
      return serverService.getUrl()
    })

    // 获取宿主运行配置
    ipcMain.handle('server:getRuntimeConfig', () => {
      return serverService.getHostRuntimeConfig()
    })

    // 更新宿主运行配置
    ipcMain.handle('server:setRuntimeConfig', (_event, config: any) => {
      return serverService.setHostRuntimeConfig(config || {})
    })

    // 获取插件运行日志
    ipcMain.handle('server:getPluginLogs', (_event, limit?: number) => {
      return serverService.getPluginRuntimeLogs(limit)
    })

    // 清空插件运行日志
    ipcMain.handle('server:clearPluginLogs', () => {
      serverService.clearPluginRuntimeLogs()
      return { success: true }
    })

    // 打开插件目录
    ipcMain.on('server:open-plugin-folder', () => {
      const pluginPath = getUnpackedPath('chrome-plugin')
      shell.openPath(pluginPath)
    })
  }

  // 向渲染进程广播服务器状态变化
  broadcastServerStatus() {
    const isRunning = serverService.isRunning()
    ipcRenderer.send('server:status', isRunning)
  }
}

export const serverRendererService = new ServerRendererService()
