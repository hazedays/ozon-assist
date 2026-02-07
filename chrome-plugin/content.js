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
      sessionStorage.removeItem('complaintAutoSubmitted')
      checkUrl()
      sendResponse({ status: 'received' })
    }
    return true
  })
}

// 页面状态检查
const url = window.location.href
const autoSubmitted = sessionStorage.getItem('complaintAutoSubmitted')

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
} else if (
  autoSubmitted === 'true' &&
  url === 'https://seller.ozon.ru/app/messenger?channel=SCRM'
) {
  logger.info('检测到延续性自动标志')
  new Promise((resolve) => setTimeout(resolve, 5000)).then(() => {
    executeWhenReady(startStep)
  })
}

// 检查并跳转
function checkUrl() {
  const supportUrl = 'https://seller.ozon.ru/app/messenger?group=support_v2&auto=true'
  if (!window.location.href.endsWith(supportUrl)) {
    logger.info('目标页面不符，正在重定向到支持页面...')
    window.location.href = supportUrl
  } else {
    createComplaint()
  }
}

// 通用查找函数
async function waitForElement(selector, maxAttempts = 15, isText = false) {
  for (let i = 0; i < maxAttempts; i++) {
    logger.debug(`正在寻找元素: ${selector} (尝试: ${maxAttempts - i})`)
    const el = isText ? findElementByText(selector) : document.querySelector(selector)
    if (el) {
      logger.debug(`成功定位到元素: ${selector}`)
      return el
    }
    await new Promise((resolve) => setTimeout(resolve, i * 1000))
  }
  logger.warn(`未能在限时内找到元素: ${selector}`)
  taskFailed()
  return null
}

// 任务失败回调
function taskFailed() {
  chrome.runtime.sendMessage({
    action: 'get',
    url: '/task/failed'
  })
}

// 创建投诉
async function createComplaint() {
  logger.info('--- 启动投诉创建流程 ---', '#9b59b6')
  await new Promise((resolve) => setTimeout(resolve, 1000))

  const btn = await waitForElement('.index_helpText_Qm6HR')
  if (!btn) return

  btn.click()
  await new Promise((resolve) => setTimeout(resolve, 1000))

  const fbBtn = await waitForElement('.index_contactSupportButton_2LpVt')
  if (!fbBtn) return

  fbBtn.click()
  sessionStorage.setItem('complaintAutoSubmitted', 'true')
  logger.success('已进入邮件反馈模式，设置延续标志')

  await new Promise((resolve) => setTimeout(resolve, 1000))
  startStep()
}

// 处理步骤
async function startStep() {
  logger.info('--- 正在执行类目导航 ---', '#9b59b6')

  const steps = [
    'Товары и Цены',
    'Контроль качества',
    'Нарушение правил площадки другим продавцом',
    'Использование моих фото, видео, текста'
  ]

  for (let i = 0; i < steps.length; i++) {
    logger.info(`导航进度: ${i + 1}/${steps.length} (${steps[i]})`)
    const span = await waitForElement(steps[i], 15, true)
    if (!span) return

    span.click()
    await new Promise((resolve) => setTimeout(resolve, 1000))
  }

  logger.success('导航路径选择完毕')
  getUnprocessed()
}

// 获取当前投诉SKU
function getCurrentComplaintSku() {
  return localStorage.getItem('currentComplaintSku')
}

// 获取未处理投诉
async function getUnprocessed() {
  logger.info('>>> 开始获取待处理投诉...')
  try {
    const response = await chrome.runtime.sendMessage({
      action: 'get',
      url: '/complaint/unprocessed'
    })

    if (response.success) {
      const { sku, id } = response.data
      logger.success(`成功获取任务: SKU=${sku}, ID=${id}`)
      localStorage.setItem('currentComplaintSku', sku)
      simulateKeyboardInput(sku)
    } else {
      logger.info(`暂无待处理投诉: ${response.message || '未知原因'}`, '#95a5a6')
    }
  } catch (error) {
    logger.error('获取投诉异常:', error)
  }
}

async function getRandomImage() {
  const sku = getCurrentComplaintSku()
  logger.info(`>>> 正在为 SKU: ${sku} 获取随机凭证图片...`)
  try {
    const response = await chrome.runtime.sendMessage({
      action: 'get',
      url: '/image/random'
    })

    if (response.success) {
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
      logger.error(`获取随机图片失败: ${response.message}`)
    }
  } catch (error) {
    logger.error('获取图片流程异常:', error)
  }
}

// 验证URL格式
function validateOzonMessengerUrl(url) {
  return /^https:\/\/seller\.ozon\.ru\/app\/messenger\/\?id=[0-9a-f-]{36}&group=support_v2$/i.test(
    url
  )
}

