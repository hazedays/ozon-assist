import { logger } from '../core/logger'
import {
  ensureConversationReady,
  getSendButton,
  handleImageUploadStage,
  handleResultStage,
  handleSkuInputStage,
  navigateComplaintMenu
} from './tick-flow'
export { resetComplaintDraftState } from './tick-state'
import { verboseInfo } from './verbose'

/**
 * 投诉轮询主入口。
 *
 * 这里只负责流程编排：
 * 1. 会话准备
 * 2. 菜单导航
 * 3. SKU 阶段
 * 4. 图片阶段
 * 5. 失败结果检测
 */
export async function runComplaintTick(params: { tickId: number; scheduleNext: () => void }) {
  const { tickId, scheduleNext } = params

  const url = window.location.href
  verboseInfo(`【轮询#${tickId}】【页面检查】准备校验当前页面是否在 SCRM 对话界面, URL: ${url}`)

  const readyState = await ensureConversationReady({ tickId, url, scheduleNext })
  if (readyState.shouldStop) {
    return
  }

  const resultCheckItems = document.querySelectorAll('.om_1_n9 .om_1_o')
  const resultStage = await handleResultStage({
    tickId,
    allItems: resultCheckItems,
    chatId: readyState.chatId
  })
  if (resultStage.shouldStop) {
    return
  }

  navigateComplaintMenu()

  const allItems = document.querySelectorAll('.om_1_n9 .om_1_o')
  verboseInfo(`【消息区域】检测到消息项数量: ${allItems.length}`)
  if (allItems.length < 10) {
    verboseInfo('【消息区域】消息项数量不足，暂不进入投诉动作判断')
    return
  }

  const sendBtn = getSendButton()
  if (!sendBtn) {
    logger.warn(`【轮询#${tickId}】【发送态检查】未定位到发送按钮图标或按钮节点`)
  }

  const previousMsgImageCount = allItems[allItems.length - 2].querySelectorAll('img').length
  verboseInfo(
    `【发送态检查】sendDisabled=${sendBtn?.disabled}, lastText=${(allItems[allItems.length - 1] as HTMLElement).innerText}, previousMsgImageCount=${previousMsgImageCount}`
  )

  const skuStageResult = await handleSkuInputStage({ tickId, allItems, sendBtn })
  if (skuStageResult.shouldStop) {
    return
  }

  await handleImageUploadStage({
    tickId,
    allItems,
    sendBtn,
    chatId: readyState.chatId
  })
}
