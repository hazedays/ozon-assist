/** 统计数据类型 */
export interface Stat {
  /** 总投诉数量 */
  totalComplaints: number
  /** 待处理数量 */
  pendingComplaints: number
  /** 处理中数量 */
  processingComplaints: number
  /** 失败投诉数量 */
  failedComplaints: number
  /** 超时投诉数量 */
  timeoutComplaints: number
  /** 成功投诉数量 */
  successComplaints: number
  /** 总图片数量 */
  totalImages: number
}
