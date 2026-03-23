import { app, BrowserWindow, dialog } from 'electron'
import { autoUpdater } from 'electron-updater'
import { logger } from '@main/core/logger'
import * as path from 'path'
import * as fs from 'fs'

type UpdateTrigger = 'startup' | 'interval' | 'manual'

interface UpdaterConfig {
  autoUpdateEnabled: boolean
}

type ReleaseHistoryItem = {
  version: string
  date: string
  notes: string
}

type GithubRelease = {
  tag_name: string
  published_at: string
  body: string
  prerelease: boolean
  draft: boolean
}

class UpdaterService {
  private initialized = false
  private checking = false
  private checkTimer: NodeJS.Timeout | null = null
  private getMainWindow: (() => BrowserWindow | null) | null = null
  private config: UpdaterConfig = { autoUpdateEnabled: true }
  private configPath: string = ''

  private loadConfig(): UpdaterConfig {
    try {
      const configPath = this.getConfigPath()
      if (fs.existsSync(configPath)) {
        const data = fs.readFileSync(configPath, 'utf-8')
        const parsed = JSON.parse(data)
        return { autoUpdateEnabled: parsed.autoUpdateEnabled ?? true }
      }
    } catch (error) {
      logger.warn('[updater] Failed to load config:', error)
    }
    return { autoUpdateEnabled: true }
  }

