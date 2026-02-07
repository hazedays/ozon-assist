import { defineStore } from 'pinia'
import { databaseService } from '@renderer/services/database'
import { Stat } from '@renderer/types/stat'
import { useToast } from '@renderer/composables/use-toast'
import logger from '@renderer/core/logger'

const { ipcRenderer } = window.electron || {}

export const useComplaintStore = defineStore('complaint', {
  state: () => ({
    stat: null as Stat | null,
    records: [] as any[],
    activeTasks: [] as any[],
    total: 0,
    currentPage: 1,
    pageSize: 20,
    filters: {
      sku: '',
      status: '',
      startDate: '',
      endDate: ''
    },
    loading: false,
    _isInitialized: false
  }),

  actions: {
    async refresh() {
      const prevStat = this.stat
      const toast = useToast()

      try {
        const [statData, listData, activeTasksData] = await Promise.all([
          databaseService.getStat(),
          databaseService.getComplaints({
            page: this.currentPage,
            pageSize: this.pageSize,
            sku: this.filters.sku,
            status: this.filters.status,
            startDate: this.filters.startDate,
            endDate: this.filters.endDate
          }),
          databaseService.getComplaints({
            status: 'processing',
            pageSize: 5 // 只取前 5 个最活跃的正在处理中的任务
          })
        ])

        // 主进程解耦准则：由渲染进程监听状态变化后决定是否弹窗
        if (prevStat && statData) {
          if (statData.failedComplaints > prevStat.failedComplaints) {
            toast.error('检测到投诉被驳回，请检查失败记录')
          }
          if (statData.timeoutComplaints > prevStat.timeoutComplaints) {
            toast.warning('检测到任务处理超时，系统已自动清理')
          }
        }

        this.stat = statData
        this.records = listData.items
        this.total = listData.total
        this.activeTasks = activeTasksData.items
      } catch (error) {
        logger.error('Failed to refresh complaints:', error)
      }
    },

    async setPage(page: number) {
      if (page < 1) return
      this.currentPage = page
      await this.refresh()
    },

    async setPageSize(size: number) {
      this.pageSize = size
      this.currentPage = 1
      await this.refresh()
    },

    async setFilter(filters: {
      sku?: string
      status?: string
      startDate?: string
      endDate?: string
    }) {
      if (filters.sku !== undefined) this.filters.sku = filters.sku
      if (filters.status !== undefined) this.filters.status = filters.status
      if (filters.startDate !== undefined) this.filters.startDate = filters.startDate
      if (filters.endDate !== undefined) this.filters.endDate = filters.endDate
      this.currentPage = 1
      await this.refresh()
    },

    async resetPage() {
      this.currentPage = 1
      this.filters.sku = ''
      this.filters.status = ''
      this.filters.startDate = ''
      this.filters.endDate = ''
      await this.refresh()
    },

    async importSkus(skus: string[]) {
      this.loading = true
      try {
        const result = await databaseService.importComplaints(skus)
        // 导入成功后，虽然有监听到 database:updated，但我们主动跳转到第一页查看最新
        await this.resetPage()
        return result
      } finally {
        this.loading = false
      }
    },

    async removeRecord(id: number) {
      try {
        return await databaseService.deleteComplaint(id)
      } catch (error) {
        logger.error('Delete failed:', error)
        throw error
      }
    },

    async updateStatus(id: number, status: string) {
      try {
        return await databaseService.updateComplaintStatus(id, status)
      } catch (error) {
        logger.error('Update status failed:', error)
        throw error
      }
    },

    /** 初始化全局监听 */
    init() {
      if (this._isInitialized) return

      if (ipcRenderer) {
        logger.info('[Store] Registering database:updated listener')
        // 监听来自主进程的数据变更通知
        ipcRenderer.on('database:updated', () => {
          logger.info('[Store] Received database:updated event')
          // 如果我们在第一页，直接刷新就行
          // 如果我们在其他页，删除/增加操作可能导致当前页数据为空或偏移，刷新当前页即可
          this.refresh()
        })
      } else {
        logger.warn('[Store] ipcRenderer not found, real-time updates disabled')
      }
      this.refresh()
      this._isInitialized = true
    }
  }
})
