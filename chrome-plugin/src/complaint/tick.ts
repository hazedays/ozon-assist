import { logger } from '../core/logger'
import { getImage, getTextSpan, simulateKeyboardInput } from './helpers'
import { verboseInfo } from './verbose'

const SCRM_URL = 'https://seller.ozon.ru/app/messenger/?group=support_v2'
const SEND_ICON_PATH =
  'M5.086 3.537c-.299.877.247 4.73.6 5.697.445 1.22 1.814 1.515 3.35 1.77C15 12 15 12 9.035 12.995c-1.536.256-2.905.55-3.35 1.77-.353.968-.899 4.82-.6 5.698.255.748 0 1.488 8.933-3.49C21 13.082 21 12.542 21 11.999c0-.541 0-1.105-6.98-4.972-8.976-4.973-8.679-4.238-8.934-3.49'
const UPLOAD_ICON_PATH =
  'M11.055 3.703a5.835 5.835 0 0 1 8.239 0 5.804 5.804 0 0 1 0 8.22l-4.565 4.556a3.68 3.68 0 0 1-5.196 0 3.66 3.66 0 0 1 0-5.184l2.536-2.531a1.524 1.524 0 0 1 2.152 0 1.516 1.516 0 0 1 0 2.147l-2.536 2.531a.63.63 0 0 0 0 .89.63.63 0 0 0 .891 0l4.566-4.556a2.77 2.77 0 0 0 0-3.926 2.787 2.787 0 0 0-3.935 0L8.38 10.666a4.55 4.55 0 0 0 0 6.442l.522.521a4.57 4.57 0 0 0 6.456 0l2.797-2.791a1.524 1.524 0 0 1 2.152 0 1.516 1.516 0 0 1 0 2.147l-2.797 2.791a7.62 7.62 0 0 1-10.76 0l-.522-.52a7.58 7.58 0 0 1 0-10.738z'
const IMAGE_POLICY_LINK =
  'https://seller-edu.ozon.ru/policies/documents-violations/avtorskie-prava?utm_source=ru_sc_bot&utm_medium=link'
const FAILURE_MESSAGE =
  'Мы проверили ваш запрос. К сожалению, предоставленных доказательств недостаточно для подтверждения ваших авторских прав. В настоящее время авторские права не подтверждены, и нет причин скрывать товар. Вы можете приложить новые доказательства, которые позволят подтвердить ваши авторские права на контент.'

type ComplaintDraft = {
  id: number
  sku: string
  createdAt: number
}

let currentDraft: ComplaintDraft | null = null
let currentProcessingComplaint: { sku: string } | null = null

