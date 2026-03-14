/**
 * Ozon Auto Complaint - Entry Point (MV3 Content Script)
 *
 * 此文件在 TypeScript 环境下仅作为脚本入口。
 * 核心逻辑已迁移至 logic/complaint.ts。
 */

import { logger } from './core/logger'

logger.info('=== Ozon 自动化 Content Script (TypeScript 版) 已加载 ===')

window.addEventListener('load', () => {
  const url = window.location.href
  logger.info(`【页面事件】load 已触发, 当前 URL: ${url}`)
  nextTask()
})

chrome.runtime.onMessage.addListener((request: any) => {
  if (!request?.action) return
  logger.info(`【消息通讯】收到后台消息: ${JSON.stringify(request)}`)

  if (request.action === 'start-auto-complaint') {
    logger.info('收到启动指令 [start-auto-complaint]，重置会话状态并开始流程')
    sessionStorage.setItem('ozon_auto_complaint_active', 'true')
    nextTask()
  } else if (request.action === 'stop-auto-complaint') {
    logger.info('收到停止指令 [stop-auto-complaint]，正在执行状态清理...')
    sessionStorage.setItem('ozon_auto_complaint_active', 'false')
    logger.success('自动化流程已停止')
  }
})

/// 检测步骤函数
async function nextTask() {
  const url = window.location.href
  logger.info(`【步骤】检查是否为 SCRM 界面, 当前 URL: ${url}`)
  if (!url.includes('group=support_v2')) {
    logger.warn('当前页面不是 SCRM 界面, 即将跳转...')
    window.location.href = 'https://seller.ozon.ru/app/messenger/?group=support_v2'
    return
  }
  // 使用正则匹配 group=support_v2 且包含具体的 id (UUID 格式)
  const hasChatId = /group=support_v2&id=[a-f0-9-]{36}/.test(url)
  if (!hasChatId) {
    logger.warn('当前页面不是具体的对话界面, 请先进入一个对话窗口')
    const css = 'div[data-onboarding-target="footer-ambulance-button-element"]'
    const chatButton = document.querySelector(css)
    if (chatButton && chatButton instanceof HTMLElement) {
      chatButton.click()
      await new Promise((r) => setTimeout(r, 500))
      const mailIcon = document.querySelector('use[href="#mail--sprite"]')
      const mailButton = mailIcon?.parentElement?.parentElement
      if (mailButton && mailButton instanceof HTMLElement) {
        mailButton.click()
        logger.info('已自动点击进入新对话界面, 请继续操作...')
      } else {
        logger.warn('未找到邮件按钮, 请手动进入一个对话窗口')
      }
    } else {
      logger.warn('未找到新对话按钮, 请手动进入一个对话窗口')
    }
    return
  }
}
