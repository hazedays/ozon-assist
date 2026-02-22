/**
 * 图片服务器接口响应
 */
export interface ServerStatusResponse {
  isRunning: boolean
  url: string | null
  port: number | null
}

/**
 * 服务器 API 模块接口
 */
export interface IServerApi {
  /** 检查服务器是否正在运行 */
  isRunning(): Promise<boolean>

  /** 获取服务器基础 URL */
  getUrl(): Promise<string | null>

  /** 获取服务器状态 */
  getStatus(): Promise<ServerStatusResponse>
}