export function resetComplaintDraftState() {
  currentDraft = null
  currentProcessingComplaint = null
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function getActiveChatId(): string {
  const element = document.querySelector('div[active-chat-id] .m9d-n0') as HTMLElement | null
  return element?.innerText.trim() ?? ''
}

function getActionButton(path: string): HTMLButtonElement | null {
  const icon = document.querySelector(`path[d="${path}"]`)
  return (icon?.parentElement?.parentElement as HTMLButtonElement | null) ?? null
}

async function updateComplaintStatus(params: {
  tickId: number
  sku: string | null | undefined
  status: 'success' | 'failed'
  chatId: string
  missingSkuLog: string
}) {
  const { tickId, sku, status, chatId, missingSkuLog } = params

  if (!sku) {
    logger.warn(missingSkuLog)
    return false
  }

  const response = await chrome.runtime.sendMessage({
    action: 'post',
    url: `/complaint/${encodeURIComponent(sku)}/status`,
    data: {
      status,
      remark: chatId
        ? `投诉${status === 'success' ? '成功' : '失败'}，chatId=${chatId}`
        : `投诉${status === 'success' ? '成功' : '失败'}`
    }
  })

  verboseInfo(
    `【轮询#${tickId}】【投诉结果】/complaint/:sku/status(${status}) 响应: ${JSON.stringify(response)}`
  )

  return Boolean(response?.success)
}

function navigateComplaintMenu() {
  const steps = [
    [
      'Товары и Цены',
      '【菜单选择】点击“商品与价格”',
      '【菜单选择】未找到“商品与价格”，等待下一轮重试'
    ],
    [
      'Контроль качества',
      '【菜单选择】点击“质量控制”',
      '【菜单选择】未找到“质量控制”，等待下一轮重试'
    ],
    [
      'Нарушение правил площадки другим продавцом',
      '【菜单选择】点击“举报其他卖家违规”',
      '【菜单选择】未找到“举报其他卖家违规”'
    ],
    [
      'Использование моих фото, видео, текста',
      '【菜单选择】点击“他人使用我的图片、视频或文本”',
      '【菜单选择】未找到“他人使用我的图片、视频或文本”'
    ],
    [
      'Пожаловаться на другой товар',
      '【菜单选择】点击“投诉其他产品”',
      '【菜单选择】未找到“投诉其他产品”'
    ]
  ] as const

  for (const [label, hitMessage, missMessage] of steps) {
    const element = getTextSpan(label)
    if (element) {
      verboseInfo(hitMessage)
      element.click()
      continue
    }
    verboseInfo(missMessage)
  }
}

async function ensureConversationReady(params: {
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

async function handleSkuInputStage(params: {
  tickId: number
  allItems: NodeListOf<Element>
  sendBtn: HTMLButtonElement | null
}) {
  const { tickId, allItems, sendBtn } = params
  const lastItem = allItems[allItems.length - 1] as HTMLElement
  const itemImgs = allItems[allItems.length - 2].querySelectorAll('img')

  if (!(sendBtn?.disabled && lastItem.innerText === 'Назад' && itemImgs.length === 2)) {
    verboseInfo(
      `【轮询#${tickId}】【投诉单】未命中 SKU 输入条件, sendDisabled=${sendBtn?.disabled}, lastIsBack=${lastItem.innerText === 'Назад'}, previousMsgImageCount=${itemImgs.length}, lastText=${lastItem.innerText}`
    )
    return
  }

  let draft = currentDraft
  if (!draft) {
    logger.info('【投诉单】命中输入 SKU 场景，开始请求未处理投诉单')
    const response = await chrome.runtime.sendMessage({
      action: 'get',
      url: '/complaint/unprocessed'
    })
    verboseInfo(
      `【轮询#${tickId}】【投诉单】/complaint/unprocessed 响应: ${JSON.stringify(response)}`
    )
    if (!response?.success) {
      logger.error('获取未处理的投诉单失败，流程中断')
      sessionStorage.removeItem('ozon_auto_complaint_active')
      return
    }
    draft = {
      id: response.data.id,
      sku: response.data.sku,
      createdAt: Date.now()
    }
    currentDraft = draft
    currentProcessingComplaint = { sku: draft.sku }
    logger.info(`【投诉单】获取成功，SKU: ${draft.sku}, 投诉单ID: ${draft.id}`)
  } else {
    const draftAgeMs = Date.now() - draft.createdAt
    verboseInfo(
      `【轮询#${tickId}】【投诉单】复用当前草稿，SKU: ${draft.sku}, 投诉单ID: ${draft.id}, draftAgeMs=${draftAgeMs}`
    )
  }

  const inputResult = await simulateKeyboardInput(draft.sku)
  if (!inputResult.success) {
    logger.error(
      `输入 SKU 失败，流程中断。attempts=${inputResult.attempts}, expectedValue=${inputResult.expectedValue}, actualValue=${inputResult.actualValue || 'empty'}, textareaFound=${inputResult.textareaFound}`
    )
    currentDraft = null
    sessionStorage.removeItem('ozon_auto_complaint_active')
    return
  }

  verboseInfo(
    `【输入模块】SKU 输入成功。attempts=${inputResult.attempts}, expectedValue=${inputResult.expectedValue}, actualValue=${inputResult.actualValue || 'empty'}, textareaFound=${inputResult.textareaFound}`
  )

  if (sendBtn && !sendBtn.disabled) {
    verboseInfo('【发送动作】SKU 输入成功且发送按钮可用，准备点击发送')
    sendBtn.click()
    currentDraft = null
    return
  }

  verboseInfo('【发送动作】SKU 输入后发送按钮仍不可用，等待下一轮轮询')
}

async function handleImageUploadStage(params: {
  tickId: number
  allItems: NodeListOf<Element>
  sendBtn: HTMLButtonElement | null
  chatId: string
}) {
  const { tickId, allItems, sendBtn, chatId } = params
  const lastItem = allItems[allItems.length - 1] as HTMLElement

  if (!lastItem.querySelector('a')?.href.includes(IMAGE_POLICY_LINK)) {
    verboseInfo(`【轮询#${tickId}】【附件检查】当前消息未进入附件上传阶段`)
    return
  }

  const uploadFileBtn = getActionButton(UPLOAD_ICON_PATH)
  if (!uploadFileBtn) {
    logger.warn(`【轮询#${tickId}】【附件检查】未定位到上传按钮图标或按钮节点`)
  }
  verboseInfo(
    `【附件检查】uploadBtnFound=${Boolean(uploadFileBtn)}, uploadBtnDisabled=${uploadFileBtn ? uploadFileBtn.disabled : 'n/a'}, uploading=${Boolean(document.querySelector('circle'))}, sendDisabled=${sendBtn?.disabled}`
  )

  if (
    uploadFileBtn &&
    !uploadFileBtn.disabled &&
    !document.querySelector('circle') &&
    sendBtn?.disabled
  ) {
    logger.info('【附件上传】开始获取并注入图片')
    const img = await getImage()
    if (img) {
      const fileInput = document.querySelector('input[type="file"]')
      if (fileInput && fileInput instanceof HTMLInputElement) {
        verboseInfo(
          `【附件上传】准备上传图片: ${img[0].name} (${(img[0].size / 1024).toFixed(2)} KB)`
        )
        fileInput.files = img
        fileInput.dispatchEvent(new Event('change', { bubbles: true }))
        logger.success('图片已成功注入上传控件')
      } else {
        logger.error('未找到文件上传 input 元素')
      }
    } else {
      logger.warn('【附件上传】未获取到图片文件，等待下一轮重试')
    }
  }

  const hasPrevImg =
    document.querySelector('div[current-chat-id]')?.querySelector('img')?.alt.trim() ===
    'Предпросмотр изображения'
  if (!(hasPrevImg && sendBtn && !sendBtn.disabled)) {
    verboseInfo(
      `【轮询#${tickId}】【发送动作】发送条件未满足, hasPrevImg=${hasPrevImg}, sendDisabled=${sendBtn?.disabled}`
    )
    return
  }

  logger.info('【发送动作】检测到图片预览且发送按钮可用，执行发送')
  sendBtn.click()

  const success = await updateComplaintStatus({
    tickId,
    sku: currentProcessingComplaint?.sku,
    status: 'success',
    chatId,
    missingSkuLog: '【发送动作】未拿到当前投诉 SKU，无法回写 success 状态'
  })
  if (success) {
    currentProcessingComplaint = null
    sessionStorage.removeItem('current_chat_id')
  }
}

async function handleFailureStage(params: {
  tickId: number
  allItems: NodeListOf<Element>
  chatId: string
}) {
  const { tickId, allItems, chatId } = params
  const lastItem = allItems[allItems.length - 1] as HTMLElement

  if (!lastItem.innerText.includes(FAILURE_MESSAGE)) {
    verboseInfo(`【轮询#${tickId}】【投诉结果】当前未检测到证据不足结论`)
    return
  }

  logger.info('【投诉结果】检测到平台返回证据不足，写入失败标记并准备下一轮新建投诉')
  sessionStorage.setItem('complaint-failed', 'true')
  sessionStorage.removeItem('current_chat_id')

  const failed = await updateComplaintStatus({
    tickId,
    sku: currentProcessingComplaint?.sku,
    status: 'failed',
    chatId,
    missingSkuLog: '【投诉结果】未拿到当前投诉 SKU，无法回写 failed 状态'
  })
  if (failed) {
    currentProcessingComplaint = null
  }
}

export async function runComplaintTick(params: { tickId: number; scheduleNext: () => void }) {
  const { tickId, scheduleNext } = params

  const url = window.location.href
  verboseInfo(`【轮询#${tickId}】【页面检查】准备校验当前页面是否在 SCRM 对话界面, URL: ${url}`)

  const readyState = await ensureConversationReady({ tickId, url, scheduleNext })
  if (readyState.shouldStop) {
    return
  }

  navigateComplaintMenu()

  const allItems = document.querySelectorAll('.om_1_n9 .om_1_o')
  verboseInfo(`【消息区域】检测到消息项数量: ${allItems.length}`)
  if (allItems.length < 10) {
    verboseInfo('【消息区域】消息项数量不足，暂不进入投诉动作判断')
    return
  }

  const sendBtn = getActionButton(SEND_ICON_PATH)
  if (!sendBtn) {
    logger.warn(`【轮询#${tickId}】【发送态检查】未定位到发送按钮图标或按钮节点`)
  }

  const previousMsgImageCount = allItems[allItems.length - 2].querySelectorAll('img').length
  verboseInfo(
    `【发送态检查】sendDisabled=${sendBtn?.disabled}, lastText=${(allItems[allItems.length - 1] as HTMLElement).innerText}, previousMsgImageCount=${previousMsgImageCount}`
  )

  await handleSkuInputStage({ tickId, allItems, sendBtn })
  await handleImageUploadStage({
    tickId,
    allItems,
    sendBtn,
    chatId: readyState.chatId
  })
  await handleFailureStage({
    tickId,
    allItems,
    chatId: readyState.chatId
  })
}
