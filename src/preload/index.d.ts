import { ElectronAPI } from '@electron-toolkit/preload'

declare global {
  type UpdaterStatusPayload = {
    status: string
    payload: Record<string, unknown> | null
    timestamp: number
  }

  type UpdaterApi = {
    checkForUpdates: () => Promise<{ started: boolean; reason?: string }>
    quitAndInstall: () => Promise<{ ok: boolean; reason?: string }>
    onStatus: (callback: (payload: UpdaterStatusPayload) => void) => () => void
    getConfig: () => Promise<{ autoUpdateEnabled: boolean }>
    setConfig: (config: { autoUpdateEnabled: boolean }) => Promise<{ ok: boolean; reason?: string }>
    getReleaseHistory: () => Promise<Array<{ version: string; date: string; notes: string }>>
  }

  interface Window {
    electron: ElectronAPI
    api: {
      updater: UpdaterApi
    }
  }
}
