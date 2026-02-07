// ============= 配置常量 =============
const CONFIG = {
  // 时间配置（毫秒）
  DELAYS: {
    SHORT: 1000,
    MEDIUM: 2000,
    LONG: 3000,
    INITIAL_WAIT: 5000
  },
  // 重试配置
  RETRIES: {
    ELEMENT_SEARCH: 8,
    UPLOAD_CHECK: 15
  },
  // 失败阈值
  MAX_CONSECUTIVE_FAILURES: 50,
  // URL 配置
  URLS: {
    SUPPORT: 'https://seller.ozon.ru/app/messenger?group=support_v2&auto=true',
    MESSENGER: 'https://seller.ozon.ru/app/messenger?channel=SCRM',
    MESSENGER_PATTERN:
      /^https:\/\/seller\.ozon\.ru\/app\/messenger\/\?id=[0-9a-f-]{36}&group=support_v2$/i
  },
  // 选择器配置
  SELECTORS: {
    HELP_TEXT: '.index_helpText_Qm6HR',
    CONTACT_SUPPORT: '.index_contactSupportButton_2LpVt',
    TEXTAREA: 'textarea.om_17_a4',
    SUBMIT_BUTTONS: 'button.om_17_a8',
    FILE_INPUT: 'input[type="file"]',
    IMAGE_PREVIEW: '.om_17_p2'
  },
  // 俄语文本常量
  TEXTS: {
    CATEGORY_1: 'Товары и Цены',
    CATEGORY_2: 'Контроль качества',
    CATEGORY_3: 'Нарушение правил площадки другим продавцом',
    CATEGORY_4: 'Использование моих фото, видео, текста',
    UPLOAD_REQUEST: 'пришлите',
    UPLOAD_DOCUMENT: 'документы',
    NEXT_COMPLAINT: 'Пожаловаться на другой товар'
  },
  // 存储键名
  STORAGE_KEYS: {
    AUTO_SUBMITTED: 'complaintAutoSubmitted',
    CURRENT_SKU: 'currentComplaintSku',
    FAILED_COUNT: 'currentFailedNum'
  }
}

// 工具函数：延迟
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

// 显示失败上限弹窗
function showFailureLimitModal() {
  // 检查是否已存在弹窗，避免重复创建
  if (document.getElementById('ozon-failure-modal')) {
    return
  }

  const modal = document.createElement('div')
  modal.id = 'ozon-failure-modal'
  modal.innerHTML = `
    <div style="
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.7);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 999999;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    ">
      <div style="
        background: white;
        border-radius: 16px;
        padding: 32px;
        max-width: 480px;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
        text-align: center;
      ">
        <div style="
          width: 64px;
          height: 64px;
          background: linear-gradient(135deg, #e74c3c 0%, #c0392b 100%);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 24px;
          font-size: 32px;
        ">⚠️</div>
        <h2 style="
          margin: 0 0 16px;
          font-size: 24px;
          font-weight: 600;
          color: #2c3e50;
        ">自动化流程已停止</h2>
        <p style="
          margin: 0 0 24px;
          font-size: 16px;
          color: #7f8c8d;
          line-height: 1.6;
        ">
          连续 <strong style="color: #e74c3c;">${CONFIG.MAX_CONSECUTIVE_FAILURES}</strong> 次任务失败<br>
          可能原因：账号权限受限、网络异常或页面结构变更<br>
          <span style="font-size: 14px; color: #95a5a6;">建议检查账号状态后重新启动</span>
        </p>
        <button id="ozon-modal-close" style="
          background: linear-gradient(135deg, #3498db 0%, #2980b9 100%);
          color: white;
          border: none;
          padding: 12px 32px;
          border-radius: 8px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          transition: transform 0.2s, box-shadow 0.2s;
          box-shadow: 0 4px 12px rgba(52, 152, 219, 0.3);
        "
        onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 6px 16px rgba(52, 152, 219, 0.4)'"
        onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 4px 12px rgba(52, 152, 219, 0.3)'"
        >我知道了</button>
      </div>
    </div>
  `

  document.body.appendChild(modal)

  // 绑定关闭事件
  document.getElementById('ozon-modal-close').addEventListener('click', () => {
    modal.remove()
  })

  // 点击背景关闭
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.remove()
    }
  })

  logger.info('已显示失败上限提示弹窗', '#e74c3c')
}

