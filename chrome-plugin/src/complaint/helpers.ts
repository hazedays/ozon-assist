import { logger } from '../core/logger'
import { verboseInfo } from './verbose'

/**
 * 模拟键盘输入，将 SKU 填写到投诉对话框的 textarea 中。
 */
export type InputVerificationResult = {
  success: boolean
  expectedValue: string
  actualValue: string
  textareaFound: boolean
  attempts: number
}

export async function simulateKeyboardInput(
  sku: string,
  options?: {
    maxAttempts?: number
    retryDelayMs?: number
  }
) {
  const maxAttempts = options?.maxAttempts ?? 3
  const retryDelayMs = options?.retryDelayMs ?? 500

  let lastActualValue = ''
  let lastTextareaFound = false

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const textarea = document.querySelector('textarea')
    lastTextareaFound = Boolean(textarea)

    verboseInfo(
      `【输入模块】准备写入 SKU, attempt=${attempt}/${maxAttempts}, textareaFound=${lastTextareaFound}, sku=${sku}`
    )

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
      logger.warn(`【输入模块】未找到 textarea，无法输入 SKU (attempt=${attempt}/${maxAttempts})`)
    }

    await new Promise((r) => setTimeout(r, retryDelayMs))

    lastActualValue = textarea?.value ?? ''
    const success = lastActualValue === sku
    verboseInfo(
      `【输入模块】输入校验结果: ${success}, attempt=${attempt}/${maxAttempts}, expectedValue=${sku}, actualValue=${lastActualValue || 'empty'}`
    )

    if (success) {
      return {
        success: true,
        expectedValue: sku,
        actualValue: lastActualValue,
        textareaFound: lastTextareaFound,
        attempts: attempt
      } satisfies InputVerificationResult
    }

    if (attempt < maxAttempts) {
      logger.warn(
        `【输入模块】输入校验未通过，准备重试。attempt=${attempt}/${maxAttempts}, expectedValue=${sku}, actualValue=${lastActualValue || 'empty'}`
      )
    }
  }

  return {
    success: false,
    expectedValue: sku,
    actualValue: lastActualValue,
    textareaFound: lastTextareaFound,
    attempts: maxAttempts
  } satisfies InputVerificationResult
}

/**
 * 在当前页面中查找 innerText 完全匹配指定文本的第一个 <span> 元素。
 */
export function getTextSpan(text: string): HTMLSpanElement | undefined {
  const spans = [...document.querySelectorAll('span')]
  const el = spans.find((s) => s.innerText.trim() === text.trim())
  return el
}

/**
 * 获取随机图片并转换为 FileList。
 */
export async function getImage() {
  const url = '/image/random'
  verboseInfo(`【图片模块】开始请求图片资源: ${url}`)
  const resp = await chrome.runtime.sendMessage({ action: 'get-image', url })
  if (!resp.success || !resp.data) {
    logger.error(`获取图片失败: ${resp.error}`)
    return null
  }

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
