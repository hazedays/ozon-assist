import { contextBridge } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import { ipcRenderer } from 'electron'

// 自定义 API
const api = {
  updater: {
    checkForUpdates: () => ipcRenderer.invoke('updater:check'),
    quitAndInstall: () => ipcRenderer.invoke('updater:quitAndInstall'),
    onStatus: (callback: (payload: any) => void) => {
      const listener = (_event: Electron.IpcRendererEvent, payload: any) => callback(payload)
      ipcRenderer.on('updater:status', listener)
      return () => {
        ipcRenderer.removeListener('updater:status', listener)
      }
    },
    getConfig: () => ipcRenderer.invoke('updater:getConfig'),
    setConfig: (config: { autoUpdateEnabled: boolean }) =>
      ipcRenderer.invoke('updater:setConfig', config),
    getReleaseHistory: () => ipcRenderer.invoke('updater:getReleaseHistory')
  }
}

// 如果启用了 contextIsolation，就用 contextBridge 暴露
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
}
