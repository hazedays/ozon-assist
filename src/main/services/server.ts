/**
 * 服务器服务 - 整合 Express 服务器和 IPC 处理
 */

import express from 'express'
import { Server } from 'http'
import { join, basename } from 'path'
import { BrowserWindow, Notification, dialog } from 'electron'
import { logger } from '@main/core/logger'
import { databaseService } from './database'
import { getUserDataPath } from '@main/utils'

class ServerService {
  private serverInstance: Server | null = null
  private activePort: number | null = null
  private statusChangeCallbacks: Array<(running: boolean) => void> = []
  private cleanupInterval: NodeJS.Timeout | null = null

  /**
   * 注册状态变化回调
   */
  onStatusChanged(callback: (running: boolean) => void): void {
    this.statusChangeCallbacks.push(callback)
  }

  /**
   * 广播服务器状态变化给所有渲染进程和回调
   */
  private broadcastStatus(): void {
    const running = this.isRunning()

    // 通知所有注册的回调
    this.statusChangeCallbacks.forEach((callback) => {
      callback(running)
    })

    // 通知所有渲染进程
    const allWindows = BrowserWindow.getAllWindows()
    allWindows.forEach((win) => {
      win.webContents.send('server:status-changed', running)
    })
  }

  /**
   * 广播数据库刷新通知给所有渲染进程
   */
  private broadcastDatabaseUpdate(): void {
    databaseService.notifyUpdate()
  }

  /**
   * 检查是否所有任务都已完成，如果是则发送通知
   */
  private checkAndNotifyCompletion(): void {
    try {
      const db = databaseService.getDatabase()
      // 检查是否有处于 pending 或 processing 状态的任务
      const active = db
        .prepare(
          "SELECT COUNT(*) as count FROM complaints WHERE status IN ('pending', 'processing')"
        )
        .get() as { count: number }

      if (active && active.count === 0) {
        // 检查总数，避免空数据库也弹窗
        const total = db.prepare('SELECT COUNT(*) as count FROM complaints').get() as {
          count: number
        }
        if (total && total.count > 0) {
          new Notification({
            title: 'OzonAssist 处理完成',
            body: '所有投诉任务已全部处理完毕。',
            silent: false
          }).show()

          // 同时弹出一个系统级确认弹窗
          const focusedWindow = BrowserWindow.getFocusedWindow() || BrowserWindow.getAllWindows()[0]
          if (focusedWindow) {
            dialog.showMessageBox(focusedWindow, {
              type: 'info',
              title: '任务完成',
              message: '所有投诉任务已全部处理完毕',
              detail: '当前所有 SKU 已处理完成，你可以继续导入新数据或检查执行反馈。',
              buttons: ['确定'],
              defaultId: 0
            })
          }

          logger.info('[Server] All tasks completed, notification and dialog shown.')
        }
      }
    } catch (error) {
      logger.error('[Server] Failed to check completion status:', error)
    }
  }

  /**
   * 清理超时的处理中任务
   * 将超过 2 分钟未更新状态的 processing 任务标记为 timeout
   */
  private cleanupTimeoutTasks(): void {
    try {
      const db = databaseService.getDatabase()
      const result = db
        .prepare(
          `
        UPDATE complaints 
        SET status = 'timeout', 
            remark = '任务超时', 
            updated_at = CURRENT_TIMESTAMP 
        WHERE status = 'processing' 
        AND updated_at < datetime('now', '-2 minutes')
      `
        )
        .run()

      if (result.changes > 0) {
        logger.info(`[Server] Cleaned up ${result.changes} timeout tasks.`)
        this.broadcastDatabaseUpdate()
      }
    } catch (error) {
      logger.error('[Server] Failed to cleanup timeout tasks:', error)
    }
  }

