import { ipcMain, app, shell } from 'electron'
import { updaterService } from '../updater'
import { logger } from '@main/core/logger'

class UpdaterRendererService {
  initRendererUpdater() {
    ipcMain.handle('updater:check', async () => {
      try {
        return await updaterService.checkForUpdates('manual')
      } catch (error) {
        logger.error('[updater] Manual check failed:', error)
        return {
          started: false,
          reason: error instanceof Error ? error.message : String(error)
        }
      }
    })

    ipcMain.handle('updater:quitAndInstall', async () => {
      try {
        return await updaterService.quitAndInstall()
      } catch (error) {
        logger.error('[updater] quitAndInstall failed:', error)
        return {
          ok: false,
          reason: error instanceof Error ? error.message : String(error)
        }
      }
    })

    // App info handlers
    ipcMain.handle('app:getVersion', () => app.getVersion())

    ipcMain.handle('app:isPackaged', () => app.isPackaged)

    ipcMain.handle('app:getUserDataPath', () => app.getPath('userData'))

    ipcMain.on('app:openUserDataPath', () => {
      const userDataPath = app.getPath('userData')
      shell.openPath(userDataPath)
    })

    // Auto-update config handlers
    ipcMain.handle('updater:getConfig', () => {
      return updaterService.getAutoUpdateConfig()
    })

    ipcMain.handle('updater:setConfig', async (_event, config) => {
      try {
        updaterService.setAutoUpdateConfig(config)
        return { ok: true }
      } catch (error) {
        logger.error('[updater] Failed to set config:', error)
        return {
          ok: false,
          reason: error instanceof Error ? error.message : String(error)
        }
      }
    })

    // Release history handler
    ipcMain.handle('updater:getReleaseHistory', async () => {
      try {
        return await updaterService.getReleaseHistory()
      } catch (error) {
        logger.error('[updater] Failed to get release history:', error)
        return []
      }
    })
  }
}

export const updaterRendererService = new UpdaterRendererService()
