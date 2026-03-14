/**
 * Ozon Auto Complaint - Logger Module
 */
export const logger = {
  _getTime: () => new Date().toLocaleTimeString(),
  info: (msg: string) =>
    console.log(`%c[Ozon插件][${new Date().toLocaleTimeString()}] ${msg}`, 'color: #3498db'),
  warn: (msg: string) =>
    console.log(`%c[Ozon插件] ⚠️ [${new Date().toLocaleTimeString()}] ${msg}`, 'color: #e67e22'),
  error: (msg: string, err: any = '') =>
    console.log(
      `%c[Ozon插件] ❌ [${new Date().toLocaleTimeString()}] ${msg}`,
      'color: #e74c3c',
      err
    ),
  success: (msg: string) =>
    console.log(
      `%c[Ozon插件] ✅ [${new Date().toLocaleTimeString()}] ${msg}`,
      'color: #27ae60; font-weight:bold'
    )
}

// 挂载到 window 方便调试
;(window as any).ozonLogger = logger
