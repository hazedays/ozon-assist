/**
 * 数据库业务模型定义
 */

/** 统计数据模型 */
export interface DatabaseStat {
  /** 总投诉量 */
  totalComplaints: number
  /** 处理中投诉量 */
  processingComplaints: number
  /** 成功投诉量 */
  successComplaints: number
  /** 失败投诉量 */
  failedComplaints: number
  /** 超时投诉量 */
  timeoutComplaints: number
  /** 凭证库总数 */
  totalImages: number
  /** 凭证库总占用大小 */
  totalImagesSize: number
}

/** 投诉记录模型 */
export interface ComplaintItem {
  id: number
  sku: string
  status: 'pending' | 'processing' | 'success' | 'failed' | 'timeout'
  image_url?: string
  created_at: string
  started_at?: string
  finished_at?: string
  error_message?: string
}

/** 图片凭证模型 */
export interface ImageItem {
  id: number
  name: string
  size: number
  url: string
  created_at: string
}

/** ---------------- 回显对象定义 ---------------- */

/** 通用操作结果回显 */
export interface SuccessResponse {
  success: boolean
}

/** 投诉列表回显 */
export interface ComplaintsListResponse {
  /** 记录数组 */
  items: ComplaintItem[]
  /** 总条数 */
  total: number
}

/** 图片列表回显 */
export interface ImagesListResponse {
  /** 图片数组 */
  items: ImageItem[]
  /** 总条数 */
  total: number
  /** 总占用大小 (bytes) */
  totalSize: number
}

/** 导入投诉回显 */
export interface ImportComplaintsResponse extends SuccessResponse {
  /** 成功导入的数量 */
  count: number
}

/** 导入图片回显 */
export interface ImportImagesResponse extends SuccessResponse {
  /** 成功导入的数量 */
  count: number
  /** 因重复或错误跳过的数量 */
  skippedCount: number
}

/** ---------------- 接口抽象定义 ---------------- */

/** 数据库 API 业务契约 */
export interface IDatabaseApi {
  /** 获取统计数据汇总 */
  getStat(): Promise<DatabaseStat>

  /** 获取投诉记录列表 (分页+筛选) */
  getComplaints(params: any): Promise<ComplaintsListResponse>

  /** 批量从外部 SKU 列表导入投诉 */
  importComplaints(skus: string[]): Promise<ImportComplaintsResponse>

  /** 删除指定的一条投诉记录 */
  deleteComplaint(id: number): Promise<SuccessResponse>

  /** 手动更新投诉状态（例如重置状态） */
  updateComplaintStatus(id: number, status: string): Promise<SuccessResponse>

  /** 获取已导入的凭证图片列表 */
  getImages(params: any): Promise<ImagesListResponse>

  /** 批量导入图片文件 */
  importImages(files: any[]): Promise<ImportImagesResponse>

  /** 删除图片记录及其物理文件 */
  deleteImage(id: number): Promise<SuccessResponse>
}
