import { logger, setLogLevel } from '../core/logger'
import { VERBOSE_LOG_KEY } from './verbose'

export const TASK_INTERVAL_KEY = 'ozon_auto_task_interval_ms'
const HOST_CONFIG_SYNC_AT_KEY = 'ozon_auto_host_config_sync_at'

const DEFAULT_TASK_INTERVAL_MS = 500
const MIN_TASK_INTERVAL_MS = 100
const MAX_TASK_INTERVAL_MS = 10000
const HOST_CONFIG_SYNC_INTERVAL_MS = 5000

export function getTaskIntervalMs() {
  const raw = sessionStorage.getItem(TASK_INTERVAL_KEY)
  const parsed = Number(raw)
  if (!Number.isFinite(parsed)) return DEFAULT_TASK_INTERVAL_MS
  return Math.min(MAX_TASK_INTERVAL_MS, Math.max(MIN_TASK_INTERVAL_MS, Math.floor(parsed)))
}

export function setTaskIntervalMs(value: unknown) {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return null
  const normalized = Math.min(
    MAX_TASK_INTERVAL_MS,
    Math.max(MIN_TASK_INTERVAL_MS, Math.floor(parsed))
  )
  sessionStorage.setItem(TASK_INTERVAL_KEY, String(normalized))
  return normalized
}

export async function syncHostRuntimeConfig() {
  const now = Date.now()
  const lastSync = Number(sessionStorage.getItem(HOST_CONFIG_SYNC_AT_KEY) || '0')
  if (now - lastSync < HOST_CONFIG_SYNC_INTERVAL_MS) return

  sessionStorage.setItem(HOST_CONFIG_SYNC_AT_KEY, String(now))

  try {
    const resp = await chrome.runtime.sendMessage({
      action: 'get',
      url: '/plugin/runtime-config'
    })

    if (!resp?.success || !resp?.data) {
      return
    }

    const data = resp.data as {
      taskIntervalMs?: number
      pollIntervalMs?: number
      logLevel?: string
      verbose?: boolean
    }

    const intervalRaw = data.taskIntervalMs ?? data.pollIntervalMs
    const appliedInterval = intervalRaw !== undefined ? setTaskIntervalMs(intervalRaw) : null
    const appliedLevel = data.logLevel ? setLogLevel(data.logLevel) : null

    if (data.verbose === true) {
      sessionStorage.setItem(VERBOSE_LOG_KEY, 'true')
    } else if (data.verbose === false) {
      sessionStorage.removeItem(VERBOSE_LOG_KEY)
    }

    if (appliedInterval !== null || appliedLevel !== null || typeof data.verbose === 'boolean') {
      logger.info(
        `【配置同步】已从宿主同步配置: taskIntervalMs=${appliedInterval ?? 'unchanged'}, logLevel=${appliedLevel ?? 'unchanged'}, verbose=${typeof data.verbose === 'boolean' ? String(data.verbose) : 'unchanged'}`
      )
    }
  } catch {
    // 静默失败，避免影响主流程
  }
}
