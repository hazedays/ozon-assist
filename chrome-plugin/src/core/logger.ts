/**
 * Ozon Auto Complaint - Logger Module
 */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'silent'
type HostLogLevel = 'debug' | 'info' | 'warn' | 'error' | 'success'

const LOG_LEVEL_KEY = 'ozon_auto_log_level'

const LOG_PRIORITY: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
  silent: 100
}

function getCurrentLogLevel(): LogLevel {
  const raw = (sessionStorage.getItem(LOG_LEVEL_KEY) || 'info').toLowerCase()
  if (raw === 'debug' || raw === 'info' || raw === 'warn' || raw === 'error' || raw === 'silent') {
    return raw
  }
  return 'info'
}

function canLog(level: LogLevel) {
  return LOG_PRIORITY[level] >= LOG_PRIORITY[getCurrentLogLevel()]
}

function toErrorText(err: unknown) {
  if (!err) return undefined
  if (err instanceof Error) return `${err.name}: ${err.message}`
  try {
    return typeof err === 'string' ? err : JSON.stringify(err)
  } catch {
    return String(err)
  }
}

function reportToHost(level: HostLogLevel, message: string, err?: unknown) {
  try {
    void chrome.runtime
      .sendMessage({
        action: 'post',
        url: '/plugin/log',
        data: {
          level,
          message,
          error: toErrorText(err),
          source: 'chrome-plugin',
          pageUrl: window.location.href,
          timestamp: new Date().toISOString()
        }
      })
      .catch(() => {})
  } catch {
    // 静默失败，避免日志上报影响主流程
  }
}

export function setLogLevel(value: unknown): LogLevel | null {
  if (typeof value !== 'string') return null
  const level = value.toLowerCase()
  if (
    level !== 'debug' &&
    level !== 'info' &&
    level !== 'warn' &&
    level !== 'error' &&
    level !== 'silent'
  ) {
    return null
  }
  sessionStorage.setItem(LOG_LEVEL_KEY, level)
  return level
}

export const logger = {
  _getTime: () => new Date().toLocaleTimeString(),
  debug: (msg: string) => {
    if (!canLog('debug')) return
    console.log(`%c[Ozon插件][${new Date().toLocaleTimeString()}] ${msg}`, 'color: #7f8c8d')
    reportToHost('debug', msg)
  },
  info: (msg: string) => {
    if (!canLog('info')) return
    console.log(`%c[Ozon插件][${new Date().toLocaleTimeString()}] ${msg}`, 'color: #3498db')
    reportToHost('info', msg)
  },
  warn: (msg: string) => {
    if (!canLog('warn')) return
    console.log(`%c[Ozon插件] ⚠️ [${new Date().toLocaleTimeString()}] ${msg}`, 'color: #e67e22')
    reportToHost('warn', msg)
  },
  error: (msg: string, err: any = '') => {
    if (!canLog('error')) return
    console.log(
      `%c[Ozon插件] ❌ [${new Date().toLocaleTimeString()}] ${msg}`,
      'color: #e74c3c',
      err
    )
    reportToHost('error', msg, err)
  },
  success: (msg: string) => {
    if (!canLog('info')) return
    console.log(
      `%c[Ozon插件] ✅ [${new Date().toLocaleTimeString()}] ${msg}`,
      'color: #27ae60; font-weight:bold'
    )
    reportToHost('success', msg)
  }
}

// 挂载到 window 方便调试
;(window as any).ozonLogger = logger
