import { Stat } from '@renderer/types/stat'

const { ipcRenderer } = window.electron || {}

/**
 * 数据库核心服务 - 纯 TypeScript 实现
 * 仅负责与主进程 IPC 通信，不包含任何框架相关的响应式逻辑
 */
class DatabaseService {
  /** 获取统计数据 */
  async getStat(): Promise<Stat> {
    return await ipcRenderer.invoke('database:stat')
  }

  /** 获取投诉记录列表 (分页+筛选) */
  async getComplaints(params: {
    page?: number
    pageSize?: number
    sku?: string
    status?: string
    startDate?: string
    endDate?: string
  }): Promise<{ items: any[]; total: number }> {
    return await ipcRenderer.invoke('complaints:list', params)
  }

  /** 批量导入投诉记录 */
  async importComplaints(skus: string[]): Promise<{ success: boolean; count: number }> {
    return await ipcRenderer.invoke('complaints:import', skus)
  }

  /** 删除投诉记录 */
  async deleteComplaint(id: number): Promise<{ success: boolean }> {
    return await ipcRenderer.invoke('complaints:delete', id)
  }

  /** 更新投诉记录状态 */
  async updateComplaintStatus(id: number, status: string): Promise<{ success: boolean }> {
    return await ipcRenderer.invoke('complaints:update-status', { id, status })
  }

  /** 获取图片列表 */
  async getImages(params: {
    page?: number
    pageSize?: number
    search?: string
  }): Promise<{ items: any[]; total: number; totalSize: number }> {
    return await ipcRenderer.invoke('images:list', params)
  }

  /** 导入图片 */
  async importImages(
    files: { path?: string; name: string; size: number; data?: Uint8Array }[]
  ): Promise<{ success: boolean; count: number; skippedCount: number }> {
    return await ipcRenderer.invoke('images:import', files)
  }

  /** 删除图片记录 */
  async deleteImage(id: number): Promise<{ success: boolean }> {
    return await ipcRenderer.invoke('images:delete', id)
  }
}

export const databaseService = new DatabaseService()
