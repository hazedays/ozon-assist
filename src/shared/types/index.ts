/**
 * 共享类型定义
 *
 * 本文件定义了主进程、渲染进程和 IPC 通信中使用的共享类型
 * 这些类型可被主进程（@main/*）和渲染进程（@renderer/*）同时使用
 *
 * 使用示例：
 * - 主进程: import type { Complaint } from '@shared/types'
 * - 渲染进程: import type { Complaint } from '@shared/types'
 */

/**
 * 投诉记录
 */
export interface Complaint {
  /** 投诉记录的唯一标识符（自增） */
  id: number
  /** 商品 SKU 码，用于识别涉及的商品 */
  sku: string
  /** 投诉状态：pending（待处理）| processing（处理中）| success（成功）| failed（已失败） */
  status: string
  /** 关联的图片ID（可选） */
  imageId?: number
  /** 备注信息（可选） */
  remark?: string
  /** 记录创建时间（ISO 8601 格式，例: 2026-01-24T17:00:00Z） */
  createdAt: string
  /** 记录最后更新时间（ISO 8601 格式，例: 2026-01-24T17:30:00Z） */
  updatedAt: string
}

/**
 * 图片文件记录
 */
export interface Image {
  /** 图片记录的唯一标识符 */
  id: number
  /** 图片本地存储路径 */
  path: string
  /** 原始文件名 */
  name: string
  /** 文件大小 */
  size: number
  /** 文件 MD5 哈希 */
  md5: string
  /** 记录创建时间 */
  createdAt: string
}
