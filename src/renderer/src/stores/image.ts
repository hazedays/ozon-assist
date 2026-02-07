import { defineStore } from 'pinia'
import { databaseService } from '@renderer/services/database'
import { serverService } from '@renderer/services/server'
import logger from '@renderer/core/logger'

interface ImageRecord {
  id: number
  file_name: string
  file_path: string
  file_size: number
  created_at: string
  is_missing: boolean
}

interface ImageState {
  records: ImageRecord[]
  total: number
  totalSize: number
  currentPage: number
  pageSize: number
  filters: {
    search: string
  }
  loading: boolean
  serverUrl: string | null
  // 预览状态
  previewVisible: boolean
  previewUrl: string
  _isInitialized: boolean
}

export const useImageStore = defineStore('image', {
  state: (): ImageState => ({
    records: [],
    total: 0,
    totalSize: 0,
    currentPage: 1,
    pageSize: 20,
    filters: {
      search: ''
    },
    loading: false,
    serverUrl: null,
    previewVisible: false,
    previewUrl: '',
    _isInitialized: false
  }),

  actions: {
    /** 开启图片预览 */
    showPreview(url: string) {
      if (!url) return
      this.previewUrl = url
      this.previewVisible = true
    },

    /** 关闭图片预览 */
    hidePreview() {
      this.previewVisible = false
    },

    async refresh() {
      this.loading = true
      try {
        const [listData, url] = await Promise.all([
          databaseService.getImages({
            page: this.currentPage,
            pageSize: this.pageSize,
            search: this.filters.search
          }),
          serverService.getUrl()
        ])
        this.records = listData.items
        this.total = listData.total
        this.totalSize = listData.totalSize
        this.serverUrl = url
      } catch (error) {
        logger.error('Failed to refresh images:', error)
      } finally {
        this.loading = false
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

    async setFilter(filters: { search?: string }) {
      if (filters.search !== undefined) this.filters.search = filters.search
      this.currentPage = 1
      await this.refresh()
    },

    async removeRecord(id: number) {
      try {
        const result = await databaseService.deleteImage(id)
        if (result.success) {
          await this.refresh()
        }
        return result
      } catch (error) {
        logger.error('Delete image failed:', error)
        throw error
      }
    },

    /** 初始化监听 */
    init() {
      if (this._isInitialized) return

      const { ipcRenderer } = (window as any).electron || {}
      if (ipcRenderer) {
        ipcRenderer.on('database:updated', () => {
          this.refresh()
        })
        ipcRenderer.on('server:status-changed', () => {
          this.refresh()
        })
      }
      this._isInitialized = true
    },

    /** 获取图片的显示 URL */
    getImageUrl(img: ImageRecord): string {
      if (img.is_missing) return ''

      // 如果服务器开启，优先使用服务器 URL
      if (this.serverUrl) {
        // 提取文件名 (因为服务器映射了 /images 到存储目录)
        const parts = img.file_path.split(/[\\/]/)
        const fileName = parts[parts.length - 1]
        return `${this.serverUrl}/images/${fileName}`
      }

      // 否则使用本地资源协议
      return `local-resource://${img.file_path}`
    }
  }
})
