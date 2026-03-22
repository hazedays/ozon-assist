/**
 * Ozon Auto Complaint - Entry Point (MV3 Content Script)
 *
 * 作为 Chrome Extension MV3 的 Content Script 注入到卖家后台页面。
 * 负责监听来自 Background 的启停指令，并驱动 nextTask 轮询执行自动投诉流程。
 *
 * 流程概览：
 *  1. 确保当前页面处于 SCRM 对话列表（group=support_v2）
 *  2. 若无打开的对话 / 投诉失败，则自动点击「新建对话」按钮
 *  3. 等待对话编号出现（以 № 开头）后依次点击投诉菜单选项
 *  4. 检测到 SKU 输入场景时通过 Background 获取投诉单并填写
 *  5. 检测到证据上传场景时获取图片并注入 file input
 *  6. 发送完成后继续轮询下一条投诉单
 *
 * sessionStorage 键说明：
 *  - ozon_auto_complaint_active : 自动化总开关（'true' 时启用）
 *  - ozon_auto_load             : 防止重复触发「新建对话」按钮的节流标记
 *  - complaint-failed           : 当前对话投诉失败标记，触发后下一轮重新建单
 */

import { logger } from './core/logger'

let tickSeq = 0
const VERBOSE_LOG_KEY = 'ozon_auto_complaint_verbose'

function isVerboseLogEnabled() {
  return sessionStorage.getItem(VERBOSE_LOG_KEY) === 'true'
}

function verboseInfo(msg: string) {
  if (isVerboseLogEnabled()) {
    logger.info(msg)
  }
}

logger.info('=== Ozon 自动化 Content Script (TypeScript 版) 已加载 ===')
logger.info(
  `详细日志开关: sessionStorage.setItem('${VERBOSE_LOG_KEY}', 'true') / removeItem('${VERBOSE_LOG_KEY}')`
)

// 页面加载完成后立即尝试启动轮询，处理页面跳转后的恢复场景
window.addEventListener('load', () => {
  const url = window.location.href
  logger.info(`【页面事件】load 已触发, 当前 URL: ${url}`)
  nextTask()
})

/**
 * 监听来自 Background Service Worker 的控制指令。
 *
 * 支持的 action：
 *  - start-auto-complaint : 写入激活标记并立即启动轮询
 *  - stop-auto-complaint  : 清除激活标记，下一轮 nextTask 检测到后自动停止
 */
chrome.runtime.onMessage.addListener((request: any) => {
  if (!request?.action) return
  logger.info(`【消息通讯】收到后台消息: ${JSON.stringify(request)}`)

  if (request.action === 'start-auto-complaint') {
    logger.info('收到启动指令 [start-auto-complaint]，重置会话状态并开始流程')
    sessionStorage.setItem('ozon_auto_complaint_active', 'true')
    sessionStorage.removeItem('complaint-failed')
    sessionStorage.removeItem('ozon_auto_load')
    sessionStorage.removeItem('current_chat_id')
    nextTask()
  } else if (request.action === 'stop-auto-complaint') {
    logger.info('收到停止指令 [stop-auto-complaint]，正在执行状态清理...')
    sessionStorage.removeItem('ozon_auto_complaint_active')
    sessionStorage.removeItem('ozon_auto_load')
    sessionStorage.removeItem('complaint-failed')
    sessionStorage.removeItem('current_chat_id')
    logger.success('自动化流程已停止')
  }
})

/**
 * 自动化投诉主循环。
 *
 * 每次调用代表一次「轮询 tick」，函数末尾会递归调用自身以实现持续轮询。
 * 通过 sessionStorage.ozon_auto_complaint_active 控制是否继续执行。
 * 每轮开始前等待 500ms，避免对页面渲染造成压力。
 */
