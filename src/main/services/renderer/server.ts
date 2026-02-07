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