// 自定义日志工具
const logger = {
  info: (msg, color = '#3498db') => console.log(`%c[Ozon插件] ${msg}`, `color: ${color};`),
  warn: (msg) => console.log(`%c[Ozon插件] ⚠️ ${msg}`, 'color: #e67e22;'),
  error: (msg, err = '') => console.log(`%c[Ozon插件] ❌ ${msg}`, 'color: #e74c3c;', err),
  success: (msg) => console.log(`%c[Ozon插件] ✅ ${msg}`, 'color: #27ae60; font-weight: bold;'),
  debug: (msg) => console.log(`[Ozon插件] ${msg}`)
}

// 防止重复注入及初始化监听
if (window.ozonComplaintLoaded) {
  logger.info('脚本已激活，跳过重新初始化', '#95a5a6')
} else {
  window.ozonComplaintLoaded = true
  logger.info('=== Ozon 自动化核心已加载 ===', '#9b59b6')

  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'submitComplaint') {
      logger.info('收到外部提交指令')
      sessionStorage.removeItem(CONFIG.STORAGE_KEYS.AUTO_SUBMITTED)
      checkUrl()
      sendResponse({ status: 'received' })
    }
    return true
  })
}

// 页面状态检查
const url = window.location.href
const autoSubmitted = sessionStorage.getItem(CONFIG.STORAGE_KEYS.AUTO_SUBMITTED)

logger.debug(`当前URL: ${url} | 准备就绪: ${document.readyState} | 自动标志: ${autoSubmitted}`)

// 等待页面完全加载后执行
function executeWhenReady(callback) {
  if (document.readyState === 'complete') {
    callback()
  } else {
    window.addEventListener('load', callback)
  }
}

if (url.endsWith('&auto=true')) {
  logger.info('检测到自动化引导参数')
  executeWhenReady(createComplaint)
} else if (autoSubmitted === 'true' && url === CONFIG.URLS.MESSENGER) {
  logger.info('检测到延续性自动标志')
  sleep(CONFIG.DELAYS.INITIAL_WAIT).then(() => {
    executeWhenReady(startStep)
  })
}

// 检查并跳转
function checkUrl() {
  if (!window.location.href.endsWith(CONFIG.URLS.SUPPORT)) {
    logger.info('目标页面不符，正在重定向到支持页面...')
    window.location.href = CONFIG.URLS.SUPPORT
  } else {
    createComplaint()
  }
}

// 通用查找函数 - 优化延迟策略（指数退避）
async function waitForElement(
  selector,
  maxAttempts = CONFIG.RETRIES.ELEMENT_SEARCH,
  isText = false
) {
  for (let i = 0; i < maxAttempts; i++) {
    logger.debug(`正在寻找元素: ${selector} (尝试: ${i + 1}/${maxAttempts})`)
    const el = isText ? findElementByText(selector) : document.querySelector(selector)
    if (el) {
      logger.debug(`成功定位到元素: ${selector}`)
      return el
    }
    // 使用指数退避策略：500ms, 1000ms, 1500ms, 2000ms...
    await sleep(Math.min(500 * (i + 1), 2000))
  }
  logger.warn(`未能在限时内找到元素: ${selector}`)
  return null
}

// 任务失败回调
async function taskFailed() {
  try {
    await chrome.runtime.sendMessage({
      action: 'get',
      url: '/task/failed'
    })
  } catch (error) {
    logger.error('任务失败回调异常:', error)
  }

  await sleep(CONFIG.DELAYS.MEDIUM)

  // 检查连续失败次数
  const failedCount = parseInt(localStorage.getItem(CONFIG.STORAGE_KEYS.FAILED_COUNT) || '0', 10)

  if (failedCount >= CONFIG.MAX_CONSECUTIVE_FAILURES) {
    logger.error(`连续${CONFIG.MAX_CONSECUTIVE_FAILURES}次失败，停止自动化流程`)
    localStorage.removeItem(CONFIG.STORAGE_KEYS.FAILED_COUNT)
    showFailureLimitModal()
    return
  }

  logger.warn(`任务失败 (${failedCount + 1}/${CONFIG.MAX_CONSECUTIVE_FAILURES})，准备重试...`)
  localStorage.setItem(CONFIG.STORAGE_KEYS.FAILED_COUNT, (failedCount + 1).toString())
  checkUrl()
}

