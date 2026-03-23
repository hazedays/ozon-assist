import { app, ipcMain } from 'electron'
import { join } from 'path'
import { Logger } from '@chaeco/logger'

const isDev = !app.isPackaged

/**
 * 主 Logger 实例
 * @chaeco/logger 支持懒加载，首次写入时自动创建目录和文件
 */
let appLogger: Logger | null = null
let rendererLogger: Logger | null = null
let rendererLoggingInitialized = false

// app 未就绪时使用单例 fallback，避免每次日志调用都重复 new Logger
const fallbackLogger = new Logger({
  level: isDev ? 'debug' : 'info',
  name: 'OZON',
  console: {
    enabled: true,
    colors: isDev,
    timestamp: true
  },
  file: {
    enabled: false
  }
})

/**
 * 获取或创建 Logger 实例
 * 在 app.ready 前返回 console fallback，ready 后返回真实 Logger
 */
function getLogger(): Logger {
  if (appLogger) {
    return appLogger
  }

  if (!app.isReady()) {
    return fallbackLogger
  }

  try {
    const logDir = join(app.getPath('logs'))

    appLogger = new Logger({
      level: isDev ? 'debug' : 'info',
      name: 'OZON',
      file: {
        enabled: true,
        path: logDir,
        compress: true
      },
      console: {
        enabled: true,
        colors: isDev,
        timestamp: true
      },
      async: {
        enabled: true,
        batchSize: 100,
        flushInterval: 1000,
        overflowStrategy: 'block'
      },
      errorHandling: {
        silent: true,
        onError: (err, context) => {
          console.error(`[Logger:${context}]`, err.message)
        }
      }
    })

    appLogger.on('fileWriteError', (event) => {
      console.error('[Logger] fileWriteError:', event.error?.message)
    })

    return appLogger
  } catch (e) {
    console.error('[Logger] Failed to initialize, falling back to console only:', e)
    return fallbackLogger
  }
}

function normalizeLevel(level: unknown): 'debug' | 'info' | 'warn' | 'error' {
  if (level === 'debug' || level === 'info' || level === 'warn' || level === 'error') {
    return level
  }
  return 'info'
}

/**
 * 导出的日志对象
 */
export const logger = {
  info: (...args: any[]) => getLogger().info(...args),
  warn: (...args: any[]) => getLogger().warn(...args),
  error: (...args: any[]) => getLogger().error(...args),
  debug: (...args: any[]) => getLogger().debug(...args),
  child: (name: string) => getLogger().child(name),
  close: async () => {
    if (appLogger) {
      await appLogger.close()
    }
  }
}

/**
 * 初始化渲染进程日志转发
 */
export function initRendererLogging(): void {
  if (rendererLoggingInitialized) return
  rendererLoggingInitialized = true

  ipcMain.on('logger:log', (_event, { level, args }) => {
    if (!rendererLogger) {
      rendererLogger = getLogger().child('renderer')
    }

    const normalizedLevel = normalizeLevel(level)
    const payload = Array.isArray(args) ? args : [args]
    if (typeof rendererLogger[normalizedLevel] === 'function') {
      rendererLogger[normalizedLevel](...payload)
    }
  })
}