  private saveConfig(config: UpdaterConfig): void {
    try {
      const configPath = this.getConfigPath()
      const dir = path.dirname(configPath)
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true })
      }
      fs.writeFileSync(configPath, JSON.stringify(config, null, 2))
    } catch (error) {
      logger.error('[updater] Failed to save config:', error)
    }
  }

  private getConfigPath(): string {
    if (!this.configPath) {
      const userDataPath = app.isReady() ? app.getPath('userData') : ''
      this.configPath = path.join(userDataPath || '.', 'updater-config.json')
    }
    return this.configPath
  }

  init(getMainWindow: () => BrowserWindow | null): void {
    if (this.initialized) return

    this.getMainWindow = getMainWindow

    if (!app.isPackaged) {
      logger.info('[updater] Disabled in development mode')
      return
    }

    this.initialized = true
    this.config = this.loadConfig()

    autoUpdater.autoDownload = true
    autoUpdater.autoInstallOnAppQuit = true
    autoUpdater.allowPrerelease = false
    autoUpdater.logger = logger as any

    autoUpdater.on('checking-for-update', () => {
      logger.info('[updater] Checking for updates...')
      this.emitStatus('checking')
    })

    autoUpdater.on('update-available', (info) => {
      logger.info('[updater] Update available:', info.version)
      this.emitStatus('available', {
        version: info.version,
        releaseDate: info.releaseDate,
        releaseName: info.releaseName,
        releaseNotes: info.releaseNotes || ''
      })
    })

    autoUpdater.on('update-not-available', (info) => {
      logger.info('[updater] No updates found. Current/latest:', app.getVersion(), info.version)
      this.emitStatus('not-available', {
        version: info.version
      })
    })

    autoUpdater.on('download-progress', (progress) => {
      this.emitStatus('download-progress', {
        percent: progress.percent,
        transferred: progress.transferred,
        total: progress.total,
        bytesPerSecond: progress.bytesPerSecond
      })
    })

    autoUpdater.on('update-downloaded', async (info) => {
      logger.info('[updater] Update downloaded:', info.version)
      this.emitStatus('downloaded', {
        version: info.version,
        releaseName: info.releaseName
      })

      const parentWindow = this.getMainWindow?.() ?? null
      const messageBoxOptions = {
        type: 'info' as const,
        title: '发现新版本',
        message: `新版本 ${info.version} 已下载完成。`,
        detail: '是否立即重启并安装更新？',
        buttons: ['立即重启', '稍后'],
        defaultId: 0,
        cancelId: 1,
        noLink: true
      }
      const { response } = parentWindow
        ? await dialog.showMessageBox(parentWindow, messageBoxOptions)
        : await dialog.showMessageBox(messageBoxOptions)

      if (response === 0) {
        autoUpdater.quitAndInstall()
      }
    })

    autoUpdater.on('error', (error) => {
      logger.error('[updater] Update error:', error)
      this.emitStatus('error', {
        message: error?.message || String(error)
      })
    })

    // 仅在启用自动更新时启动检查
    if (this.config.autoUpdateEnabled) {
      // 启动后稍等窗口稳定再检查更新
      setTimeout(() => {
        this.checkForUpdates('startup').catch((error) => {
          logger.warn('[updater] Startup check failed:', error)
        })
      }, 15000)

      // 每 6 小时自动检查一次
      this.checkTimer = setInterval(
        () => {
          this.checkForUpdates('interval').catch((error) => {
            logger.warn('[updater] Interval check failed:', error)
          })
        },
        6 * 60 * 60 * 1000
      )

      this.checkTimer.unref()
    } else {
      logger.info('[updater] Auto-update is disabled')
    }
  }

  getAutoUpdateConfig(): UpdaterConfig {
    return { ...this.config }
  }

  setAutoUpdateConfig(config: UpdaterConfig): void {
    this.config = config
    this.saveConfig(config)

    if (config.autoUpdateEnabled) {
      // 启用自动更新
      if (!this.checkTimer) {
        logger.info('[updater] Auto-update enabled, starting checks')
        // 立即检查一次
        this.checkForUpdates('manual').catch((error) => {
          logger.warn('[updater] Manual check failed:', error)
        })
        // 然后设置定期检查
        this.checkTimer = setInterval(
          () => {
            this.checkForUpdates('interval').catch((error) => {
              logger.warn('[updater] Interval check failed:', error)
            })
          },
          6 * 60 * 60 * 1000
        )
        this.checkTimer.unref()
      }
    } else {
      // 禁用自动更新
      if (this.checkTimer) {
        logger.info('[updater] Auto-update disabled, clearing timers')
        clearInterval(this.checkTimer)
        this.checkTimer = null
      }
    }
  }

  async checkForUpdates(trigger: UpdateTrigger): Promise<{ started: boolean; reason?: string }> {
    if (!app.isPackaged) {
      return { started: false, reason: 'not-packaged' }
    }

    if (this.checking) {
      return { started: false, reason: 'already-checking' }
    }

    this.checking = true
    try {
      logger.info('[updater] Trigger check:', trigger)
      await autoUpdater.checkForUpdates()
      return { started: true }
    } finally {
      this.checking = false
    }
  }

  async quitAndInstall(): Promise<{ ok: boolean; reason?: string }> {
    if (!app.isPackaged) {
      return { ok: false, reason: 'not-packaged' }
    }

    autoUpdater.quitAndInstall()
    return { ok: true }
  }

  private normalizeVersion(tag: string): string {
    return (tag || '').replace(/^v/i, '').trim()
  }

  private parseChangelogSections(markdown: string): Map<string, string> {
    const sections = new Map<string, string>()
    const normalized = markdown.replace(/\r\n/g, '\n')
    const regex = /^##\s+\[(.+?)\]\s+-\s+.+$/gm
    const matches = [...normalized.matchAll(regex)]

    for (let i = 0; i < matches.length; i += 1) {
      const current = matches[i]
      const start = current.index ?? 0
      const end =
        i + 1 < matches.length ? (matches[i + 1].index ?? normalized.length) : normalized.length
      const fullSection = normalized.slice(start, end).trim()
      const version = this.normalizeVersion(current[1])

      if (version) {
        sections.set(version, fullSection)
      }
    }

    return sections
  }

  async getReleaseHistory(): Promise<ReleaseHistoryItem[]> {
    try {
      const owner = 'hazedays'
      const repo = 'ozon-assist'
      const releasesUrl = `https://api.github.com/repos/${owner}/${repo}/releases`
      const [releasesResponse, changelogResponses] = await Promise.all([
        fetch(releasesUrl),
        Promise.all(
          ['main', 'master', 'v1'].map((ref) =>
            fetch(`https://raw.githubusercontent.com/${owner}/${repo}/${ref}/CHANGELOG.md`)
          )
        )
      ])

      if (!releasesResponse.ok) {
        logger.warn('[updater] Failed to fetch release history:', releasesResponse.status)
        return []
      }

      const releases = (await releasesResponse.json()) as GithubRelease[]

      let changelogMap = new Map<string, string>()
      const changelogResponse = changelogResponses.find((res) => res.ok)
      if (changelogResponse) {
        const changelogMarkdown = await changelogResponse.text()
        changelogMap = this.parseChangelogSections(changelogMarkdown)
      } else {
        logger.warn(
          '[updater] Failed to fetch CHANGELOG fallback:',
          changelogResponses.map((res) => res.status).join(',')
        )
      }

      return releases
        .filter((r) => !r.draft && !r.prerelease)
        .map((r) => {
          const version = this.normalizeVersion(r.tag_name)
          const fallbackNotes = changelogMap.get(version) || ''
          const notes = (r.body || '').trim() || fallbackNotes

          return {
            version,
            date: new Date(r.published_at).toLocaleDateString('zh-CN'),
            notes
          }
        })
    } catch (error) {
      logger.error('[updater] Failed to get release history:', error)
      return []
    }
  }

  dispose(): void {
    if (this.checkTimer) {
      clearInterval(this.checkTimer)
      this.checkTimer = null
    }
  }

  private emitStatus(status: string, payload?: Record<string, unknown>): void {
    const mainWindow = this.getMainWindow?.()
    if (!mainWindow || mainWindow.isDestroyed()) return

    mainWindow.webContents.send('updater:status', {
      status,
      payload: payload || null,
      timestamp: Date.now()
    })
  }
}

export const updaterService = new UpdaterService()
