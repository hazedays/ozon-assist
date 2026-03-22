import { logger } from '../core/logger'
import { getActiveChatId, SCRM_URL } from './tick-dom'
import { verboseInfo } from './verbose'

/**
 * 负责页面跳转、会话建立和会话漂移修正。
 *
 * 返回 shouldStop=true 表示当前轮询已经处理完前置条件，
 * 调用方应立即结束本轮，等待下一轮继续。
 */
function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export async function ensureConversationReady(params: {
  tickId: number
  url: string
  scheduleNext: () => void
}): Promise<{ shouldStop: true } | { shouldStop: false; chatId: string }> {
  const { tickId, url, scheduleNext } = params

  if (
    !url.includes('group=support_v2') &&
    !sessionStorage.getItem('complaint-failed') &&
    !sessionStorage.getItem('ozon_auto_load')
  ) {
    logger.warn(`【轮询#${tickId}】【页面检查】当前页面不是 SCRM 界面, 即将跳转...`)
    window.location.href = SCRM_URL
    return { shouldStop: true }
  }

  if (!url.includes('group=support_v2')) {
    verboseInfo(
      `【轮询#${tickId}】【页面检查】当前 URL 非 SCRM，但因 complaint-failed/ozon_auto_load 状态存在，暂不跳转`
    )
  }

  const hasChatId = /id=[a-f0-9-]{36}/.test(url)
  const complaintFailed = sessionStorage.getItem('complaint-failed')
  const autoLoad = sessionStorage.getItem('ozon_auto_load')
  verboseInfo(
    `【轮询#${tickId}】【会话检查】hasChatId=${hasChatId}, complaintFailed=${complaintFailed ?? 'null'}, ozonAutoLoad=${autoLoad ?? 'null'}`
  )

  if ((!hasChatId || complaintFailed) && !autoLoad) {
    const chatButton = document.querySelector(
      'button[data-onboarding-target="floating-help-button"]'
    ) as HTMLButtonElement | null
    if (chatButton) {
      verboseInfo('【会话处理】将尝试通过悬浮帮助按钮进入新对话')
      sessionStorage.removeItem('complaint-failed')
      chatButton.click()
      await sleep(500)

      const allButtons = document.querySelectorAll(
        '.tippy-box button[type="submit"]'
      ) as NodeListOf<HTMLButtonElement>

      sessionStorage.setItem('ozon_auto_load', 'true')
      verboseInfo(`【会话处理】弹层提交按钮数量: ${allButtons.length}`)
      const submitBtn = allButtons[allButtons.length - 1]
      if (submitBtn) {
        submitBtn.click()
        logger.success('【会话处理】已触发新对话入口按钮点击')
      } else {
        logger.warn('【会话处理】弹层中未找到可点击的提交按钮')
      }
    } else {
      logger.warn('未找到新对话按钮, 请手动进入一个对话窗口')
    }
    return { shouldStop: true }
  }

  if ((!hasChatId || complaintFailed) && autoLoad) {
    verboseInfo(`【轮询#${tickId}】【会话处理】新对话流程已触发，等待页面加载完成`)
  }

  if (complaintFailed) {
    verboseInfo(`【轮询#${tickId}】【流程状态】存在投诉失败标记，本轮等待新对话加载`)
    return { shouldStop: true }
  }

  const chatId = getActiveChatId()
  if (!chatId.startsWith('№')) {
    verboseInfo(
      `【轮询#${tickId}】【会话检查】当前 chatId='${chatId || 'empty'}'，会话标题未就绪，继续等待`
    )
    await sleep(500)
    scheduleNext()
    return { shouldStop: true }
  }

  // current_chat_id 用于锁定既定会话，避免轮询过程中意外切到其他聊天窗口。
  const currentChatId = sessionStorage.getItem('current_chat_id')
  if (!currentChatId) {
    verboseInfo(`【轮询#${tickId}】【会话绑定】记录当前会话ID: ${chatId}`)
    sessionStorage.setItem('current_chat_id', chatId)
  } else if (currentChatId !== chatId) {
    logger.warn(
      `【轮询#${tickId}】【会话绑定】检测到会话漂移，期望=${currentChatId}，实际=${chatId}`
    )
    const chat = document.querySelector(
      `div[conversationid="${currentChatId}"]`
    ) as HTMLDivElement | null

    if (chat) {
      verboseInfo(`【轮询#${tickId}】【会话绑定】尝试切回既定会话`)
      chat.click()
      await sleep(500)
      scheduleNext()
      return { shouldStop: true }
    }

    logger.warn(`【轮询#${tickId}】【会话绑定】未找到既定会话节点，等待下一轮重试`)
    sessionStorage.setItem('current_chat_id', chatId)
  }

  sessionStorage.removeItem('ozon_auto_load')
  return { shouldStop: false, chatId }
}
