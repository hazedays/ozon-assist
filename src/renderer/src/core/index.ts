import type { App } from 'vue'
import 'dayjs/locale/zh-cn'

import router from '@renderer/router'
import pinia from '@renderer/stores'
import dayjs from 'dayjs'

export const configureApp = (app: App) => {
  app.use(pinia)
  dayjs.locale('zh-cn')
  app.use(router)
  return app
}
