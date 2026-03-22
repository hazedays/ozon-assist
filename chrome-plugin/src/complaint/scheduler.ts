import { logger } from '../core/logger'
import { getTaskIntervalMs, syncHostRuntimeConfig } from './runtime-config'
import { runComplaintTick } from './tick'
import { verboseInfo } from './verbose'

let tickSeq = 0
let inFlight = false
let queued = false

function queueNextRun() {
  if (queued) return
  queued = true
  const intervalMs = getTaskIntervalMs()
  setTimeout(() => {
    queued = false
    void runComplaintScheduler()
  }, intervalMs)
}

/**
 * 自动化投诉轮询调度器。
 */
export async function runComplaintScheduler() {
  if (inFlight) {
    verboseInfo('【调度器】检测到轮询重入，已跳过本次调用')
    return
  }

  const tickId = ++tickSeq
  const tickStartAt = Date.now()
  const active = sessionStorage.getItem('ozon_auto_complaint_active')
  verboseInfo(`【轮询#${tickId}】开始执行, 自动化激活标记: ${active ?? 'null'}`)
  if (!active || active === 'false') {
    verboseInfo(`【轮询#${tickId}】自动化流程未激活，跳过执行`)
    return
  }

  inFlight = true
  try {
    await syncHostRuntimeConfig()
    await runComplaintTick({
      tickId,
      scheduleNext: () => {
        queueNextRun()
      }
    })
  } catch (error) {
    const err = error instanceof Error ? `${error.name}: ${error.message}` : String(error)
    logger.error(`【轮询#${tickId}】执行异常: ${err}`)
  } finally {
    inFlight = false
  }

  verboseInfo(
    `【轮询#${tickId}】本轮执行完成, 耗时=${Date.now() - tickStartAt}ms，准备进入下一轮检查`
  )
  queueNextRun()
}
