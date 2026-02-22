/**
 * 数据库操作请求参数定义
 */

/** 获取投诉列表参数 */
export interface GetComplaintsParams {
  /** 页码 */
  page?: number
  /** 每页数量 */
  pageSize?: number
  /** SKU 模糊搜索 */
  sku?: string
  /** 任务状态 */
  status?: string
  /** 开始日期 */
  startDate?: string
  /** 结束日期 */
  endDate?: string
}

/** 获取图片列表参数 */
export interface GetImagesParams {
  /** 页码 */
  page?: number
  /** 每页数量 */
  pageSize?: number
  /** 文件名模糊搜索 */
  search?: string
}

/** 导入图片参数 */
export interface ImportImageItem {
  /** 原始路径 */
  path?: string
  /** 文件名 */
  name: string
  /** 字节大小 */
  size: number
  /** 原始数据 */
  data?: Uint8Array
}
