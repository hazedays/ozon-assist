import { app, ipcMain } from 'electron'
import { join } from 'path'
import fs from 'fs-extra'

const isDev = !app.isPackaged

/**
 * 实际的日志库实例（延迟初始化）
 */
let _loggerInstance: any = null
let _initializationAttempted = false

/**
 * 安全的日志封装对象
 * 在 app 未就绪时使用 console，就绪后自动升级到文件日志
 */
const safeLog = (level: 'info' | 'warn' | 'error' | 'debug', ...args: any[]) => {
  // 如果还没尝试过初始化，且 app 已就绪，则尝试初始化
  if (!_initializationAttempted && app.isReady()) {
    initializeLogger()
  }

  // 使用真实日志库（如果可用），否则降级到 console
  if (_loggerInstance && typeof _loggerInstance[level] === 'function') {
    try {
      _loggerInstance[level](...args)
    } catch (e) {
      console[level]?.(...args)
    }
  } else {
    console[level]?.(...args)
  }
}

/**
 * 初始化日志库（仅在 app.ready 后调用）
 */
function initializeLogger(): void {
  if (_initializationAttempted) return
  _initializationAttempted = true

  try {
    const logDir = join(app.getPath('userData'), 'logs')

    // 确保目录存在
    if (!fs.existsSync(logDir)) {
      fs.mkdirpSync(logDir)
    }

    // 动态加载以避免顶层副作用
    const { Logger } = require('@chaeco/logger')

    _loggerInstance = new Logger({
      level: isDev ? 'debug' : 'info',
      name: 'OZON',
      file: {
        enabled: true,
        path: logDir,
        maxSize: '10m',
        maxFiles: 30,
        maxAge: 30,
        compress: true
      },
      console: {
        enabled: true,
        colors: isDev,
        timestamp: true
      }
    })

    console.info('[Logger] Initialized successfully with file logging enabled.')
  } catch (e) {
    console.error('[Logger] Failed to initialize, falling back to console only:', e)
    _loggerInstance = null
  }
}

/**
 * 导出的日志对象
 */
export const logger = {
  info: (...args: any[]) => safeLog('info', ...args),
  warn: (...args: any[]) => safeLog('warn', ...args),
  error: (...args: any[]) => safeLog('error', ...args),
  debug: (...args: any[]) => safeLog('debug', ...args),
  child: (name: string) => {
    if (_loggerInstance && typeof _loggerInstance.child === 'function') {
      return _loggerInstance.child(name)
    }
    // 返回一个假的 child logger，实际还是打印到主 logger
    return logger
  }
}

export function initRendererLogging(): void {
  ipcMain.on('logger:log', (_event, { level, args }) => {
    const rendererLogger = logger.child('renderer')
    if (typeof rendererLogger[level] === 'function') {
      rendererLogger[level](...args)
    }
  })
}
