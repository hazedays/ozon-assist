/**
 * Ozon Auto Complaint - Complaint Logic
 */

import { logger } from '../core/logger'
import { CONFIG } from '../shared/constants'
import { utils } from '../utils/index'

const { sleep, waitForElement } = utils

export const ComplaintLogic = {
  isProcessing: false,

  isAborted: () => {
    const canNext = sessionStorage.getItem(CONFIG.STORAGE_KEYS.STOPPED_MANUALLY) === 'true'
    if (canNext) {
      if (logger) logger.warn('检测到手动停止标志，已中止自动化流程')
      sessionStorage.removeItem(CONFIG.STORAGE_KEYS.AUTO_SUBMITTED)
      sessionStorage.removeItem(CONFIG.STORAGE_KEYS.CURRENT_SKU)
    }
    return canNext
  },

  getCurrentComplaintSku: () => {
    const sku = sessionStorage.getItem(CONFIG.STORAGE_KEYS.CURRENT_SKU)
    if (logger) logger.info(`读取当前处理中的 SKU: ${sku || '无'}`)
    return sku
  },

  verificationWindow: async () => {
    const windowId = sessionStorage.getItem(CONFIG.STORAGE_KEYS.WINDOW_ID)
    if (!windowId) {
      if (logger) logger.info('sessionStorage 中未找到 window_id，跳过窗口验证')
      return true
    }
    const header = (await waitForElement('div.index_headerContainer_l0AH6')) as HTMLElement
    if (!header) {
      if (logger) logger.error('窗口验证失败: 未找到 Header 容器 (index_headerContainer_l0AH6)')
      return false
    }
    const currentWindowId = header.innerText.split('\n')[1]
    if (logger) logger.info(`当前窗口 ID: ${currentWindowId}, 目标 ID: ${windowId}`)
    if (currentWindowId === windowId) {
      return true
    }
    const el = (await waitForElement(`div[conversationid="${windowId}"]`)) as HTMLElement
    if (!el) {
      if (logger) logger.warn(`窗口验证失败: 未找到目标 conversationId 为 ${windowId} 的元素`)
      return false
    }
    el.click()
    await sleep(CONFIG.DELAYS.SHORT)

    const header2 = (await waitForElement('div.index_headerContainer_l0AH6')) as HTMLElement
    if (!header2) return false
    const verifiedId = header2.innerText.split('\n')[1]
    if (verifiedId === windowId) {
      if (logger) logger.info('窗口验证通过')
      return true
    } else {
      if (logger) logger.error(`窗口锁定失败: 预期 ${windowId}, 实际 ${verifiedId}`)
      return false
    }
  },

  taskFailed: async (msg: string | null = null) => {
    if (logger) logger.warn(`触发任务失败处理逻辑，原因: ${msg || '由于外部异常'}`)
    try {
      await chrome.runtime.sendMessage({ action: 'get', url: `/task/failed?msg=${msg}` })
      if (logger) logger.info('已成功通知后台任务失败状态')
    } catch (e) {
      if (logger) logger.error('向后台发送任务失败消息时发生异常', e)
    }
    await sleep(CONFIG.DELAYS.SHORT)
    const failedCount = parseInt(
      sessionStorage.getItem(CONFIG.STORAGE_KEYS.FAILED_COUNT) || '0',
      10
    )
    const newFailedCount = failedCount + 1
    if (newFailedCount >= CONFIG.MAX_CONSECUTIVE_FAILURES) {
      if (logger)
        logger.error(
          `连续失败次数 (${newFailedCount}) 已达到上限 ${CONFIG.MAX_CONSECUTIVE_FAILURES}，停止自动化`
        )
      sessionStorage.removeItem(CONFIG.STORAGE_KEYS.FAILED_COUNT)
      ComplaintLogic.isProcessing = false
      sessionStorage.setItem(CONFIG.STORAGE_KEYS.STOPPED_MANUALLY, 'true')
      sessionStorage.removeItem(CONFIG.STORAGE_KEYS.AUTO_SUBMITTED)
      return
    }
    if (logger)
      logger.warn(
        `当前连续失败次数: ${newFailedCount}/${CONFIG.MAX_CONSECUTIVE_FAILURES}，准备重新检查 URL`
      )
    sessionStorage.setItem(CONFIG.STORAGE_KEYS.FAILED_COUNT, newFailedCount.toString())
    ComplaintLogic.isProcessing = false
    ComplaintLogic.checkUrl()
  },

  checkUrl: () => {
    sessionStorage.removeItem(CONFIG.STORAGE_KEYS.WINDOW_ID)
    sessionStorage.removeItem(CONFIG.STORAGE_KEYS.STOPPED_MANUALLY)
    sessionStorage.removeItem(CONFIG.STORAGE_KEYS.FAILED_COUNT)
    const url = window.location.href
    if (logger) logger.info(`当前运行环境检测, URL: ${url}`)
    if (!url.includes(CONFIG.URLS.SUPPORT)) {
      if (logger) logger.info(`当前不在支持页面, 正在执行跳转: ${CONFIG.URLS.SUPPORT}`)
      window.location.href = CONFIG.URLS.SUPPORT
    } else if (url.includes(CONFIG.URLS.SCRM) || url.includes(CONFIG.URLS.MESSENGER)) {
      if (logger) logger.success('检测到处于投诉详情页, 准备初始化投诉流程')
      ComplaintLogic.createComplaint()
    } else {
      if (logger) logger.info('检测到处于支持中心主页, 即将创建投诉...')
      ComplaintLogic.createComplaint()
    }
  },

  createComplaint: async () => {
    sessionStorage.removeItem(CONFIG.STORAGE_KEYS.CURRENT_SKU)
    if (ComplaintLogic.isAborted() || ComplaintLogic.isProcessing) {
      if (logger)
        logger.info(
          `流程创建前拦截: aborted=${ComplaintLogic.isAborted()}, processing=${ComplaintLogic.isProcessing}`
        )
      return
    }
    ComplaintLogic.isProcessing = true
    await sleep(CONFIG.DELAYS.SHORT)
    if (logger) logger.info('开始点击页面上的“帮助按钮”及其后续“联系客服按钮”...')
    try {
      const helpBtn = (await waitForElement(CONFIG.SELECTORS.HELP_TEXT)) as HTMLElement
      if (!helpBtn)
        return ComplaintLogic.taskFailed('页面“帮助按钮” (CONFIG.SELECTORS.HELP_TEXT) 未找到')

      if (logger) logger.info('执行：点击帮助按钮')
      helpBtn.click()
      await sleep(CONFIG.DELAYS.SHORT)
      ;(document.querySelector(CONFIG.SELECTORS.CONTACT_SUPPORT) as HTMLElement)?.click()
      await sleep(CONFIG.DELAYS.SHORT)
      ComplaintLogic.startStep()
    } catch (err) {
      if (logger) logger.error('在 createComplaint 函数中捕获到意外异常', err)
      ComplaintLogic.isProcessing = false
    }
  },

  startStep: async () => {
    if (ComplaintLogic.isAborted()) return
    if (logger) logger.info('执行类目导航...')
    try {
      const header = (await waitForElement('div.index_headerContainer_l0AH6')) as HTMLElement
      if (!header) return ComplaintLogic.taskFailed('投诉窗口标题未找到')
      const currentWindowId = header.innerText.split('\n')[1]
      sessionStorage.setItem(CONFIG.STORAGE_KEYS.WINDOW_ID, currentWindowId)
      const list: string[] = []
      while (list.length !== CONFIG.TEXTS.CATEGORYS.length) {
        const canNext = await ComplaintLogic.verificationWindow()
        if (!canNext) return ComplaintLogic.taskFailed('投诉窗口未找到')
        const el = [...document.querySelectorAll('span')].find(
          (s) => CONFIG.TEXTS.CATEGORYS.includes(s.innerText) && !list.includes(s.innerText)
        ) as HTMLElement
        if (el && !list.includes(el.innerText)) {
          list.push(el.innerText)
          el.click()
          if (logger) logger.success(`类目 "${el.innerText}" 点击成功`)
        }
        await sleep(CONFIG.DELAYS.SHORT)
      }
      if (logger) logger.success('类目导航完成')
      ComplaintLogic.getUnprocessed()
    } catch (err) {
      if (logger) logger.error('startStep 异常', err)
      ComplaintLogic.isProcessing = false
    }
  },

  getUnprocessed: async () => {
    if (ComplaintLogic.isAborted()) return
    if (logger) logger.info('准备向后台请求待处理任务 (SKU)...')
    const canNext = await ComplaintLogic.verificationWindow()
    if (!canNext) return ComplaintLogic.taskFailed('获取未处理SKU前, 窗口验证失败')
    ComplaintLogic.isProcessing = true
    try {
      const response = await chrome.runtime.sendMessage({
        action: 'get',
        url: '/complaint/unprocessed'
      })
      if (response?.success) {
        const { sku, id } = response.data
        if (logger) logger.info(`从服务端成功获取任务: SKU [${sku}], 任务 ID [${id}]`)
        sessionStorage.setItem(CONFIG.STORAGE_KEYS.CURRENT_SKU, sku)
        if (logger) logger.success(`SKU 已持久化到会话存储: ${sku}`)
        ComplaintLogic.simulateKeyboardInput(sku)
      } else {
        if (logger) logger.warn('服务端反馈当前无待处理任务，流程挂起')
        ComplaintLogic.isProcessing = false
      }
    } catch (err) {
      if (logger) logger.error('在 getUnprocessed 获取任务请求过程中捕获异常', err)
      ComplaintLogic.isProcessing = false
    }
  },

  simulateKeyboardInput: async (sku: string) => {
    if (ComplaintLogic.isAborted()) return
    const canNext = await ComplaintLogic.verificationWindow()
    if (!canNext) return ComplaintLogic.taskFailed('输入SKU时, 窗口验证失败')
    const textarea = document.querySelector(CONFIG.SELECTORS.TEXTAREA) as HTMLTextAreaElement
    if (!textarea) return ComplaintLogic.taskFailed('SKU输入框未找到')

    if (logger) logger.info(`准备输入 SKU: ${sku}`)
    textarea.click()
    textarea.focus()
    textarea.scrollIntoView({ block: 'center' })

    const setter = Object.getOwnPropertyDescriptor(
      window.HTMLTextAreaElement.prototype,
      'value'
    )?.set
    if (!setter) return ComplaintLogic.taskFailed('无法获取文本框赋值器')

    setter.call(textarea, sku)
    textarea.dispatchEvent(
      new InputEvent('input', {
        bubbles: true,
        cancelable: true,
        data: sku,
        inputType: 'insertText'
      })
    )
    textarea.dispatchEvent(new Event('change', { bubbles: true, composed: true }))
    if (logger) logger.info('触发了 input 和 change 事件')
    if (logger) logger.success('SKU输入完成')
    await sleep(CONFIG.DELAYS.SHORT)

    await sleep(CONFIG.DELAYS.SHORT)
    const currentVal = textarea.value.trim()
    if (currentVal !== sku) {
      if (logger) logger.warn(`SKU二次校验失败: 期望=${sku}, 实际=${currentVal}`)
      setter.call(textarea, sku)
      textarea.dispatchEvent(
        new InputEvent('input', {
          bubbles: true,
          cancelable: true,
          data: sku,
          inputType: 'insertText'
        })
      )
      textarea.dispatchEvent(new Event('change', { bubbles: true, composed: true }))
      await sleep(CONFIG.DELAYS.SHORT)

      if (textarea.value.trim() !== sku) {
        return ComplaintLogic.taskFailed('SKU二次校验失败, 放弃本次任务')
      } else {
        if (logger) logger.success('SKU二次校验成功')
      }
    }

    ComplaintLogic.submitComplaint()
  },

  submitComplaint: async () => {
    if (ComplaintLogic.isAborted()) return
    const canNext = await ComplaintLogic.verificationWindow()
    if (!canNext) return ComplaintLogic.taskFailed('提交SKU时, 窗口验证失败')
    const btns = document.querySelectorAll(CONFIG.SELECTORS.SUBMIT_BUTTONS)
    if (btns.length < 2) return ComplaintLogic.taskFailed('提交按钮未找到')

    if (logger) logger.info('正在点击提交按钮...')
    ;(btns[1] as HTMLElement).click()

    await sleep(CONFIG.DELAYS.SHORT)
    let attempts = 0
    let hasNext = false
    if (logger) logger.info('等待系统请求上传图片文档...')

    while (!hasNext && attempts < CONFIG.RETRIES.UPLOAD_CHECK) {
      if (ComplaintLogic.isAborted()) return
      const body = document.body.innerText
      hasNext =
        body.includes(CONFIG.TEXTS.UPLOAD_REQUEST) && body.includes(CONFIG.TEXTS.UPLOAD_DOCUMENT)
      if (!hasNext) {
        attempts++
        if (attempts % 3 === 0) {
          if (logger) logger.info(`持续等待中 (${attempts}/${CONFIG.RETRIES.UPLOAD_CHECK})...`)
        }
        await sleep(Math.min(500 * attempts, 2000))
      }
    }
    if (!hasNext) {
      if (logger) logger.error('超时：未发现上传图片的文本请求提示')
      return ComplaintLogic.taskFailed('未发现上传图片请求提示')
    }
    if (logger) logger.success('检测到上传请求，开始选择图片')
    ComplaintLogic.getRandomImage()
  },

  getRandomImage: async () => {
    const sku = ComplaintLogic.getCurrentComplaintSku()
    if (!sku) {
      if (logger) logger.error('获取随机图片前检测到 SKU 丢失')
      return
    }
    if (logger) logger.info(`正在为 SKU [${sku}] 获取随机证明图片...`)
    try {
      const resp = await chrome.runtime.sendMessage({ action: 'get', url: '/image/random' })
      if (resp?.success) {
        const { id, url } = resp.data
        if (logger) logger.success(`成功从图库获取图片: ID [${id}], URL [${url}]`)
        await ComplaintLogic.linkImageToSku(sku, id)
        await ComplaintLogic.setRandomNameImageFromUrl(url)
      } else {
        if (logger) logger.error(`图库请求返回失败状态: ${JSON.stringify(resp)}`)
      }
    } catch (e) {
      if (logger) logger.error('在 getRandomImage 函数中捕获请求异常', e)
    }
  },

  linkImageToSku: async (sku: string, imageId: string | number) => {
    if (logger) logger.info(`正在建立关联关系: SKU [${sku}] <-> 图片ID [${imageId}]...`)
    try {
      await chrome.runtime.sendMessage({
        action: 'post',
        url: `/complaint/${sku}/image`,
        data: { imageId }
      })
      if (logger) logger.success('后台已成功记录 SKU 与图片的绑定关系')
    } catch (e) {
      if (logger) logger.error('在 linkImageToSku 关联请求中捕获异常', e)
    }
  },

  setRandomNameImageFromUrl: async (imageUrl: string) => {
    const fileInput = document.querySelector(CONFIG.SELECTORS.FILE_INPUT) as HTMLInputElement
    if (!fileInput) return ComplaintLogic.taskFailed('文件上传输入框未找到')
    const canNext = await ComplaintLogic.verificationWindow()
    if (!canNext) return ComplaintLogic.taskFailed('上传图片时, 窗口验证失败')

    try {
      if (logger) logger.info(`开始处理图片: ${imageUrl}`)
      const response = await chrome.runtime.sendMessage({ action: 'fetchImage', url: imageUrl })
      if (!response?.success) throw new Error(response?.error || 'Background fetch 失败')

      if (logger) logger.info('图片二进制转换中...')
      const res = await fetch(response.data)
      const blob = await res.blob()
      const ext = response.type?.split('/')[1] || 'jpg'
      const fileName = `${Math.random().toString(36).substring(7)}.${ext}`

      const file = new File([blob], fileName, {
        type: response.type || 'image/jpeg'
      })

      const dt = new DataTransfer()
      dt.items.add(file)
      fileInput.files = dt.files
      fileInput.dispatchEvent(new Event('change', { bubbles: true, cancelable: true }))
      if (logger) logger.success(`图片 "${fileName}" 已注入 input`)

      if (logger) logger.info('等待图片上传预览渲染...')
      await sleep(CONFIG.DELAYS.SHORT)

      const imgPreview = document.querySelector(CONFIG.SELECTORS.IMAGE_PREVIEW)
      if (imgPreview) {
        if (logger) logger.success('检测到图片预览，准备提交最终表单')
        ;(document.querySelectorAll(CONFIG.SELECTORS.SUBMIT_BUTTONS)[1] as HTMLElement).click()
        await ComplaintLogic.checkResult()
      } else {
        if (logger) logger.error('图片注入后未能在规定时间内显示预览图')
        ComplaintLogic.taskFailed('图片上传失败，未找到预览元素')
      }
    } catch (e) {
      if (logger) logger.error('setRandomNameImageFromUrl 过程捕获到异常', e)
      ComplaintLogic.taskFailed('图片上传异常')
    }
  },

  checkResult: async () => {
    const sku = ComplaintLogic.getCurrentComplaintSku()
    if (!sku) return ComplaintLogic.taskFailed('未找到SKU')
    const canNext = await ComplaintLogic.verificationWindow()
    if (!canNext) return ComplaintLogic.taskFailed('检查结果时, 窗口验证失败')

    if (logger) logger.info('正在检查投诉提交结果...')
    const nextBtn = (await waitForElement(CONFIG.TEXTS.NEXT_COMPLAINT, true)) as HTMLElement
    const status = nextBtn ? 'success' : 'failed'

    if (nextBtn) {
      if (logger) logger.success(`投诉结果: 成功 (检测到 "${CONFIG.TEXTS.NEXT_COMPLAINT}" 按钮)`)
    } else {
      if (logger) logger.warn(`投诉结果: 疑似失败 (未检测到 "${CONFIG.TEXTS.NEXT_COMPLAINT}" 按钮)`)
    }

    try {
      chrome.runtime.sendMessage({
        action: 'post',
        url: `/complaint/${sku}/status`,
        data: { status }
      })
      if (logger) logger.info(`向服务端同步投诉状态: ${status}`)
    } catch (e) {
      if (logger) logger.error('checkResult 状态同步异常', e)
    }

    localStorage.removeItem(CONFIG.STORAGE_KEYS.CURRENT_SKU)
    ComplaintLogic.isProcessing = false
    if (ComplaintLogic.isAborted()) return
    ComplaintLogic.continueTask(nextBtn)
  },

  continueTask: async (btn: HTMLElement | null) => {
    if (!btn) {
      if (logger) logger.warn('未能在当前页面找到“继续投诉”按钮，准备重新跳转流程')
      ComplaintLogic.checkUrl()
      return
    }
    if (logger) logger.info('点击“继续投诉”按钮开始下一个任务...')
    btn.click()
    await sleep(CONFIG.DELAYS.MEDIUM)
    ComplaintLogic.getUnprocessed()
  }
}
;(window as any).ozonLogic = ComplaintLogic