// 创建投诉
async function createComplaint() {
  logger.info('--- 启动投诉创建流程 ---', '#9b59b6')
  await sleep(CONFIG.DELAYS.SHORT)

  const btn = await waitForElement(CONFIG.SELECTORS.HELP_TEXT)
  if (!btn) {
    await taskFailed()
    return
  }

  btn.click()
  await sleep(CONFIG.DELAYS.SHORT)

  const fbBtn = await waitForElement(CONFIG.SELECTORS.CONTACT_SUPPORT)
  if (!fbBtn) {
    await taskFailed()
    return
  }

  fbBtn.click()
  sessionStorage.setItem(CONFIG.STORAGE_KEYS.AUTO_SUBMITTED, 'true')
  logger.success('已进入邮件反馈模式，设置延续标志')

  await sleep(CONFIG.DELAYS.SHORT)
  startStep()
}

// 处理步骤
async function startStep() {
  logger.info('--- 正在执行类目导航 ---', '#9b59b6')

  const steps = [
    CONFIG.TEXTS.CATEGORY_1,
    CONFIG.TEXTS.CATEGORY_2,
    CONFIG.TEXTS.CATEGORY_3,
    CONFIG.TEXTS.CATEGORY_4
  ]

  for (let i = 0; i < steps.length; i++) {
    logger.info(`导航进度: ${i + 1}/${steps.length} (${steps[i]})`)
    const span = await waitForElement(steps[i], CONFIG.RETRIES.ELEMENT_SEARCH, true)
    if (!span) {
      await taskFailed()
      return
    }

    span.click()
    await sleep(CONFIG.DELAYS.SHORT)
  }

  logger.success('导航路径选择完毕')
  getUnprocessed()
}

// 获取当前投诉SKU
function getCurrentComplaintSku() {
  return localStorage.getItem(CONFIG.STORAGE_KEYS.CURRENT_SKU)
}

// 获取未处理投诉
async function getUnprocessed() {
  logger.info('>>> 开始获取待处理投诉...')
  try {
    const response = await chrome.runtime.sendMessage({
      action: 'get',
      url: '/complaint/unprocessed'
    })

    if (response?.success) {
      const { sku, id } = response.data
      logger.success(`成功获取任务: SKU=${sku}, ID=${id}`)
      // 成功获取任务，重置失败计数
      localStorage.removeItem(CONFIG.STORAGE_KEYS.FAILED_COUNT)
      localStorage.setItem(CONFIG.STORAGE_KEYS.CURRENT_SKU, sku)
      simulateKeyboardInput(sku)
    } else {
      logger.info(`暂无待处理投诉: ${response?.message || '未知原因'}`, '#95a5a6')
    }
  } catch (error) {
    logger.error('获取投诉异常:', error)
  }
}

async function getRandomImage() {
  const sku = getCurrentComplaintSku()
  if (!sku) {
    logger.error('无法获取当前 SKU')
    return
  }

  logger.info(`>>> 正在为 SKU: ${sku} 获取随机凭证图片...`)
  try {
    const response = await chrome.runtime.sendMessage({
      action: 'get',
      url: '/image/random'
    })

    if (response?.success) {
      const image = response.data
      logger.success(`成功随机到图片: ID=${image.id}, URL=${image.url}`)

      logger.info(`正在同步数据库关联 (SKU: ${sku} -> ImageID: ${image.id})...`)
      const linkResp = await chrome.runtime.sendMessage({
        action: 'post',
        url: `/complaint/${sku}/image`,
        data: { imageId: image.id }
      })
      logger.debug('关联响应: ' + JSON.stringify(linkResp))

      logger.info('开始下载并设置上传图片...')
      setRandomNameImageFromUrl(image.url)
    } else {
      logger.error(`获取随机图片失败: ${response?.message || '未知错误'}`)
    }
  } catch (error) {
    logger.error('获取图片流程异常:', error)
  }
}

