import { logger, setLogLevel } from './core/logger'
import { setTaskIntervalMs } from './complaint/runtime-config'
import { runComplaintScheduler } from './complaint/scheduler'
import { resetComplaintDraftState } from './complaint/tick'
import { resetComplaintStopStats } from './complaint/tick-state'
import { VERBOSE_LOG_KEY } from './complaint/verbose'

logger.info('=== Ozon 自动化 Content Script 已加载 ===')
logger.info(
  `详细日志开关: sessionStorage.setItem('${VERBOSE_LOG_KEY}', 'true') / removeItem('${VERBOSE_LOG_KEY}')`
)

window.addEventListener('load', () => {
  const url = window.location.href
  logger.info(`【页面事件】load 已触发, 当前 URL: ${url}`)
  runComplaintScheduler()
})

chrome.runtime.onMessage.addListener((request: any) => {
  if (!request?.action) return
  logger.info(`【消息通讯】收到后台消息: ${JSON.stringify(request)}`)

  if (request.action === 'start-auto-complaint') {
    logger.info('收到启动指令 [start-auto-complaint]，重置会话状态并开始流程')
    resetComplaintDraftState()
    resetComplaintStopStats()
    sessionStorage.setItem('ozon_auto_complaint_active', 'true')
    sessionStorage.removeItem('complaint-failed')
    sessionStorage.removeItem('ozon_auto_load')
    sessionStorage.removeItem('current_chat_id')
    runComplaintScheduler()
  } else if (request.action === 'stop-auto-complaint') {
    logger.info('收到停止指令 [stop-auto-complaint]，正在执行状态清理...')
    resetComplaintDraftState()
    sessionStorage.removeItem('ozon_auto_complaint_active')
    sessionStorage.removeItem('ozon_auto_load')
    sessionStorage.removeItem('complaint-failed')
    sessionStorage.removeItem('current_chat_id')
    logger.success('自动化流程已停止')
  } else if (request.action === 'configure-auto-complaint') {
    const intervalRaw = request.taskIntervalMs ?? request.pollIntervalMs
    const logLevelRaw = request.logLevel
    const verboseRaw = request.verbose

    const appliedInterval = intervalRaw !== undefined ? setTaskIntervalMs(intervalRaw) : null
    const appliedLogLevel = logLevelRaw !== undefined ? setLogLevel(logLevelRaw) : null

    if (verboseRaw === true || verboseRaw === 'true') {
      sessionStorage.setItem(VERBOSE_LOG_KEY, 'true')
    } else if (verboseRaw === false || verboseRaw === 'false') {
      sessionStorage.removeItem(VERBOSE_LOG_KEY)
    }

    logger.success(
      `【配置更新】已应用宿主配置: taskIntervalMs=${appliedInterval ?? 'unchanged'}, logLevel=${appliedLogLevel ?? 'unchanged'}, verbose=${verboseRaw ?? 'unchanged'}`
    )
  }
})
