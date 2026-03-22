import { logger } from '../core/logger'

export const VERBOSE_LOG_KEY = 'ozon_auto_complaint_verbose'

export function isVerboseLogEnabled() {
  return sessionStorage.getItem(VERBOSE_LOG_KEY) === 'true'
}

export function verboseInfo(msg: string) {
  if (isVerboseLogEnabled()) {
    logger.info(msg)
  }
}
