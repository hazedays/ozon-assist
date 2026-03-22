import { logger } from '../core/logger'
import { getImage, getTextSpan, simulateKeyboardInput } from './helpers'
import { FAILURE_MESSAGE, getActionButton, IMAGE_POLICY_LINK, UPLOAD_ICON_PATH } from './tick-dom'
import {
  complaintTickState,
  type ComplaintStopStats,
  recordComplaintStopEvent,
  setCurrentProcessingComplaint
} from './tick-state'
import { verboseInfo } from './verbose'

const SUCCESS_MESSAGE = 'Пожаловаться на другой товар'

function reportStopStatsEvent(category: 'completed' | 'interrupted', stats: ComplaintStopStats) {
  logger.runtimeEvent('complaint.stop-stats', '投诉流程停止统计已更新', {
    category,
    completed: stats.completed,
    interrupted: stats.interrupted,
    lastReason: stats.lastReason || '',
    updatedAt: stats.updatedAt || 0
  })
}

/**
 * 投诉流程的阶段性处理。
 *
 * 包括：
 * 1. 输入 SKU
 * 2. 上传图片并发送
 * 3. 根据平台回复回写 success / failed
 */
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

/**
 * 处理“输入 SKU”阶段。
 *
 * 进入条件由消息区状态共同决定，因此这里不会主动切阶段，
 * 只在满足条件时执行输入与首次发送。
 */
export async function handleSkuInputStage(params: {
  tickId: number
  allItems: NodeListOf<Element>
  sendBtn: HTMLButtonElement | null
}): Promise<{ shouldStop: boolean }> {
  const { tickId, allItems, sendBtn } = params
  const lastItem = allItems[allItems.length - 1] as HTMLElement
  const itemImgs = allItems[allItems.length - 2].querySelectorAll('img')

  if (!(sendBtn?.disabled && lastItem.innerText === 'Назад' && itemImgs.length === 2)) {
    verboseInfo(
      `【轮询#${tickId}】【投诉单】未命中 SKU 输入条件, sendDisabled=${sendBtn?.disabled}, lastIsBack=${lastItem.innerText === 'Назад'}, previousMsgImageCount=${itemImgs.length}, lastText=${lastItem.innerText}`
    )
    return { shouldStop: false }
  }

  let draft = complaintTickState.currentDraft
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
      complaintTickState.currentDraft = null
      setCurrentProcessingComplaint(null)
      sessionStorage.removeItem('ozon_auto_complaint_active')
      const stats = recordComplaintStopEvent('interrupted', 'fetch-unprocessed-failed')
      logger.warn(
        `【停止统计】异常中断累计=${stats.interrupted}, 已完成累计=${stats.completed}, reason=${stats.lastReason}`
      )
      reportStopStatsEvent('interrupted', stats)
      return { shouldStop: true }
    }
    const sku = response.data?.sku
    const id = response.data?.id
    if (!sku) {
      logger.info('【投诉单】未返回新的 SKU，说明所有任务已处理完成，停止自动投诉')
      complaintTickState.currentDraft = null
      setCurrentProcessingComplaint(null)
      sessionStorage.removeItem('ozon_auto_complaint_active')
      const stats = recordComplaintStopEvent('completed', 'no-sku-returned')
      logger.success(
        `【停止统计】任务完成累计=${stats.completed}, 异常中断累计=${stats.interrupted}, reason=${stats.lastReason}`
      )
      reportStopStatsEvent('completed', stats)
      return { shouldStop: true }
    }
    draft = {
      id,
      sku,
      createdAt: Date.now()
    }
    complaintTickState.currentDraft = draft
    setCurrentProcessingComplaint(draft.sku)
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
    complaintTickState.currentDraft = null
    setCurrentProcessingComplaint(null)
    sessionStorage.removeItem('ozon_auto_complaint_active')
    const stats = recordComplaintStopEvent('interrupted', 'sku-input-failed')
    logger.warn(
      `【停止统计】异常中断累计=${stats.interrupted}, 已完成累计=${stats.completed}, reason=${stats.lastReason}`
    )
    reportStopStatsEvent('interrupted', stats)
    return { shouldStop: true }
  }

  verboseInfo(
    `【输入模块】SKU 输入成功。attempts=${inputResult.attempts}, expectedValue=${inputResult.expectedValue}, actualValue=${inputResult.actualValue || 'empty'}, textareaFound=${inputResult.textareaFound}`
  )

  if (sendBtn && !sendBtn.disabled) {
    verboseInfo('【发送动作】SKU 输入成功且发送按钮可用，准备点击发送')
    sendBtn.click()
    complaintTickState.currentDraft = null
    return { shouldStop: true }
  }

  verboseInfo('【发送动作】SKU 输入后发送按钮仍不可用，等待下一轮轮询')
  return { shouldStop: false }
}

export async function handleImageUploadStage(params: {
  tickId: number
  allItems: NodeListOf<Element>
  sendBtn: HTMLButtonElement | null
  chatId: string
}) {
  const { tickId, allItems, sendBtn } = params
  const lastItem = allItems[allItems.length - 1] as HTMLElement

  // 该链接只会出现在平台要求上传权属证明的阶段，因此可作为图片阶段判定信号。
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
}

export async function handleResultStage(params: {
  tickId: number
  allItems: NodeListOf<Element>
  chatId: string
}): Promise<{ shouldStop: boolean }> {
  const { tickId, allItems, chatId } = params
  if (allItems.length === 0) {
    return { shouldStop: false }
  }

  const lastItem = allItems[allItems.length - 1] as HTMLElement

  // 用户确认：出现“Пожаловаться на другой товар”即视为当前投诉成功。
  if (getTextSpan(SUCCESS_MESSAGE)) {
    const success = await updateComplaintStatus({
      tickId,
      sku: complaintTickState.currentProcessingComplaint?.sku,
      status: 'success',
      chatId,
      missingSkuLog: '【投诉结果】未拿到当前投诉 SKU，无法回写 success 状态'
    })
    if (success) {
      setCurrentProcessingComplaint(null)
      sessionStorage.removeItem('current_chat_id')
    }
    return { shouldStop: true }
  }

  // 只有命中平台固定失败文案时，才将当前投诉回写为 failed。
  if (!lastItem.innerText.includes(FAILURE_MESSAGE)) {
    verboseInfo(`【轮询#${tickId}】【投诉结果】当前未检测到证据不足结论`)
    return { shouldStop: false }
  }

  logger.info('【投诉结果】检测到平台返回证据不足，写入失败标记并准备下一轮新建投诉')
  sessionStorage.setItem('complaint-failed', 'true')
  sessionStorage.removeItem('current_chat_id')

  const failed = await updateComplaintStatus({
    tickId,
    sku: complaintTickState.currentProcessingComplaint?.sku,
    status: 'failed',
    chatId,
    missingSkuLog: '【投诉结果】未拿到当前投诉 SKU，无法回写 failed 状态'
  })
  if (failed) {
    setCurrentProcessingComplaint(null)
  }

  return { shouldStop: true }
}
