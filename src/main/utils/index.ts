/**
 * 主进程工具函数
 */

import { app } from 'electron'
import { join } from 'path'

/**
 * 获取用户数据目录
 */
export function getUserDataPath(): string {
  try {
    return app.getPath('userData')
  } catch (e) {
    // 如果在应用完全初始化前调用，尝试返回一个基础路径或抛出更清晰的错误
    if (!app.isPackaged) {
      return join(process.cwd(), 'data')
    }
    throw e
  }
}

/**
 * 检查是否为开发环境
 */
export function isDev(): boolean {
  return process.env.NODE_ENV === 'development'
}

/**
 * 获取被 asarUnpack 的外部资源路径
 * 处理开发环境和生产环境（asar.unpacked）的差异
 * @param relativePath 相对项目根目录或 resources 目录的路径
 */
export function getUnpackedPath(relativePath: string): string {
  return app.isPackaged
    ? join(process.resourcesPath, 'app.asar.unpacked', relativePath)
    : join(app.getAppPath(), relativePath)
}
