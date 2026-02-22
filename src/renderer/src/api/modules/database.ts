/**
 * 数据库模块接口
 * 负责通过 IPC 调用主进程的数据库功能
 */
import {
  DatabaseStat,
  IDatabaseApi,
  ComplaintsListResponse,
  ImportComplaintsResponse,
  SuccessResponse,
  ImagesListResponse,
  ImportImagesResponse
} from '../types/models/database'
import { GetComplaintsParams, GetImagesParams, ImportImageItem } from '../types/params/database'

const { ipcRenderer } = window.electron || {}

/**
 * 数据库 API 调用实现对象
 */
export const databaseApi: IDatabaseApi = {
  /** 获取统计数据 */
  async getStat(): Promise<DatabaseStat> {
    return await ipcRenderer.invoke('database:stat')
  },

  /** 获取投诉记录列表 (分页+筛选) */
  async getComplaints(params: GetComplaintsParams): Promise<ComplaintsListResponse> {
    return await ipcRenderer.invoke('complaints:list', params)
  },

  /** 批量导入投诉记录 (根据 SKU) */
  async importComplaints(skus: string[]): Promise<ImportComplaintsResponse> {
    return await ipcRenderer.invoke('complaints:import', skus)
  },

  /** 删除投诉记录 */
  async deleteComplaint(id: number): Promise<SuccessResponse> {
    return await ipcRenderer.invoke('complaints:delete', id)
  },

  /** 更新投诉记录状态 */
  async updateComplaintStatus(id: number, status: string): Promise<SuccessResponse> {
    return await ipcRenderer.invoke('complaints:update-status', { id, status })
  },

  /** 获取图片列表 */
  async getImages(params: GetImagesParams): Promise<ImagesListResponse> {
    return await ipcRenderer.invoke('images:list', params)
  },

  /** 批量导入图片凭证 */
  async importImages(files: ImportImageItem[]): Promise<ImportImagesResponse> {
    return await ipcRenderer.invoke('images:import', files)
  },

  /** 删除图片记录与本地文件 */
  async deleteImage(id: number): Promise<SuccessResponse> {
    return await ipcRenderer.invoke('images:delete', id)
  }
}
