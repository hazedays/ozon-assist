/**
 * Ozon Auto Complaint - API Service
 *
 * 该模块统一封装了插件与后台服务端的通信逻辑
 * 支持常用的 GET、POST 请求以及特殊的图片资源抓取
 */

const API_BASE = 'http://127.0.0.1:8972/api'

interface ApiResponse {
  success: boolean
  data?: any
  type?: string
  error?: string
}

export const ApiService = {
  /**
   * 通用网络请求处理器
   * @param {string} action - 请求类型: 'get', 'post', 'fetchImage'
   * @param {string} url - 请求的相对路径或绝对路径
   * @param {any} [data={}] - POST 请求发送的数据体
   * @returns {Promise<ApiResponse>} 返回包含请求结果或错误信息的 Promise 对象
   */
  async request(action: string, url: string, data: any = {}): Promise<ApiResponse> {
    // 自动补全基础路径
    const fullUrl = url.startsWith('http') ? url : `${API_BASE}${url}`
    try {
      // 场景一：抓取图片并转为 Base64（用于绕过跨域注入 input）
      if (action === 'fetchImage') {
        const resp = await fetch(fullUrl)
        if (!resp.ok) throw new Error(`图片下载失败: ${resp.status}`)
        const blob = await resp.blob()
        return new Promise((resolve) => {
          const reader = new FileReader()
          reader.onloadend = () =>
            resolve({
              success: true,
              data: reader.result as string, // Base64 字符串
              type: blob.type // MIME 类型
            })
          reader.readAsDataURL(blob)
        })
      }

      // 场景二：常规 JSON API 请求
      const options: RequestInit = {
        method: action.toUpperCase(),
        headers: { 'Content-Type': 'application/json' }
      }
      // 仅为 POST 方法配置数据体
      if (action.toLowerCase() === 'post') {
        options.body = JSON.stringify(data)
      }

      const response = await fetch(fullUrl, options)
      return await response.json()
    } catch (error: any) {
      // 统一错误捕获与日志输出
      console.error(`[ApiService] ${action} ${url} 请求执行失败:`, error)
      return { success: false, error: error.message }
    }
  }
}

/**
 * 环境兼容性导出
 * 确保在 Service Worker (self) 或 Window 环境下均可访问
 */
if (typeof self !== 'undefined') {
  ;(self as any).ApiService = ApiService
}