// 验证URL格式
function validateOzonMessengerUrl(url) {
  return CONFIG.URLS.MESSENGER_PATTERN.test(url)
}

function findElementByText(text) {
  const allSpans = document.querySelectorAll('span')

  for (const span of allSpans) {
    if (span.innerText.trim() === text.trim()) {
      logger.debug(`找到目标文本元素: ${text}`)
      return span
    }
  }

  logger.debug(`未找到包含文本 "${text}" 的span元素`)
  return null
}

// 模拟键盘输入
async function simulateKeyboardInput(sku) {
  const textarea = document.querySelector(CONFIG.SELECTORS.TEXTAREA)
  if (!textarea) {
    logger.error(`未找到输入框 (${CONFIG.SELECTORS.TEXTAREA})`)
    await taskFailed()
    return
  }

  logger.info(`准备输入 SKU: ${sku}`)

  // 1. 强制激活文本框（模拟真人点击+聚焦）
  textarea.click()
  textarea.focus()
  textarea.scrollIntoView({ block: 'center' })

  // 2. 绕开拦截：直接修改DOM的value属性
  const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
    window.HTMLTextAreaElement.prototype,
    'value'
  ).set
  nativeInputValueSetter.call(textarea, sku)

  // 3. 触发事件穿透框架监听
  const inputEvent = new InputEvent('input', {
    bubbles: true,
    cancelable: true,
    composed: true,
    data: sku,
    inputType: 'insertText'
  })
  textarea.dispatchEvent(inputEvent)
  textarea.dispatchEvent(new Event('change', { bubbles: true, composed: true }))

  logger.success('输入完成，准备提交...')
  await sleep(CONFIG.DELAYS.SHORT)
  submitComplaint()
}

async function submitComplaint() {
  const elements = document.querySelectorAll(CONFIG.SELECTORS.SUBMIT_BUTTONS)
  if (elements.length < 2) {
    logger.error('未找到足够的提交按钮')
    await taskFailed()
    return
  }

  logger.info('正在点击提交按钮...')
  elements[1].click()
  await sleep(CONFIG.DELAYS.MEDIUM)

  let hasNext = false
  let attempts = 0
  logger.info('正在等待上传文件的要求出现...')

  while (!hasNext && attempts < CONFIG.RETRIES.UPLOAD_CHECK) {
    // 模糊匹配：包含 "пришлите" (发送) 和 "документы" (文件)
    const bodyText = document.body.innerText
    hasNext =
      bodyText.includes(CONFIG.TEXTS.UPLOAD_REQUEST) &&
      bodyText.includes(CONFIG.TEXTS.UPLOAD_DOCUMENT)

    if (!hasNext) {
      attempts++
      await sleep(CONFIG.DELAYS.SHORT)
    }
  }

  if (!hasNext) {
    logger.error('超时未检测到上传文件的要求，可能 SKU 无效或已投诉')
    await taskFailed()
    return
  }

  logger.success('检测到上传要求，开始随机选择凭证图片...')
  getRandomImage()
}

/**
 * 从图片URL下载文件，设置随机文件名+自动识别类型，写入input[type="file"]
 * @param {string} imageUrl - 图片的远程URL
 */
