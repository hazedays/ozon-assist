/**
 * Ozon Auto Complaint - Utils
 */
export const utils = {
  sleep: (ms: number) => new Promise((r) => setTimeout(r, ms)),

  /**
   * 等待元素出现
   */
  waitForElement: async (selector: string, isText: boolean = false, maxRetries: number = 20) => {
    const logger = (window as any).ozonLogger
    if (logger) logger.info(`正在等待元素: ${selector} (isText: ${isText})...`)

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      if (isText) {
        const el = [...document.querySelectorAll('span')].find(
          (s) => s.innerText.trim() === selector.trim()
        )
        if (el) return el
      } else {
        const el = document.querySelector(selector)
        if (el) return el
      }
      await new Promise((r) => setTimeout(r, Math.min(500 * (attempt + 1), 2000)))
    }

    if (logger) logger.warn(`等待元素超时: ${selector}`)
    return null
  }
}
;(window as any).ozonUtils = utils
