const { ipcRenderer } = window.electron || {}

export type RuntimeConfig = {
  taskIntervalMs: number
  logLevel: 'debug' | 'info' | 'warn' | 'error' | 'silent'
  verbose: boolean
}

export type PluginRuntimeLog = {
  id: number
  timestamp: string
  level: 'debug' | 'info' | 'warn' | 'error' | 'success'
  message: string
  source?: string
  pageUrl?: string
  error?: string
  event?: string
  data?: Record<string, unknown>
}

class ServerService {
  async isRunning(): Promise<boolean> {
    return await ipcRenderer.invoke('server:isRunning')
  }

  async getUrl(): Promise<string | null> {
    return await ipcRenderer.invoke('server:getUrl')
  }

  async getRuntimeConfig(): Promise<RuntimeConfig> {
    return await ipcRenderer.invoke('server:getRuntimeConfig')
  }

  async setRuntimeConfig(config: Partial<RuntimeConfig>): Promise<RuntimeConfig> {
    return await ipcRenderer.invoke('server:setRuntimeConfig', config)
  }

  async getPluginLogs(limit = 300): Promise<PluginRuntimeLog[]> {
    return await ipcRenderer.invoke('server:getPluginLogs', limit)
  }

  async clearPluginLogs(): Promise<{ success: boolean }> {
    return await ipcRenderer.invoke('server:clearPluginLogs')
  }
}

export const serverService = new ServerService()
