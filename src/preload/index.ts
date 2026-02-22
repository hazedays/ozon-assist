import { contextBridge } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

// 如果启用了 contextIsolation，就用 contextBridge 暴露
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
}
