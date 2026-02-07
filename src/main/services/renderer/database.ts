import { ipcMain, app } from 'electron'
import { databaseService } from '../database'
import * as fs from 'fs'
import * as path from 'path'
import * as crypto from 'crypto'
import { logger } from '@main/core/logger'

class DatabaseRendererService {
  constructor() {}

  /** 广播数据库更新通知 */
  private broadcastUpdate() {
    databaseService.notifyUpdate()
  }

  initRendererDatabase() {
    // 处理获取用户数据目录的请求
    ipcMain.handle('database:getUserDataPath', () => {
      return databaseService.getPath()
    })

    // 处理获取数据统计的请求
    ipcMain.handle('database:stat', () => {
      const db = databaseService.getDatabase()

      // 使用聚合函数在一次扫描中完成所有 complaints 统计，避免多次 COUNT(*) 慢查询
      const complaintStats = db
        .prepare(
          `
        SELECT 
          COUNT(*) as totalComplaints,
          COUNT(CASE WHEN status = 'pending' THEN 1 END) as pendingComplaints,
          COUNT(CASE WHEN status = 'processing' THEN 1 END) as processingComplaints,
          COUNT(CASE WHEN status = 'success' THEN 1 END) as successComplaints,
          COUNT(CASE WHEN status = 'failed' THEN 1 END) as failedComplaints,
          COUNT(CASE WHEN status = 'timeout' THEN 1 END) as timeoutComplaints
        FROM complaints
      `
        )
        .get()

      const imageStats = db.prepare('SELECT COUNT(*) as totalImages FROM images').get()

      return {
        ...complaintStats,
        ...imageStats
      }
    })

    // 获取投诉记录列表 (带分页和筛选)
    ipcMain.handle(
      'complaints:list',
      (
        _,
        params?: {
          page?: number
          pageSize?: number
          sku?: string
          status?: string
          startDate?: string
          endDate?: string
        }
      ) => {
        const db = databaseService.getDatabase()
        const page = params?.page || 1
        const pageSize = params?.pageSize || 20
        const offset = (page - 1) * pageSize
        const sku = params?.sku || ''
        const status = params?.status || ''
        const startDate = params?.startDate || ''
        const endDate = params?.endDate || ''

        let baseQuery = 'WHERE 1=1'
        const args: any[] = []

        if (sku) {
          baseQuery += ' AND complaints.sku LIKE ?'
          args.push(`%${sku}%`)
        }

        if (status) {
          baseQuery += ' AND complaints.status = ?'
          args.push(status)
        }

        if (startDate) {
          baseQuery += ' AND complaints.created_at >= ?'
          args.push(`${startDate} 00:00:00`)
        }

        if (endDate) {
          baseQuery += ' AND complaints.created_at <= ?'
          args.push(`${endDate} 23:59:59`)
        }

        const items = db
          .prepare(
            `
          SELECT complaints.*, images.file_path as image_path 
          FROM complaints 
          LEFT JOIN images ON complaints.image_id = images.id 
          ${baseQuery} 
          ORDER BY complaints.created_at DESC LIMIT ? OFFSET ?
        `
          )
          .all(...args, pageSize, offset)

        const total = db
          .prepare(`SELECT COUNT(*) as count FROM complaints ${baseQuery}`)
          .get(...args).count

        return { items, total }
      }
    )

    // 获取图片列表 (带分页和筛选)
    ipcMain.handle(
      'images:list',
      (_, params?: { page?: number; pageSize?: number; search?: string }) => {
        const db = databaseService.getDatabase()
        const page = params?.page || 1
        const pageSize = params?.pageSize || 20
        const offset = (page - 1) * pageSize
        const search = params?.search || ''

        let baseQuery = 'FROM images WHERE 1=1'
        const args: any[] = []

        if (search) {
          baseQuery += ' AND (file_name LIKE ? OR file_path LIKE ?)'
          args.push(`%${search}%`, `%${search}%`)
        }

        const items = db
          .prepare(`SELECT * ${baseQuery} ORDER BY created_at DESC LIMIT ? OFFSET ?`)
          .all(...args, pageSize, offset)
          .map((item: any) => ({
            ...item,
            is_missing: !fs.existsSync(item.file_path)
          }))

        const total = db.prepare(`SELECT COUNT(*) as count ${baseQuery}`).get(...args).count
        const totalSize =
          db.prepare(`SELECT SUM(file_size) as size ${baseQuery}`).get(...args).size || 0

        return { items, total, totalSize }
      }
    )

    // 删除图片
    ipcMain.handle('images:delete', (_, id: any) => {
      const db = databaseService.getDatabase()
      const numericId = Number(id)

      // 先获取物理路径
      const img = db.prepare('SELECT file_path FROM images WHERE id = ?').get(numericId) as
        | { file_path: string }
        | undefined

      if (img && img.file_path) {
        try {
          if (fs.existsSync(img.file_path)) {
            fs.unlinkSync(img.file_path)
            logger.info(`Successfully deleted physical file: ${img.file_path}`)
          } else {
            logger.warn(`File already missing from disk: ${img.file_path}`)
          }
        } catch (e) {
          logger.error(`Failed to delete physical file: ${img.file_path}`, e)
        }
      } else {
        logger.warn(`Could not find image record with ID ${numericId} for deletion`)
      }

      db.prepare('DELETE FROM images WHERE id = ?').run(numericId)

      // 同步解除关联的投诉表字段
      db.prepare('UPDATE complaints SET image_id = NULL WHERE image_id = ?').run(numericId)

      this.broadcastUpdate()
      return { success: true }
    })

    // 导入图片 (支持路径或二进制数据)
    ipcMain.handle('images:import', (_, files: any[]) => {
      const db = databaseService.getDatabase()
      const storageDir = path.join(app.getPath('userData'), 'images')

      // 确保存储目录存在
      if (!fs.existsSync(storageDir)) {
        fs.mkdirSync(storageDir, { recursive: true })
      }

      const insert = db.prepare(`
        INSERT INTO images (file_name, file_path, file_size, file_md5, created_at) 
        VALUES (?, ?, ?, ?, datetime('now', 'localtime'))
      `)

      const checkMd5 = db.prepare('SELECT id FROM images WHERE file_md5 = ?')

      let count = 0
      let skippedCount = 0
      // 遍历文件进行导入
      for (const file of files) {
        // 极致容错与调试日志
        if (!file) {
          logger.error('Received null or undefined file object in importImages')
          continue
        }

        const fileName = String(file.name || 'unknown_image')
        const fileSize = Number(file.size || 0)

        try {
          let buffer: Buffer
          if (file.data) {
            // 处理二进制数据
            if (Buffer.isBuffer(file.data)) {
              buffer = file.data
            } else if (file.data instanceof Uint8Array || file.data instanceof ArrayBuffer) {
              buffer = Buffer.from(file.data)
            } else if (typeof file.data === 'object') {
              const values = Object.values(file.data)
              buffer = Buffer.from(values as number[])
            } else {
              throw new Error(`Unsupported data type: ${typeof file.data}`)
            }
          } else if (file.path) {
            // 从路径读取
            if (!fs.existsSync(file.path)) {
              throw new Error(`File not found: ${file.path}`)
            }
            buffer = fs.readFileSync(file.path)
          } else {
            logger.warn(`Skip file: missing both path and data`, { fileName })
            continue
          }

          // 计算 MD5
          const md5 = crypto.createHash('md5').update(buffer).digest('hex')

          // 查重
          const existing = checkMd5.get(md5)
          if (existing) {
            logger.info(`Skip duplicate file: ${fileName} (MD5: ${md5})`)
            skippedCount++
            continue
          }

          // 获取后缀名
          const extension = path.extname(fileName) || '.png'
          const safeFileName = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}${extension}`
          const destPath = path.join(storageDir, safeFileName)

          // 写入本地存储
          fs.writeFileSync(destPath, buffer)

          // 记录到数据库
          insert.run(fileName, destPath, fileSize, md5)
          count++
        } catch (e) {
          logger.error(`[IMAGE_IMPORT_ERROR] Failed to process ${fileName}:`, {
            error: e instanceof Error ? e.message : String(e),
            hasData: !!file.data,
            hasPath: !!file.path
          })
        }
      }

      this.broadcastUpdate()
      return { success: true, count, skippedCount }
    })

    // 批量导入投诉记录
    ipcMain.handle('complaints:import', (_, skus: string[]) => {
      const db = databaseService.getDatabase()

      // 使用 INSERT OR IGNORE 跳过已存在的 SKU
      const insert = db.prepare('INSERT OR IGNORE INTO complaints (sku, status) VALUES (?, ?)')

      let importedCount = 0
      const transaction = db.transaction((items) => {
        for (const sku of items) {
          const result = insert.run(sku, 'pending')
          if (result.changes > 0) {
            importedCount++
          }
        }
      })

      transaction(skus)

      this.broadcastUpdate()

      return { success: true, count: importedCount }
    })

    // 删除投诉记录
    ipcMain.handle('complaints:delete', (_, id: any) => {
      const db = databaseService.getDatabase()
      const numericId = Number(id)
      db.prepare('DELETE FROM complaints WHERE id = ?').run(numericId)
      this.broadcastUpdate()
      return { success: true }
    })

    // 更新投诉记录状态
    ipcMain.handle(
      'complaints:update-status',
      (_, { id, status }: { id: number; status: string }) => {
        const db = databaseService.getDatabase()
        const numericId = Number(id)
        db.prepare(
          'UPDATE complaints SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
        ).run(status, numericId)
        this.broadcastUpdate()
        return { success: true }
      }
    )
  }
}

export const databaseRendererService = new DatabaseRendererService()