  /**
   * 启动服务器
   */
  async start(
    port: number | string
  ): Promise<{ success: boolean; message?: string; error?: string }> {
    return new Promise((resolve) => {
      if (this.serverInstance) {
        resolve({ success: false, error: 'Server is already running' })
        return
      }

      const app = express()

      // 全局请求日志中间件
      app.use((req, _res, next) => {
        logger.info(`[Server] ${req.method} ${req.url}`)
        next()
      })

      // 允许跨域请求（供浏览器插件等使用）
      app.use((req, res, next) => {
        res.header('Access-Control-Allow-Origin', '*')
        res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept')
        res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PATCH, PUT, DELETE')

        // 处理预检请求 (OPTIONS)
        if (req.method === 'OPTIONS') {
          res.sendStatus(200)
          return
        }
        next()
      })

      app.get('/', (_req, res) => {
        res.send('Local server is running!')
      })

      app.get('/api/status', (_req, res) => {
        res.json({ status: 'ok', timestamp: new Date().toISOString() })
      })

      // 上报警报/任务失败接口
      app.get('/api/task/failed', (_req, res) => {
        try {
          logger.warn('[API] Received failure report from plugin.')

          // 仅显示系统通知，不操作数据库记录
          new Notification({
            title: 'OzonAssist 任务异常',
            body: '浏览器插件上报了一个错误。这可能是由于 Ozon 页面结构变更或网络闪断引起的。',
            silent: false
          }).show()
          res.json({ success: true, message: 'Notification and Dialog shown' })
        } catch (error) {
          logger.error('[API] Error (task failed):', error)
          res.status(500).json({ success: false, error: String(error) })
        }
      })

      // 随机获取一张可用的图片（优化算法，避免全表扫描）
      app.get('/api/image/random', (_req, res) => {
        try {
          logger.info('[API] Request: Get random image')
          const db = databaseService.getDatabase()

          // 使用高效的随机算法：先获取总数和 ID 范围，然后随机选择
          const meta = db
            .prepare('SELECT COUNT(*) as total, MIN(id) as minId, MAX(id) as maxId FROM images')
            .get() as any

          if (!meta || meta.total === 0) {
            logger.warn('[API] No images available in database')
            res.json({ success: false, message: 'No images available' })
            return
          }

          // 在 ID 范围内随机选择，如果未命中则递归向后查找
          const randomId = Math.floor(Math.random() * (meta.maxId - meta.minId + 1)) + meta.minId
          const image = db
            .prepare('SELECT * FROM images WHERE id >= ? LIMIT 1')
            .get(randomId) as any

          if (image) {
            const baseUrl = `http://127.0.0.1:${this.activePort}`
            const fullUrl = `${baseUrl}/images/${basename(image.file_path)}`
            logger.info(`[API] Found random image: ID=${image.id}, Name=${image.file_name}`)
            res.json({
              success: true,
              data: {
                id: image.id,
                fileName: image.file_name,
                filePath: image.file_path,
                // 返回完整的 URL 供浏览器直接使用
                url: fullUrl
              }
            })
            return
          } else {
            logger.warn('[API] No images available in database')
            res.json({ success: false, message: 'No images available' })
            return
          }
        } catch (error) {
          logger.error('[API] Error (random image):', error)
          res.status(500).json({ success: false, error: String(error) })
          return
        }
      })

      // 获取一条未处理的投诉（原子化操作，防止并发重复读取）
      app.get('/api/complaint/unprocessed', (_req, res) => {
        try {
          logger.info('[API] Request: Get unprocessed complaint')

          // 先清理超时任务
          this.cleanupTimeoutTasks()

          const db = databaseService.getDatabase()

          // 使用事务确保原子性：查询 + 更新必须是原子操作
          const transaction = db.transaction(() => {
            // 1. 找到第一条 pending 状态的记录并锁定（使用 LIMIT 1）
            const pending = db
              .prepare(
                `
              SELECT id 
              FROM complaints 
              WHERE status = 'pending' 
              ORDER BY created_at ASC 
              LIMIT 1
            `
              )
              .get() as { id: number } | undefined

            if (!pending) return null

            // 2. 立即更新状态为 processing（原子操作，防止其他请求读到同一条）
            const updateResult = db
              .prepare(
                `
              UPDATE complaints 
              SET status = 'processing', 
                  started_at = CURRENT_TIMESTAMP, 
                  updated_at = CURRENT_TIMESTAMP 
              WHERE id = ? AND status = 'pending'
            `
              )
              .run(pending.id)

            // 3. 二次确认更新成功（防止状态被其他并发请求改变）
            if (updateResult.changes === 0) {
              logger.warn(`[API] Race condition detected: SKU already taken by another request`)
              return null
            }

            // 4. 获取完整数据（此时状态已是 processing，不会被其他请求读到）
            const complaint = db
              .prepare(
                `
              SELECT c.*, i.file_path as image_path 
              FROM complaints c 
              LEFT JOIN images i ON c.image_id = i.id 
              WHERE c.id = ?
            `
              )
              .get(pending.id)

            return complaint
          })

          const complaint = transaction()

          if (complaint) {
            // 如果有图片，构造完整的访问 URL
            if (complaint.image_path) {
              const baseUrl = `http://127.0.0.1:${this.activePort}`
              complaint.image_url = `${baseUrl}/images/${basename(complaint.image_path)}`
            }

            logger.info(`[API] Found complaint SKU=${complaint.sku}. Marked as 'processing'.`)
            this.broadcastDatabaseUpdate()
            res.json({ success: true, data: complaint })
            return
          } else {
            logger.info('[API] No pending complaints found.')
            // 这里检查完成并通知
            this.checkAndNotifyCompletion()
            res.json({ success: false, message: 'No pending complaints' })
            return
          }
        } catch (error) {
          logger.error('[API] Error (unprocessed):', error)
          res.status(500).json({ success: false, error: String(error) })
          return
        }
      })

      // 更新投诉状态 (通过 SKU)
      app.post('/api/complaint/:sku/status', express.json(), (req, res) => {
        try {
          const { sku } = req.params
          const { status, remark } = req.body
          logger.info(`[API] Request: Update status - SKU=${sku}, Status=${status}`)

          const db = databaseService.getDatabase()

          const result = db
            .prepare(
              `
            UPDATE complaints 
            SET status = ?, 
                remark = ?, 
                updated_at = CURRENT_TIMESTAMP 
            WHERE sku = ?
          `
            )
            .run(status, remark || '', sku)

          if (result.changes > 0) {
            logger.info(`[API] Successfully updated status for SKU: ${sku} to ${status}`)
            this.broadcastDatabaseUpdate()
            res.json({ success: true })
            return
          } else {
            logger.warn(`[API] Update status FAILED: SKU ${sku} not found`)
            res.json({ success: false, message: 'Complaint not found' })
            return
          }
        } catch (error) {
          logger.error('[API] Error (update status):', error)
          res.status(500).json({ success: false, error: String(error) })
          return
        }
      })

      // 更新投诉关联的图片 ID（带有效性验证）
      app.post('/api/complaint/:sku/image', express.json(), (req, res) => {
        try {
          const { sku } = req.params
          const { imageId } = req.body
          logger.info(`[API] Request: Link image - SKU=${sku}, ImageID=${imageId}`)

          const skuStr = String(sku)
          const numericImageId = imageId ? Number(imageId) : null
          const db = databaseService.getDatabase()

          // 验证图片 ID 是否存在（如果提供了 imageId）
          if (numericImageId !== null) {
            const imageExists = db.prepare('SELECT 1 FROM images WHERE id = ?').get(numericImageId)
            if (!imageExists) {
              logger.warn(`[API] Link image FAILED: ImageID ${numericImageId} does not exist`)
              res.json({ success: false, message: 'Image not found' })
              return
            }
          }

          const result = db
            .prepare(
              `
            UPDATE complaints 
            SET image_id = ?, 
                updated_at = CURRENT_TIMESTAMP 
            WHERE sku = ?
          `
            )
            .run(numericImageId, skuStr)

          if (result.changes > 0) {
            logger.info(`[API] Successfully linked ImageID=${imageId} to SKU=${skuStr}`)
            this.broadcastDatabaseUpdate()
            res.json({ success: true })
            return
          } else {
            logger.warn(`[API] Link image FAILED: SKU ${skuStr} not found`)
            res.json({ success: false, message: 'Complaint not found' })
            return
          }
        } catch (error) {
          logger.error('[API] Error (update image):', error)
          res.status(500).json({ success: false, error: String(error) })
          return
        }
      })

      // 静态文件服务：允许访问图片
      const imagesDir = join(getUserDataPath(), 'images')
      app.use('/images', express.static(imagesDir))

      const server = app.listen(Number(port), '127.0.0.1', () => {
        const msg = `Local server started at http://127.0.0.1:${port}`
        this.activePort = Number(port)
        logger.info(msg)
        this.broadcastStatus()
        resolve({ success: true, message: msg })
      })

      // 启用 SO_REUSEADDR 允许端口快速重用
      server.once('listening', () => {
        if (server.address() && typeof server.address() === 'object') {
          server.setMaxListeners(10)
        }
      })

      server.once('error', (err: any) => {
        logger.error('Server error:', err)
        server.close()
        this.serverInstance = null
        this.broadcastStatus()

        // 处理特定错误类型
        if (err.code === 'EADDRINUSE') {
          logger.warn(`Port ${port} is in use, trying to recover...`)
          // 等待一段时间后重试
          setTimeout(() => {
            resolve({
              success: false,
              error: `端口 ${port} 被占用。请关闭占用该端口的应用程序后重试`
            })
          }, 1000)
        } else {
          resolve({ success: false, error: String(err) })
        }
      })

      this.serverInstance = server

      // 启动定时清理超时任务 (每 2 分钟检查一次)
      this.cleanupInterval = setInterval(
        () => {
          this.cleanupTimeoutTasks()
        },
        2 * 60 * 1000
      )
    })
  }

  /**
   * 停止服务器
   */
  async stop(): Promise<{ success: boolean; error?: string }> {
    return new Promise((resolve) => {
      // 清除定时器
      if (this.cleanupInterval) {
        clearInterval(this.cleanupInterval)
        this.cleanupInterval = null
      }

      if (!this.serverInstance) {
        resolve({ success: true })
        return
      }

      const server = this.serverInstance
      this.serverInstance = null
      this.activePort = null

      // 设置超时强制关闭
      const closeTimeout = setTimeout(() => {
        logger.warn('Server close timeout, force destroying connections')
        server.closeAllConnections?.()
      }, 5000)

      server.close((err) => {
        clearTimeout(closeTimeout)
        if (err) {
          logger.error('Failed to stop server:', err)
          resolve({ success: false, error: String(err) })
          return
        }
        logger.info('Local server stopped')
        this.broadcastStatus()
        resolve({ success: true })
      })
    })
  }

  /**
   * 检查服务器是否运行中
   */
  isRunning(): boolean {
    return this.serverInstance !== null
  }

  /**
   * 获取服务器基础 URL
   */
  getUrl(): string | null {
    if (!this.activePort) return null
    return `http://127.0.0.1:${this.activePort}`
  }
}

export const serverService = new ServerService()
