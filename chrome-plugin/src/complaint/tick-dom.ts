import { getTextSpan } from './helpers'
import { verboseInfo } from './verbose'

/**
 * 轮询流程中依赖的页面常量与 DOM 辅助函数。
 *
 * 这里集中维护选择器、路径常量和菜单点击逻辑，
 * 方便页面结构变化时只在单处调整。
 */
export const SCRM_URL = 'https://seller.ozon.ru/app/messenger/?group=support_v2'
export const SEND_ICON_PATH =
  'M5.086 3.537c-.299.877.247 4.73.6 5.697.445 1.22 1.814 1.515 3.35 1.77C15 12 15 12 9.035 12.995c-1.536.256-2.905.55-3.35 1.77-.353.968-.899 4.82-.6 5.698.255.748 0 1.488 8.933-3.49C21 13.082 21 12.542 21 11.999c0-.541 0-1.105-6.98-4.972-8.976-4.973-8.679-4.238-8.934-3.49'
export const UPLOAD_ICON_PATH =
  'M11.055 3.703a5.835 5.835 0 0 1 8.239 0 5.804 5.804 0 0 1 0 8.22l-4.565 4.556a3.68 3.68 0 0 1-5.196 0 3.66 3.66 0 0 1 0-5.184l2.536-2.531a1.524 1.524 0 0 1 2.152 0 1.516 1.516 0 0 1 0 2.147l-2.536 2.531a.63.63 0 0 0 0 .89.63.63 0 0 0 .891 0l4.566-4.556a2.77 2.77 0 0 0 0-3.926 2.787 2.787 0 0 0-3.935 0L8.38 10.666a4.55 4.55 0 0 0 0 6.442l.522.521a4.57 4.57 0 0 0 6.456 0l2.797-2.791a1.524 1.524 0 0 1 2.152 0 1.516 1.516 0 0 1 0 2.147l-2.797 2.791a7.62 7.62 0 0 1-10.76 0l-.522-.52a7.58 7.58 0 0 1 0-10.738z'
export const IMAGE_POLICY_LINK =
  'https://seller-edu.ozon.ru/policies/documents-violations/avtorskie-prava?utm_source=ru_sc_bot&utm_medium=link'
export const FAILURE_MESSAGE =
  'Мы проверили ваш запрос. К сожалению, предоставленных доказательств недостаточно для подтверждения ваших авторских прав. В настоящее время авторские права не подтверждены, и нет причин скрывать товар. Вы можете приложить новые доказательства, которые позволят подтвердить ваши авторские права на контент.'

export function getActiveChatId(): string {
  const element = document.querySelector('div[active-chat-id] .m9d-n0') as HTMLElement | null
  return element?.innerText.trim() ?? ''
}

// 发送按钮与上传按钮都没有稳定 id，只能通过 path 定位其外层 button。
export function getActionButton(path: string): HTMLButtonElement | null {
  const icon = document.querySelector(`path[d="${path}"]`)
  return (icon?.parentElement?.parentElement as HTMLButtonElement | null) ?? null
}

export function getSendButton() {
  return getActionButton(SEND_ICON_PATH)
}

/**
 * 依次尝试点击投诉向导中的菜单项。
 *
 * 注意：匹配文案必须保持页面原始语言，日志文案则使用中文描述。
 */
export function navigateComplaintMenu() {
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
