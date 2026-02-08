/**
 * Ozon Auto Complaint - Content Script (MV3 完整版)
 */
;(() => {
  const logger = {
    _getTime: () => new Date().toLocaleTimeString(),
    info: (msg) =>
      console.log(`%c[Ozon插件][${new Date().toLocaleTimeString()}] ${msg}`, 'color: #3498db;'),
    warn: (msg) =>
      console.log(`%c[Ozon插件] ⚠️ [${new Date().toLocaleTimeString()}] ${msg}`, 'color: #e67e22;'),
    error: (msg, err = '') =>
      console.log(
        `%c[Ozon插件] ❌ [${new Date().toLocaleTimeString()}] ${msg}`,
        'color: #e74c3c;',
        err
      ),
    success: (msg) =>
      console.log(
        `%c[Ozon插件] ✅ [${new Date().toLocaleTimeString()}] ${msg}`,
        'color: #27ae60; font-weight:bold;'
      )
  }

  const CONFIG = {
    DELAYS: { SHORT: 800, MEDIUM: 1000, LONG: 1500, INITIAL_WAIT: 5000 },
    RETRIES: { ELEMENT_SEARCH: 8, UPLOAD_CHECK: 15 },
    MAX_CONSECUTIVE_FAILURES: 20,
    URLS: {
      SUPPORT: 'https://seller.ozon.ru/app/messenger?group=support_v2&auto=true',
      SCRM: 'https://seller.ozon.ru/app/messenger?channel=SCRM',
      MESSENGER: 'https://seller.ozon.ru/app/messenger/?__rr=1&id='
    },
    SELECTORS: {
      HELP_TEXT: '.index_helpText_Qm6HR',
      CONTACT_SUPPORT: '.index_contactSupportButton_2LpVt',
      TEXTAREA: 'textarea.om_17_a4',
      SUBMIT_BUTTONS: 'button.om_17_a8',
      FILE_INPUT: 'input[type="file"]',
      IMAGE_PREVIEW: '.om_17_p2'
    },
    TEXTS: {
      CATEGORYS: [
        'Нарушение правил площадки другим продавцом',
        'Использование моих фото, видео, текста',
        'Контроль качества',
        'Товары и Цены'
      ],
      UPLOAD_REQUEST: 'пришлите',
      UPLOAD_DOCUMENT: 'документы',
      NEXT_COMPLAINT: 'Пожаловаться на другой товар'
    },
    STORAGE_KEYS: {
      WINDOW_ID: 'window_id',
      AUTO_SUBMITTED: 'complaintAutoSubmitted',
      STOPPED_MANUALLY: 'complaintStoppedManually',
      CURRENT_SKU: 'currentComplaintSku',
      FAILED_COUNT: 'currentFailedNum'
    }
  }

  let isProcessing = false

  function sleep(ms) {
    return new Promise((r) => setTimeout(r, ms))
  }
  function isAborted() {
    const canNext = sessionStorage.getItem(CONFIG.STORAGE_KEYS.STOPPED_MANUALLY) === 'true'
    if (canNext) {
      logger.warn('检测到手动停止标志，已中止自动化流程')
      sessionStorage.removeItem(CONFIG.STORAGE_KEYS.AUTO_SUBMITTED)
      sessionStorage.removeItem(CONFIG.STORAGE_KEYS.CURRENT_SKU)
    } else {
      // 仅在调试时取消注释，避免日志太碎
      // logger.info('检查流程状态：运行中...')
    }
    return canNext
  }
  function getCurrentComplaintSku() {
    const sku = sessionStorage.getItem(CONFIG.STORAGE_KEYS.CURRENT_SKU)
    logger.info(`读取当前处理中的 SKU: ${sku || '无'}`)
    return sku
  }

  async function waitForElement(selector, isText = false) {
    logger.info(`正在等待元素: ${selector} (isText: ${isText})...`)
    for (let attempt = 0; attempt < CONFIG.MAX_CONSECUTIVE_FAILURES; attempt++) {
      if (isText) {
        const el = [...document.querySelectorAll('span')].find(
          (s) => s.innerText.trim() === selector.trim()
        )
        if (el) return el
      } else {
        const el = document.querySelector(selector)
        if (el) return el
      }
      await sleep(Math.min(500 * (attempt + 1), 2000))
    }
    logger.warn(`等待元素超时: ${selector}`)
    return null
  }

  async function verificationWindow() {
    const windowId = sessionStorage.getItem(CONFIG.STORAGE_KEYS.WINDOW_ID)
    if (!windowId) {
      logger.info('sessionStorage 中未找到 window_id，跳过窗口验证')
      return true
    }
    const header = await waitForElement('div.index_headerContainer_l0AH6')
    if (!header) {
      logger.error('窗口验证失败: 未找到 Header 容器 (index_headerContainer_l0AH6)')
      return false
    }
    currentWindowId = header.innerText.split('\n')[1]
    logger.info(`当前窗口 ID: ${currentWindowId}, 目标 ID: ${windowId}`)
    if (currentWindowId === windowId) {
      return true
    }
    const el = await waitForElement(`div[conversationid="${windowId}"]`)
    if (!el) {
      logger.warn(`窗口验证失败: 未找到目标 conversationId 为 ${windowId} 的元素`)
      return false
    }
    el.click()
    await sleep(CONFIG.DELAYS.SHORT)

    const header2 = await waitForElement('div.index_headerContainer_l0AH6')
    if (!header2) return false
    const verifiedId = header2.innerText.split('\n')[1]
    if (verifiedId === windowId) {
      logger.info('窗口验证通过')
      return true
    } else {
      logger.error(`窗口锁定失败: 预期 ${windowId}, 实际 ${verifiedId}`)
      return false
    }
  }

  async function taskFailed(msg = null) {
    logger.warn(`触发任务失败处理逻辑，原因: ${msg || '由于外部异常'}`)
    try {
      await chrome.runtime.sendMessage({ action: 'get', url: `/task/failed?msg=${msg}` })
      logger.info('已成功通知后台任务失败状态')
    } catch (e) {
      logger.error('向后台发送任务失败消息时发生异常', e)
    }
    await sleep(CONFIG.DELAYS.SHORT)
    const failedCount = parseInt(
      sessionStorage.getItem(CONFIG.STORAGE_KEYS.FAILED_COUNT) || '0',
      10
    )
    const newFailedCount = failedCount + 1
    if (newFailedCount >= CONFIG.MAX_CONSECUTIVE_FAILURES) {
      logger.error(
        `连续失败次数 (${newFailedCount}) 已达到上限 ${CONFIG.MAX_CONSECUTIVE_FAILURES}，停止自动化`
      )
      sessionStorage.removeItem(CONFIG.STORAGE_KEYS.FAILED_COUNT)
      isProcessing = false
      sessionStorage.setItem(CONFIG.STORAGE_KEYS.STOPPED_MANUALLY, 'true')
      sessionStorage.removeItem(CONFIG.STORAGE_KEYS.AUTO_SUBMITTED)
      return
    }
    logger.warn(
      `当前连续失败次数: ${newFailedCount}/${CONFIG.MAX_CONSECUTIVE_FAILURES}，准备重新检查 URL`
    )
    sessionStorage.setItem(CONFIG.STORAGE_KEYS.FAILED_COUNT, newFailedCount.toString())
    isProcessing = false
    checkUrl()
  }

  function checkUrl() {
    sessionStorage.removeItem(CONFIG.STORAGE_KEYS.WINDOW_ID)
    sessionStorage.removeItem(CONFIG.STORAGE_KEYS.STOPPED_MANUALLY)
    sessionStorage.removeItem(CONFIG.STORAGE_KEYS.FAILED_COUNT)
    const url = window.location.href
    logger.info(`当前运行环境检测, URL: ${url}`)
    if (!url.includes(CONFIG.URLS.SUPPORT)) {
      logger.info(`当前不在支持页面, 正在执行跳转: ${CONFIG.URLS.SUPPORT}`)
      window.location.href = CONFIG.URLS.SUPPORT
    } else if (url.includes(CONFIG.URLS.SCRM) || url.includes(CONFIG.URLS.MESSENGER)) {
      logger.success('检测到处于投诉详情页, 准备初始化投诉流程')
      createComplaint()
    } else {
      logger.info('检测到处于支持中心主页, 即将创建投诉...')
      createComplaint()
    }
  }

  async function createComplaint() {
    sessionStorage.removeItem(CONFIG.STORAGE_KEYS.CURRENT_SKU)
    if (isAborted() || isProcessing) {
      logger.info(`流程创建前拦截: aborted=${isAborted()}, processing=${isProcessing}`)
      return
    }
    isProcessing = true
    await sleep(CONFIG.DELAYS.SHORT)
    logger.info('开始点击页面上的“帮助按钮”及其后续“联系客服按钮”...')
    try {
      const helpBtn = await waitForElement(CONFIG.SELECTORS.HELP_TEXT)
      if (!helpBtn) return taskFailed('页面“帮助按钮” (CONFIG.SELECTORS.HELP_TEXT) 未找到')

      logger.info('执行：点击帮助按钮')
      helpBtn.click()
      await sleep(CONFIG.DELAYS.SHORT)
      document.querySelector(CONFIG.SELECTORS.CONTACT_SUPPORT)?.click()
      await sleep(CONFIG.DELAYS.SHORT)
      startStep()
    } catch (err) {
      logger.error('在 createComplaint 函数中捕获到意外异常', err)
      isProcessing = false
    }
  }

  async function startStep() {
    if (isAborted()) return
    logger.info('执行类目导航...')
    try {
      // 获取投诉id并存储到 sessionStorage
      const header = await waitForElement('div.index_headerContainer_l0AH6')
      if (!header) return taskFailed('投诉窗口标题未找到')
      currentWindowId = header.innerText.split('\n')[1]
      sessionStorage.setItem(CONFIG.STORAGE_KEYS.WINDOW_ID, currentWindowId)
      // 模拟点击类目选择器
      const list = []
      while (list.length !== CONFIG.TEXTS.CATEGORYS.length) {
        const el = [...document.querySelectorAll('span')].find(
          (s) => CONFIG.TEXTS.CATEGORYS.includes(s.innerText) && !list.includes(s.innerText)
        )
        if (el && !list.includes(el.innerText)) {
          list.push(el.innerText)
          el.click()
          logger.success(`类目 "${el.innerText}" 点击成功`)
        }
        await sleep(CONFIG.DELAYS.SHORT)
      }
      logger.success('类目导航完成')
      getUnprocessed()
    } catch (err) {
      logger.error('startStep 异常', err)
      isProcessing = false
    }
  }

  async function getUnprocessed() {
    if (isAborted()) return
    logger.info('准备向后台请求待处理任务 (SKU)...')
    const canNext = await verificationWindow()
    if (!canNext) return taskFailed('获取未处理SKU前, 窗口验证失败')
    isProcessing = true
    try {
      const response = await chrome.runtime.sendMessage({
        action: 'get',
        url: '/complaint/unprocessed'
      })
      if (response?.success) {
        const { sku, id } = response.data
        logger.info(`从服务端成功获取任务: SKU [${sku}], 任务 ID [${id}]`)
        sessionStorage.setItem(CONFIG.STORAGE_KEYS.CURRENT_SKU, sku)
        logger.success(`SKU 已持久化到会话存储: ${sku}`)
        simulateKeyboardInput(sku)
      } else {
        logger.warn('服务端反馈当前无待处理任务，流程挂起')
        isProcessing = false
      }
    } catch (err) {
      logger.error('在 getUnprocessed 获取任务请求过程中捕获异常', err)
      isProcessing = false
    }
  }

  async function simulateKeyboardInput(sku) {
    if (isAborted()) return
    const canNext = await verificationWindow()
    if (!canNext) return taskFailed('输入SKU时, 窗口验证失败')
    const textarea = document.querySelector(CONFIG.SELECTORS.TEXTAREA)
    if (!textarea) return taskFailed('SKU输入框未找到')

    logger.info(`准备输入 SKU: ${sku}`)
    textarea.click()
    textarea.focus()
    textarea.scrollIntoView({ block: 'center' })

    const setter = Object.getOwnPropertyDescriptor(
      window.HTMLTextAreaElement.prototype,
      'value'
    ).set
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
    logger.info('触发了 input 和 change 事件')
    logger.success('SKU输入完成')
    await sleep(CONFIG.DELAYS.SHORT)

    // ===== 二次校验 =====
    await sleep(CONFIG.DELAYS.SHORT)
    const currentVal = textarea.value.trim()
    if (currentVal !== sku) {
      logger.warn(`SKU二次校验失败: 期望=${sku}, 实际=${currentVal}`)
      // 尝试重新输入一次
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
        return taskFailed('SKU二次校验失败, 放弃本次任务')
      } else {
        logger.success('SKU二次校验成功')
      }
    }

    submitComplaint()
  }

  async function submitComplaint() {
    if (isAborted()) return
    const canNext = await verificationWindow()
    if (!canNext) return taskFailed('提交SKU时, 窗口验证失败')
    const btns = document.querySelectorAll(CONFIG.SELECTORS.SUBMIT_BUTTONS)
    if (btns.length < 2) return taskFailed('提交按钮未找到')

    logger.info('正在点击提交按钮...')
    btns[1].click()

    await sleep(CONFIG.DELAYS.SHORT)
    let attempts = 0
    let hasNext = false
    logger.info('等待系统请求上传图片文档...')

    while (!hasNext && attempts < CONFIG.RETRIES.UPLOAD_CHECK) {
      if (isAborted()) return
      const body = document.body.innerText
      hasNext =
        body.includes(CONFIG.TEXTS.UPLOAD_REQUEST) && body.includes(CONFIG.TEXTS.UPLOAD_DOCUMENT)
      if (!hasNext) {
        attempts++
        if (attempts % 3 === 0) {
          logger.info(`持续等待中 (${attempts}/${CONFIG.RETRIES.UPLOAD_CHECK})...`)
        }
        await sleep(Math.min(500 * attempts, 2000))
      }
    }
    if (!hasNext) {
      logger.error('超时：未发现上传图片的文本请求提示')
      return taskFailed('未发现上传图片请求提示')
    }
    logger.success('检测到上传请求，开始选择图片')
    getRandomImage()
  }

  async function getRandomImage() {
    const sku = getCurrentComplaintSku()
    if (!sku) {
      logger.error('获取随机图片前检测到 SKU 丢失')
      return
    }
    logger.info(`正在为 SKU [${sku}] 获取随机证明图片...`)
    try {
      const resp = await chrome.runtime.sendMessage({ action: 'get', url: '/image/random' })
      if (resp?.success) {
        const { id, url } = resp.data
        logger.success(`成功从图库获取图片: ID [${id}], URL [${url}]`)
        await linkImageToSku(sku, id)
        await setRandomNameImageFromUrl(url)
      } else {
        logger.error(`图库请求返回失败状态: ${JSON.stringify(resp)}`)
      }
    } catch (e) {
      logger.error('在 getRandomImage 函数中捕获请求异常', e)
    }
  }

  async function linkImageToSku(sku, imageId) {
    logger.info(`正在建立关联关系: SKU [${sku}] <-> 图片ID [${imageId}]...`)
    try {
      await chrome.runtime.sendMessage({
        action: 'post',
        url: `/complaint/${sku}/image`,
        data: { imageId }
      })
      logger.success('后台已成功记录 SKU 与图片的绑定关系')
    } catch (e) {
      logger.error('在 linkImageToSku 关联请求中捕获异常', e)
    }
  }

  async function setRandomNameImageFromUrl(imageUrl) {
    const fileInput = document.querySelector(CONFIG.SELECTORS.FILE_INPUT)
    if (!fileInput) return taskFailed('文件上传输入框未找到')
    const canNext = await verificationWindow()
    if (!canNext) return taskFailed('上传图片时, 窗口验证失败')

    try {
      logger.info(`开始处理图片: ${imageUrl}`)
      const response = await chrome.runtime.sendMessage({ action: 'fetchImage', url: imageUrl })
      if (!response?.success) throw new Error(response?.error || 'Background fetch 失败')

      logger.info('图片二进制转换中...')
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
      logger.success(`图片 "${fileName}" 已注入 input`)

      logger.info('等待图片上传预览渲染...')
      await sleep(CONFIG.DELAYS.SHORT)

      const imgPreview = document.querySelector(CONFIG.SELECTORS.IMAGE_PREVIEW)
      if (imgPreview) {
        logger.success('检测到图片预览，准备提交最终表单')
        document.querySelectorAll(CONFIG.SELECTORS.SUBMIT_BUTTONS)[1].click()
        await checkResult()
      } else {
        logger.error('图片注入后未能在规定时间内显示预览图')
        taskFailed('图片上传失败，未找到预览元素')
      }
    } catch (e) {
      logger.error('setRandomNameImageFromUrl 过程捕获到异常', e)
      taskFailed('图片上传异常')
    }
  }

  async function checkResult() {
    const sku = getCurrentComplaintSku()
    if (!sku) return taskFailed('未找到SKU')
    const canNext = await verificationWindow()
    if (!canNext) return taskFailed('检查结果时, 窗口验证失败')

    logger.info('正在检查投诉提交结果...')
    const nextBtn = await waitForElement(CONFIG.TEXTS.NEXT_COMPLAINT, true)
    const status = nextBtn ? 'success' : 'failed'

    if (nextBtn) {
      logger.success(`投诉结果: 成功 (检测到 "${CONFIG.TEXTS.NEXT_COMPLAINT}" 按钮)`)
    } else {
      logger.warn(`投诉结果: 疑似失败 (未检测到 "${CONFIG.TEXTS.NEXT_COMPLAINT}" 按钮)`)
    }

    try {
      chrome.runtime.sendMessage({
        action: 'post',
        url: `/complaint/${sku}/status`,
        data: { status }
      })
      logger.info(`向服务端同步投诉状态: ${status}`)
    } catch (e) {
      logger.error('checkResult 状态同步异常', e)
    }

    localStorage.removeItem(CONFIG.STORAGE_KEYS.CURRENT_SKU)
    isProcessing = false
    if (isAborted()) return
    continueTask(nextBtn)
  }

  async function continueTask(btn) {
    if (!btn) {
      logger.warn('未能在当前页面找到“继续投诉”按钮，准备重新跳转流程')
      checkUrl()
      return
    }
    logger.info('点击“继续投诉”按钮开始下一个任务...')
    btn.click()
    await sleep(CONFIG.DELAYS.MEDIUM)
    getUnprocessed()
  }

  logger.info('=== Ozon 自动化 Content Script 已加载 ===')

  window.addEventListener('load', () => {
    const url = window.location.href
    logger.info(`【页面事件】load 已触发, 当前 URL: ${url}`)
    if (sessionStorage.getItem(CONFIG.STORAGE_KEYS.AUTO_SUBMITTED) === 'true') {
      logger.info('检测到 AUTO_SUBMITTED 标志为开启状态, 正在评估是否继续任务...')
      if (!isAborted() && url.includes(CONFIG.URLS.SUPPORT)) {
        logger.info('符合自动执行条件, 重新初始化 createComplaint')
        createComplaint()
      } else if (!isAborted() && url.includes(CONFIG.URLS.SCRM)) {
        startStep()
      } else {
        logger.info(
          `自动任务拦截点: isAborted=${isAborted()}, urlIncludesSupport=${url.includes(CONFIG.URLS.SUPPORT)}`
        )
      }
    }
  })

  // ====== 接收 Background 消息 ======
  chrome.runtime.onMessage.addListener((request) => {
    if (!request?.action) return
    logger.info(`【消息通讯】收到后台消息: ${JSON.stringify(request)}`)
    if (request.action === 'submitComplaint') {
      if (isProcessing) {
        return logger.warn('指令拦截：已有一个处理中的任务，跳过本次启动指令')
      }
      logger.info('收到启动指令 [submitComplaint]，重置会话状态并开始流程')
      sessionStorage.removeItem(CONFIG.STORAGE_KEYS.CURRENT_SKU)
      sessionStorage.setItem(CONFIG.STORAGE_KEYS.AUTO_SUBMITTED, 'true')
      sessionStorage.removeItem(CONFIG.STORAGE_KEYS.STOPPED_MANUALLY)
      checkUrl()
    } else if (request.action === 'stopComplaint') {
      logger.info('收到停止指令 [stopComplaint]，正在执行状态清理...')
      sessionStorage.setItem(CONFIG.STORAGE_KEYS.STOPPED_MANUALLY, 'true')
      sessionStorage.removeItem(CONFIG.STORAGE_KEYS.AUTO_SUBMITTED)
      sessionStorage.removeItem(CONFIG.STORAGE_KEYS.CURRENT_SKU)
      isProcessing = false
      logger.success('自动化流程已停止')
    }
  })
})()
