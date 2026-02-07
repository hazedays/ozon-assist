import { app, ipcMain } from 'electron'
import { join } from 'path'
import { Logger } from '@chaeco/logger'

const isDev = !app.isPackaged

/**
 * 主 Logger 实例
 * @chaeco/logger 支持懒加载，首次写入时自动创建目录和文件
 */
let appLogger: Logger

/**
 * 获取或创建 Logger 实例
 * 在 app.ready 前返回 console fallback，ready 后返回真实 Logger
 */
function getLogger(): Logger {
  // 如果已经创建，直接返回
  if (appLogger) {
    return appLogger
  }

  // 如果 app 未就绪，暂时返回 console-only logger
  if (!app.isReady()) {
    return new Logger({
      level: isDev ? 'debug' : 'info',
      name: 'OZON',
      console: {
        enabled: true,
        colors: isDev,
        timestamp: true
      },
      file: {
        enabled: false // app 未就绪时禁用文件日志
      }
    })
  }

  // app 已就绪，创建完整的 Logger
  try {
    const logDir = join(app.getPath('userData'), 'logs')

    appLogger = new Logger({
      level: isDev ? 'debug' : 'info',
      name: 'OZON',
      file: {
        enabled: true,
        path: logDir, // 首次写入时自动创建目录
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

    return appLogger
  } catch (e) {
    console.error('[Logger] Failed to initialize, falling back to console only:', e)

    // 失败时返回 console-only logger
    return new Logger({
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
  }
}

/**
 * 导出的日志对象
 */
export const logger = {
  info: (...args: any[]) => getLogger().info(...args),
  warn: (...args: any[]) => getLogger().warn(...args),
  error: (...args: any[]) => getLogger().error(...args),
  debug: (...args: any[]) => getLogger().debug(...args),
  child: (name: string) => getLogger().child(name)
}

/**
 * 初始化渲染进程日志转发
 */
export function initRendererLogging(): void {
  ipcMain.on('logger:log', (_event, { level, args }) => {
    const rendererLogger = getLogger().child('renderer')
    if (typeof rendererLogger[level] === 'function') {
      rendererLogger[level](...args)
    }
  })
}
