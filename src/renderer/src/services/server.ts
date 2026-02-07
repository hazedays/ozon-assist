const { ipcRenderer } = window.electron || {}

class ServerService {
  async isRunning(): Promise<boolean> {
    return await ipcRenderer.invoke('server:isRunning')
  }

  async getUrl(): Promise<string | null> {
    return await ipcRenderer.invoke('server:getUrl')
  }
}

export const serverService = new ServerService()