async function setRandomNameImageFromUrl(imageUrl) {
  const fileInput = document.querySelector(CONFIG.SELECTORS.FILE_INPUT)
  if (!fileInput) {
    logger.error(`未找到 ${CONFIG.SELECTORS.FILE_INPUT}`)
    return
  }

  try {
    logger.info('正在拉取图片数据 (通过后台代理)...')
    const response = await chrome.runtime.sendMessage({
      action: 'fetchImage',
      url: imageUrl
    })

    if (!response?.success) {
      throw new Error(response?.error || '后台代理抓取失败')
    }

    const dataUrl = response.data
    const res = await fetch(dataUrl)
    const blob = await res.blob()

    const imageType = response.type || 'image/jpeg'
    const ext = imageType.split('/')[1] || 'jpg'
    const randomFileName = `${Math.random().toString(36).substring(7)}.${ext}`
    const imageFile = new File([blob], randomFileName, { type: imageType })

    const dataTransfer = new DataTransfer()
    dataTransfer.items.add(imageFile)
    fileInput.files = dataTransfer.files
    fileInput.dispatchEvent(new Event('change', { bubbles: true, cancelable: true }))

    logger.success(`图片已注入: ${randomFileName} (${(blob.size / 1024).toFixed(1)} KB)`)

    await sleep(CONFIG.DELAYS.LONG)

    // 检查图片是否已正常显示
    const imgPreview = document.querySelector(CONFIG.SELECTORS.IMAGE_PREVIEW)
    if (imgPreview) {
      const btns = document.querySelectorAll(CONFIG.SELECTORS.SUBMIT_BUTTONS)
      if (btns.length >= 2) {
        logger.info('检测到预览图，执行最终发送...')
        btns[1].click()
        await checkResult()
      } else {
        logger.warn('提交按钮状态异常')
        await taskFailed()
      }
    } else {
      logger.error('图片预览未出现，可能上传失败')
      await taskFailed()
    }
  } catch (error) {
    logger.error('图片流程中断:', error)
    await taskFailed()
  }
}

/**
 * 获取当前投诉的 SKU 并轮询结果状态，检测是否被驳回
 */
async function checkResult() {
  const sku = getCurrentComplaintSku()
  if (!sku) {
    logger.info('未找到当前处理中的 SKU，忽略结果轮询', '#95a5a6')
    return
  }

  const nextBtn = await waitForElement(
    CONFIG.TEXTS.NEXT_COMPLAINT,
    CONFIG.RETRIES.ELEMENT_SEARCH,
    true
  )

  try {
    const updateResp = await chrome.runtime.sendMessage({
      action: 'post',
      url: `/complaint/${sku}/status`,
      data: { status: nextBtn ? 'success' : 'failed' }
    })
    logger.debug('状态更新响应: ' + JSON.stringify(updateResp))
  } catch (error) {
    logger.error('状态更新失败:', error)
  }

  localStorage.removeItem(CONFIG.STORAGE_KEYS.CURRENT_SKU)

  if (!nextBtn) {
    logger.warn('无法继续投诉, 当前窗口已失效')

    // 使用数字类型而非字符串比较
    const failedCount = parseInt(localStorage.getItem(CONFIG.STORAGE_KEYS.FAILED_COUNT) || '0', 10)

    if (failedCount >= CONFIG.MAX_CONSECUTIVE_FAILURES) {
      logger.error(`连续${CONFIG.MAX_CONSECUTIVE_FAILURES}次失败，可能账号权限受限，停止自动化流程`)
      localStorage.removeItem(CONFIG.STORAGE_KEYS.FAILED_COUNT)
      showFailureLimitModal()
      return
    }

    localStorage.setItem(CONFIG.STORAGE_KEYS.FAILED_COUNT, (failedCount + 1).toString())
    checkUrl()
    return
  }

  // 成功则重置失败计数
  localStorage.removeItem(CONFIG.STORAGE_KEYS.FAILED_COUNT)
  nextBtn.click()
  await sleep(CONFIG.DELAYS.MEDIUM)

  // 点击继续投诉，触发下一轮流程
  getUnprocessed()
}

// 初始化逻辑
logger.info('Ozon 自动化插件已成功加载', '#2980b9')

const currentUrl = window.location.href
if (validateOzonMessengerUrl(currentUrl)) {
  logger.info('检测到目标聊天页面，寻找类目入口...')
  const target = findElementByText(CONFIG.TEXTS.CATEGORY_1)
  if (target) {
    target.click()
    logger.info(`已触发"${CONFIG.TEXTS.CATEGORY_1}"，将在 2s 后扫描待处理任务`)
    setTimeout(() => {
      getUnprocessed()
    }, CONFIG.DELAYS.MEDIUM)
  } else {
    logger.warn(`未找到"${CONFIG.TEXTS.CATEGORY_1}"按钮，建议手动操作或刷新页面`)
  }
}
