/**
 * Ozon Auto Complaint - Shared Constants
 */
export const CONFIG = {
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
      'Использование моих photo, video, текста',
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
;(window as any).ozonConfig = CONFIG