async function nextTask() {
  const tickId = ++tickSeq
  const tickStartAt = Date.now()
  const active = sessionStorage.getItem('ozon_auto_complaint_active')
  verboseInfo(`【轮询#${tickId}】开始执行, 自动化激活标记: ${active ?? 'null'}`)
  if (!active || active === 'false') {
    verboseInfo(`【轮询#${tickId}】自动化流程未激活，跳过执行`)
    return
  }

  try {
    await new Promise((r) => setTimeout(r, 500))

    const url = window.location.href
    verboseInfo(`【轮询#${tickId}】【页面检查】准备校验当前页面是否在 SCRM 对话界面, URL: ${url}`)

    if (
      !url.includes('group=support_v2') &&
      !sessionStorage.getItem('complaint-failed') &&
      !sessionStorage.getItem('ozon_auto_load')
    ) {
      logger.warn(`【轮询#${tickId}】【页面检查】当前页面不是 SCRM 界面, 即将跳转...`)
      window.location.href = 'https://seller.ozon.ru/app/messenger/?group=support_v2'
      return
    }

    if (!url.includes('group=support_v2')) {
      verboseInfo(
        `【轮询#${tickId}】【页面检查】当前 URL 非 SCRM，但因 complaint-failed/ozon_auto_load 状态存在，暂不跳转`
      )
    }

    // URL 中含有 UUID 格式的 id 参数时，表示当前处于具体的对话界面
    const hasChatId = /id=[a-f0-9-]{36}/.test(url)
    const complaintFailed = sessionStorage.getItem('complaint-failed')
    const autoLoad = sessionStorage.getItem('ozon_auto_load')
    verboseInfo(
      `【轮询#${tickId}】【会话检查】hasChatId=${hasChatId}, complaintFailed=${complaintFailed ?? 'null'}, ozonAutoLoad=${autoLoad ?? 'null'}`
    )

    // 无有效对话 ID 或上一条投诉失败时，通过悬浮帮助按钮创建新对话
    // ozon_auto_load 作为单次节流标记，防止在页面跳转期间重复触发
    if ((!hasChatId || complaintFailed) && !autoLoad) {
      const chatButton = document.querySelector(
        'button[data-onboarding-target="floating-help-button"]'
      ) as HTMLButtonElement | null
      if (chatButton) {
        verboseInfo('【会话处理】将尝试通过悬浮帮助按钮进入新对话')
        sessionStorage.removeItem('complaint-failed')
        chatButton.click()
        await new Promise((r) => setTimeout(r, 500))

        // tippy 弹层中最后一个 submit 按钮为「进入对话」确认按钮
        const allButtons = document.querySelectorAll(
          '.tippy-box button[type="submit"]'
        ) as NodeListOf<HTMLButtonElement>

        // 设置节流标记，避免下一轮 tick 在跳转完成前再次点击
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
      return
    }

    if ((!hasChatId || complaintFailed) && autoLoad) {
      verboseInfo(`【轮询#${tickId}】【会话处理】新对话流程已触发，等待页面加载完成`)
    }

    if (complaintFailed) {
      verboseInfo(`【轮询#${tickId}】【流程状态】存在投诉失败标记，本轮等待新对话加载`)
      return
    }

    // 读取当前对话标题，格式为「№ XXXXXX」，未加载完成时可能为空或其他内容
    const chatId =
      (
        document.querySelector('div[active-chat-id] .m9d-n0') as HTMLElement | null
      )?.innerText.trim() ?? ''

    // 对话标题尚未渲染完毕，等待下一轮再继续
    if (!chatId.startsWith('№')) {
      verboseInfo(
        `【轮询#${tickId}】【会话检查】当前 chatId='${chatId || 'empty'}'，会话标题未就绪，继续等待`
      )
      await new Promise((r) => setTimeout(r, 500))
      nextTask()
      return
    }

    if (!sessionStorage.getItem('current_chat_id')) {
      verboseInfo(`【轮询#${tickId}】【会话绑定】记录当前会话ID: ${chatId}`)
      sessionStorage.setItem('current_chat_id', chatId)
    } else if (sessionStorage.getItem('current_chat_id') !== chatId) {
      logger.warn(
        `【轮询#${tickId}】【会话绑定】检测到会话漂移，期望=${sessionStorage.getItem('current_chat_id')}，实际=${chatId}`
      )
      const chat = document.querySelector(
        `div[conversationid="${sessionStorage.getItem('current_chat_id')}"]`
      ) as HTMLDivElement | null

      if (chat) {
        verboseInfo(`【轮询#${tickId}】【会话绑定】尝试切回既定会话`)
        chat.click()
        await new Promise((r) => setTimeout(r, 500))
        nextTask()
        return
      }

      logger.warn(`【轮询#${tickId}】【会话绑定】未找到既定会话节点，等待下一轮重试`)
      sessionStorage.setItem('current_chat_id', chatId)
    }

    // 对话已就绪，清除新建对话节流标记
    sessionStorage.removeItem('ozon_auto_load')

    const step1 = getTextSpan('Товары и Цены')
    if (step1) {
      verboseInfo('【菜单选择】点击“Товары и Цены”')
      step1.click()
    } else {
      verboseInfo('【菜单选择】未找到“Товары и Цены”，等待下一轮重试')
    }

    const step2 = getTextSpan('Контроль качества')
    if (step2) {
      verboseInfo('【菜单选择】点击“Контроль качества”')
      step2.click()
    } else {
      verboseInfo('【菜单选择】未找到“Контроль качества”，等待下一轮重试')
    }

    const step3 = getTextSpan('Нарушение правил площадки другим продавцом')
    if (step3) {
      verboseInfo('【菜单选择】点击“Нарушение правил площадки другим продавцом”')
      step3.click()
    } else {
      verboseInfo('【菜单选择】未找到“Нарушение правил площадки другим продавцом”')
    }

    const step4 = getTextSpan('Использование моих фото, видео, текста')
    if (step4) {
      verboseInfo('【菜单选择】点击“Использование моих фото, видео, текста”')
      step4.click()
    } else {
      verboseInfo('【菜单选择】未找到“Использование моих фото, видео, текста”')
    }

    // 对话消息列表，消息数 >= 10 通常意味着 bot 已进入投诉选项交互流程
    const allItems = document.querySelectorAll('.om_1_n9 .om_1_o')
    verboseInfo(`【消息区域】检测到消息项数量: ${allItems.length}`)
    if (allItems.length >= 10) {
      // 通过发送按钮图标的 SVG path 定位发送按钮（平台未提供稳定的 data-* 属性）
      const sendIconValue =
        'M5.086 3.537c-.299.877.247 4.73.6 5.697.445 1.22 1.814 1.515 3.35 1.77C15 12 15 12 9.035 12.995c-1.536.256-2.905.55-3.35 1.77-.353.968-.899 4.82-.6 5.698.255.748 0 1.488 8.933-3.49C21 13.082 21 12.542 21 11.999c0-.541 0-1.105-6.98-4.972-8.976-4.973-8.679-4.238-8.934-3.49'
      const sendBtnIcon = document.querySelector(`path[d="${sendIconValue}"]`)
      const sendBtn = sendBtnIcon?.parentElement?.parentElement as HTMLButtonElement
      if (!sendBtnIcon || !sendBtn) {
        logger.warn(`【轮询#${tickId}】【发送态检查】未定位到发送按钮图标或按钮节点`)
      }

      // 倒数第二条消息中的图片数量，用于判断是否处于需要填写 SKU 的阶段
      const itemImgs = allItems[allItems.length - 2].querySelectorAll('img')
      verboseInfo(
        `【发送态检查】sendDisabled=${sendBtn?.disabled}, lastText=${(allItems[allItems.length - 1] as HTMLElement).innerText}, previousMsgImageCount=${itemImgs.length}`
      )

      // 判断条件：发送按钮禁用 + 最后一条消息文字为「Назад」+ 前一条消息含 2 张图片
      // 满足以上条件时，表示 bot 正在等待用户输入侵权商品的 SKU
      if (
        sendBtn.disabled &&
        (allItems[allItems.length - 1] as HTMLElement).innerText === 'Назад' &&
        itemImgs.length === 2
      ) {
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
        const { sku, id } = response.data
        logger.info(`【投诉单】获取成功，SKU: ${sku}, 投诉单ID: ${id}`)
        const inputSuccess = await simulateKeyboardInput(sku)
        if (!inputSuccess) {
          logger.error('输入 SKU 失败，流程中断')
          sessionStorage.removeItem('ozon_auto_complaint_active')
          return
        }

        if (sendBtn && !sendBtn.disabled) {
          verboseInfo('【发送动作】SKU 输入成功且发送按钮可用，准备点击发送')
          sendBtn.click()
        } else {
          verboseInfo('【发送动作】SKU 输入后发送按钮仍不可用，等待下一轮轮询')
        }
      } else {
        verboseInfo(
          `【轮询#${tickId}】【投诉单】未命中 SKU 输入条件, sendDisabled=${sendBtn?.disabled}, lastIsBack=${(allItems[allItems.length - 1] as HTMLElement).innerText === 'Назад'}, previousMsgImageCount=${itemImgs.length}, lastText=${(allItems[allItems.length - 1] as HTMLElement).innerText}`
        )
      }

      // 最后一条消息包含版权政策链接时，表示 bot 已确认侵权类别，进入证据上传阶段
      if (
        (allItems[allItems.length - 1] as HTMLElement)
          .querySelector('a')
          ?.href.includes(
            'https://seller-edu.ozon.ru/policies/documents-violations/avtorskie-prava?utm_source=ru_sc_bot&utm_medium=link'
          )
      ) {
        // 通过附件按钮图标的 SVG path 定位上传按钮
        const uploadFileIconValue =
          'M11.055 3.703a5.835 5.835 0 0 1 8.239 0 5.804 5.804 0 0 1 0 8.22l-4.565 4.556a3.68 3.68 0 0 1-5.196 0 3.66 3.66 0 0 1 0-5.184l2.536-2.531a1.524 1.524 0 0 1 2.152 0 1.516 1.516 0 0 1 0 2.147l-2.536 2.531a.63.63 0 0 0 0 .89.63.63 0 0 0 .891 0l4.566-4.556a2.77 2.77 0 0 0 0-3.926 2.787 2.787 0 0 0-3.935 0L8.38 10.666a4.55 4.55 0 0 0 0 6.442l.522.521a4.57 4.57 0 0 0 6.456 0l2.797-2.791a1.524 1.524 0 0 1 2.152 0 1.516 1.516 0 0 1 0 2.147l-2.797 2.791a7.62 7.62 0 0 1-10.76 0l-.522-.52a7.58 7.58 0 0 1 0-10.738z'
        const uploadFileBtnIcon = document.querySelector(`path[d="${uploadFileIconValue}"]`)
        const uploadFileBtn = uploadFileBtnIcon?.parentElement?.parentElement as HTMLButtonElement
        if (!uploadFileBtnIcon || !uploadFileBtn) {
          logger.warn(`【轮询#${tickId}】【附件检查】未定位到上传按钮图标或按钮节点`)
        }
        verboseInfo(
          `【附件检查】uploadBtnFound=${Boolean(uploadFileBtn)}, uploadBtnDisabled=${uploadFileBtn ? uploadFileBtn.disabled : 'n/a'}, uploading=${Boolean(document.querySelector('circle'))}, sendDisabled=${sendBtn?.disabled}`
        )

        // 上传条件：上传按钮可用 + 没有正在上传的进度圆圈 + 发送按钮仍禁用（尚未上传完成）
        if (!uploadFileBtn.disabled && !document.querySelector('circle') && sendBtn.disabled) {
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

        // 图片预览元素出现且发送按钮可用，表示图片已上传成功，可以发送
        const hasPrevImg =
          document.querySelector('div[current-chat-id]')?.querySelector('img')?.alt.trim() ==
          'Предпросмотр изображения'
        if (hasPrevImg && !sendBtn.disabled) {
          logger.info('【发送动作】检测到图片预览且发送按钮可用，执行发送')
          sendBtn.click()
        } else {
          verboseInfo(
            `【轮询#${tickId}】【发送动作】发送条件未满足, hasPrevImg=${hasPrevImg}, sendDisabled=${sendBtn?.disabled}`
          )
        }
      } else {
        verboseInfo(`【轮询#${tickId}】【附件检查】当前消息未进入附件上传阶段`)
      }

      // bot 返回「证据不足」结论时标记本条投诉单失败，下一轮将重新建单
      if (
        (allItems[allItems.length - 1] as HTMLElement).innerText.includes(
          'Мы проверили ваш запрос. К сожалению, предоставленных доказательств недостаточно для подтверждения ваших авторских прав. В настоящее время авторские права не подтверждены, и нет причин скрывать товар. Вы можете приложить новые доказательства, которые позволят подтвердить ваши авторские права на контент.'
        )
      ) {
        logger.info('【投诉结果】检测到平台返回证据不足，写入失败标记并准备下一轮新建投诉')
        sessionStorage.setItem('complaint-failed', 'true')
        sessionStorage.removeItem('current_chat_id')
        const markFailedResp = await chrome.runtime.sendMessage({
          action: 'post',
          url: '/complaint/mark-failed',
          data: { chatId }
        })
        verboseInfo(
          `【轮询#${tickId}】【投诉结果】/complaint/mark-failed 响应: ${JSON.stringify(markFailedResp)}`
        )
      } else {
        verboseInfo(`【轮询#${tickId}】【投诉结果】当前未检测到证据不足结论`)
      }
    } else {
      verboseInfo('【消息区域】消息项数量不足，暂不进入投诉动作判断')
    }
  } catch (error) {
    const err = error instanceof Error ? `${error.name}: ${error.message}` : String(error)
    logger.error(`【轮询#${tickId}】执行异常: ${err}`)
  }

  verboseInfo(
    `【轮询#${tickId}】本轮执行完成, 耗时=${Date.now() - tickStartAt}ms，准备进入下一轮检查`
  )
  nextTask()
}

/**
 * 模拟键盘输入，将 SKU 填写到投诉对话框的 textarea 中。
 *
 * 直接赋值 textarea.value 不会触发 React/Vue 的受控事件，因此需要：
 *  1. 通过原生 HTMLTextAreaElement.prototype 的 value setter 写入值
 *  2. 手动派发 InputEvent（inputType: 'insertText'）和 change 事件
 *
 * @param sku - 需要填入的商品 SKU 字符串
 * @returns 输入是否成功（500ms 后校验 textarea.value 是否与 sku 一致）
 */
async function simulateKeyboardInput(sku: string) {
  const textarea = document.querySelector('textarea')
  verboseInfo(`【输入模块】准备写入 SKU, textareaFound=${Boolean(textarea)}, sku=${sku}`)
  if (textarea) {
    verboseInfo('【输入模块】开始聚焦输入框并注入投诉内容')
    textarea.click()
    textarea.focus()
    textarea.scrollIntoView({ block: 'center' })
    const setter = Object.getOwnPropertyDescriptor(
      window.HTMLTextAreaElement.prototype,
      'value'
    )?.set
    if (setter) {
      verboseInfo('【输入模块】使用原生 value setter 注入文本')
      setter.call(textarea, sku)
    } else {
      logger.warn('【输入模块】未获取到原生 setter，回退为直接赋值 textarea.value')
      textarea.value = sku
    }
    textarea.dispatchEvent(
      new InputEvent('input', {
        bubbles: true,
        cancelable: true,
        data: sku,
        inputType: 'insertText'
      })
    )
    textarea.dispatchEvent(new Event('change', { bubbles: true, composed: true }))
    verboseInfo('【输入模块】已触发 input/change 事件')
  } else {
    logger.warn('【输入模块】未找到 textarea，无法输入 SKU')
  }
  await new Promise((r) => setTimeout(r, 500))
  const success = textarea?.value === sku
  verboseInfo(`【输入模块】输入校验结果: ${success}`)
  return success
}

/**
 * 在当前页面中查找 innerText 完全匹配指定文本的第一个 <span> 元素。
 *
 * 用于定位 Ozon SCRM bot 菜单选项按钮，这些按钮没有稳定的 id/data-* 属性，
 * 只能通过文本内容匹配。
 *
 * @param text - 需要匹配的文本内容（自动 trim 两端空白）
 * @returns 匹配到的 span 元素，未找到时返回 undefined
 */
function getTextSpan(text: string): HTMLSpanElement | undefined {
  const spans = [...document.querySelectorAll('span')]
  const el = spans.find((s) => s.innerText.trim() === text.trim())
  return el
}

/**
 * 通过 Background Service Worker 从本地服务获取一张随机图片，
 * 并将其转换为 FileList 以便注入页面的 file input 元素。
 *
 * Background 会将图片以 Base64 Data URL 形式返回，此函数负责：
 *  1. 发送 get-image 消息到 Background
 *  2. 将 Base64 Data URL fetch 为 Blob
 *  3. 构造随机文件名的 File 对象并包装为 FileList
 *
 * @returns 包含单张图片的 FileList，获取失败时返回 null
 */
async function getImage() {
  const url = '/image/random'
  verboseInfo(`【图片模块】开始请求图片资源: ${url}`)
  const resp = await chrome.runtime.sendMessage({ action: 'get-image', url })
  if (!resp.success || !resp.data) {
    logger.error(`获取图片失败: ${resp.error}`)
    return null
  }

  // Background 返回的是 Base64 Data URL（data:image/...;base64,...），通过 fetch 转为 Blob
  const base64Data = resp.data
  const response = await fetch(base64Data)
  const blob = await response.blob()
  verboseInfo(`【图片模块】图片 Blob 解析完成, type=${blob.type}, size=${blob.size}`)

  const ext = blob.type?.split('/')[1] || 'jpg'
  const fileName = `${Math.random().toString(36).substring(7)}.${ext}`
  const file = new File([blob], fileName, {
    type: blob.type || 'image/jpeg'
  })

  const dt = new DataTransfer()
  dt.items.add(file)
  logger.success(`【图片模块】图片文件构造完成: ${file.name}`)
  return dt.files
}
