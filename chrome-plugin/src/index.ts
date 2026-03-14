/**
 * Ozon Auto Complaint - Entry Point (MV3 Content Script)
 *
 * 此文件在 TypeScript 环境下仅作为脚本入口。
 * 核心逻辑已迁移至 logic/complaint.ts。
 */

import { logger } from './core/logger'
import { CONFIG } from './shared/constants'
import { ComplaintLogic } from './logic/complaint'

const logic = ComplaintLogic

logger.info('=== Ozon 自动化 Content Script (TypeScript 版) 已加载 ===')

window.addEventListener('load', () => {
  const url = window.location.href
  logger.info(`【页面事件】load 已触发, 当前 URL: ${url}`)

  if (sessionStorage.getItem(CONFIG.STORAGE_KEYS.AUTO_SUBMITTED) === 'true') {
    logger.info('检测到 AUTO_SUBMITTED 标志为开启状态, 正在评估是否继续任务...')

    if (!logic.isAborted() && url.includes(CONFIG.URLS.SUPPORT)) {
      logger.info('符合自动执行条件, 重新初始化 createComplaint')
      logic.createComplaint()
    } else if (!logic.isAborted() && url.includes(CONFIG.URLS.SCRM)) {
      logic.startStep()
    } else {
      logger.info(
        `自动任务拦截点: isAborted=${logic.isAborted()}, urlIncludesSupport=${url.includes(CONFIG.URLS.SUPPORT)}`
      )
    }
  }
})

chrome.runtime.onMessage.addListener((request: any) => {
  if (!request?.action) return
  logger.info(`【消息通讯】收到后台消息: ${JSON.stringify(request)}`)

  if (request.action === 'submitComplaint') {
    if (logic.isProcessing) {
      return logger.warn('指令拦截：已有一个处理中的任务，跳过本次启动指令')
    }
    logger.info('收到启动指令 [submitComplaint]，重置会话状态并开始流程')
    sessionStorage.removeItem(CONFIG.STORAGE_KEYS.CURRENT_SKU)
    sessionStorage.setItem(CONFIG.STORAGE_KEYS.AUTO_SUBMITTED, 'true')
    sessionStorage.removeItem(CONFIG.STORAGE_KEYS.STOPPED_MANUALLY)
    logic.checkUrl()
  } else if (request.action === 'stopComplaint') {
    logger.info('收到停止指令 [stopComplaint]，正在执行状态清理...')
    sessionStorage.setItem(CONFIG.STORAGE_KEYS.STOPPED_MANUALLY, 'true')
    sessionStorage.removeItem(CONFIG.STORAGE_KEYS.AUTO_SUBMITTED)
    sessionStorage.removeItem(CONFIG.STORAGE_KEYS.CURRENT_SKU)
    logic.isProcessing = false
    logger.success('自动化流程已停止')
  }
})