function findElementByText(text) {
  // 获取所有span元素
  const allSpans = document.querySelectorAll('span')
  let targetElement = null

  // 遍历查找文本匹配的元素
  for (const span of allSpans) {
    // trim() 去除首尾空格，避免因空格导致匹配失败
    if (span.innerText.trim() === text.trim()) {
      targetElement = span
      break // 找到后立即退出循环
    }
  }

  if (targetElement) {
    logger.debug(`找到目标文本元素: ${text}`)
    return targetElement
  } else {
    logger.debug(`未找到包含文本 "${text}" 的span元素`)
    return null
  }
}

// 模拟键盘输入
async function simulateKeyboardInput(sku) {
  // 精准定位唯一的textarea
  const textarea = document.querySelector('textarea.om_17_a4')
  if (!textarea) {
    logger.error('未找到输入框 (textarea.om_17_a4)')
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
  await new Promise((resolve) => setTimeout(resolve, 1000))
  submitComplaint()
}

async function submitComplaint() {
  const elements = document.querySelectorAll('button.om_17_a8')
  if (elements.length === 2) {
    logger.info('正在点击提交按钮...')
    elements[1].click()
  }
  await new Promise((resolve) => setTimeout(resolve, 2000))

  let hasNext = false
  let attempts = 0
  logger.info('正在等待上传文件的要求出现...')
  while (!hasNext && attempts < 15) {
    // 模糊匹配：包含 "пришлите" (发送) 和 "документы" (文件)
    hasNext =
      document.body.innerText.includes('пришлите') && document.body.innerText.includes('документы')
    if (!hasNext) {
      attempts++
      await new Promise((resolve) => setTimeout(resolve, 1000))
    }
  }

  if (!hasNext) {
    logger.error('超时未检测到上传文件的要求，可能 SKU 无效或已投诉')
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
  const fileInput = document.querySelector('input[type="file"]')
  if (!fileInput) {
    logger.error('未找到 input[type="file"]')
    return
  }

  try {
    logger.info('正在拉取图片数据 (通过后台代理)...')
    const response = await chrome.runtime.sendMessage({
      action: 'fetchImage',
      url: imageUrl
    })

    if (!response || !response.success) {
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

    await new Promise((resolve) => setTimeout(resolve, 3000))

    // 检查图片是否已正常显示
    const imgPreview = document.querySelector('.om_17_p2')
    if (imgPreview) {
      const btns = document.querySelectorAll('button.om_17_a8')
      if (btns.length === 2) {
        logger.info('检测到预览图，执行最终发送...')
        btns[1].click()
        checkResult()
      } else {
        logger.warn('提交按钮状态异常')
      }
    } else {
      logger.error('图片预览未出现，可能上传失败')
    }
  } catch (error) {
    logger.error('图片流程中断:', error)
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

  const nextBtn = await waitForElement('Пожаловаться на другой товар', 15, true)
  const updateResp = await chrome.runtime.sendMessage({
    action: 'post',
    url: `/complaint/${sku}/status`,
    data: { status: nextBtn ? 'success' : 'failed' }
  })
  logger.debug('状态更新响应: ' + JSON.stringify(updateResp))
  localStorage.removeItem('currentComplaintSku')
  if (!nextBtn) {
    logger.warn('无法继续投诉, 当前窗口已失效')
    const failedNum = localStorage.getItem('currentFailedNum') || '0'
    if (failedNum === '3') {
      logger.error('连续3次失败，可能账号权限受限，停止自动化流程')
      return
    }
    localStorage.setItem('currentFailedNum', (parseInt(failedNum) + 1).toString())
    checkUrl()
    return
  }
  localStorage.removeItem('currentFailedNum')
  nextBtn.click()
  await new Promise((resolve) => setTimeout(resolve, 2000))
  // 点击继续投诉，触发下一轮流程
  getUnprocessed()
}

// 初始化逻辑
logger.info('Ozon 自动化插件已成功加载', '#2980b9')

const currentUrl = window.location.href
if (validateOzonMessengerUrl(currentUrl)) {
  logger.info('检测到目标聊天页面，寻找类目入口...')
  const target = findElementByText('Товары и Цены')
  if (target) {
    target.click()
    logger.info('已触发“Товары и Цены”，将在 2s 后扫描待处理任务')
    setTimeout(getUnprocessed, 2000)

    // 启动结果监听
    checkResult()
  } else {
    logger.warn('未找到“Товары и Цены”按钮，建议手动操作或刷新页面')
  }
}
