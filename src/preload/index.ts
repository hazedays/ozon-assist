import { contextBridge } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

// 自定义 API
const api = {}

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
