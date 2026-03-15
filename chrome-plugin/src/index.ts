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
  const active = sessionStorage.getItem('ozon_auto_complaint_active')
  if (!active || active === 'false') {
    logger.info('自动化流程未激活，跳过执行')
    return
  }
  await new Promise((r) => setTimeout(r, 500))
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
  const step1 = getTextSpan('Товары и Цены')
  if (step1) {
    logger.info('【步骤1】点击 “Товары и Цены”')
    step1.click()
  }
  const step2 = getTextSpan('Контроль качества')
  if (step2) {
    logger.info('【步骤2】点击 “Контроль качества”')
    step2.click()
  }
  const step3 = getTextSpan('Нарушение правил площадки другим продавцом')
  if (step3) {
    logger.info('【步骤3】点击 “Нарушение правил площадки...”')
    step3.click()
  }
  const step4 = getTextSpan('Использование моих фото, видео, текста')
  if (step4) {
    logger.info('【步骤4】点击 “Использование моих фото...”')
    step4.click()
  }
  const btnIcon =
    'M11.055 3.703a5.835 5.835 0 0 1 8.239 0 5.804 5.804 0 0 1 0 8.22l-4.565 4.556a3.68 3.68 0 0 1-5.196 0 3.66 3.66 0 0 1 0-5.184l2.536-2.531a1.524 1.524 0 0 1 2.152 0 1.516 1.516 0 0 1 0 2.147l-2.536 2.531a.63.63 0 0 0 0 .89.63.63 0 0 0 .891 0l4.566-4.556a2.77 2.77 0 0 0 0-3.926 2.787 2.787 0 0 0-3.935 0L8.38 10.666a4.55 4.55 0 0 0 0 6.442l.522.521a4.57 4.57 0 0 0 6.456 0l2.797-2.791a1.524 1.524 0 0 1 2.152 0 1.516 1.516 0 0 1 0 2.147l-2.797 2.791a7.62 7.62 0 0 1-10.76 0l-.522-.52a7.58 7.58 0 0 1 0-10.738z'
  const fileBtn = document.querySelector(`path[d="${btnIcon}"]`)
  if (
    fileBtn &&
    fileBtn.parentElement?.parentElement &&
    fileBtn.parentElement.parentElement instanceof HTMLButtonElement &&
    !fileBtn.parentElement.parentElement.disabled
  ) {
    logger.info('【步骤5】检测到上传按钮，开始获取图片...')
    const img = await getImage()
    if (!img) {
      logger.error('获取图片失败，流程中断')
      return
    }
    const fileInput = document.querySelector('input[type="file"]')
    if (fileInput && fileInput instanceof HTMLInputElement) {
      logger.info(`【步骤6】准备上传图片: ${img[0].name} (${(img[0].size / 1024).toFixed(2)} KB)`)
      fileInput.files = img
      fileInput.dispatchEvent(new Event('change', { bubbles: true }))
      logger.success('图片已成功注入上传控件')
    } else {
      logger.error('未找到文件上传 input 元素')
    }
  }
}

/**
 * 获取文本元素
 * @param text
 * @returns
 */
function getTextSpan(text: string): HTMLSpanElement | undefined {
  const spans = [...document.querySelectorAll('span')]
  const el = spans.find((s) => s.innerText.trim() === text.trim())
  return el
}

/**
 * 获取图片
 * @param url
 * @returns
 */
async function getImage() {
  const url = '/image/random'
  const resp = await chrome.runtime.sendMessage({ action: 'get-image', url })
  if (!resp.success || !resp.data) {
    logger.error(`获取图片失败: ${resp.error}`)
    return null
  }

  // 将 Base64 字符串转换回 Blob
  const base64Data = resp.data
  const response = await fetch(base64Data)
  const blob = await response.blob()

  const ext = blob.type?.split('/')[1] || 'jpg'
  const fileName = `${Math.random().toString(36).substring(7)}.${ext}`
  const file = new File([blob], fileName, {
    type: blob.type || 'image/jpeg'
  })

  const dt = new DataTransfer()
  dt.items.add(file)
  return dt.files
}
