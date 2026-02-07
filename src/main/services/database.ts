/**
 * 数据库服务 - 整合数据库管理和 IPC 处理
 */

import Database from 'better-sqlite3'
import { existsSync, mkdirSync } from 'fs'
import { dirname, join } from 'path'
import { BrowserWindow } from 'electron'
import { logger } from '@main/core/logger'
import { getUserDataPath } from '@main/utils'

class DatabaseService {
  private db: Database.Database | null = null
  private isInitializing = false

  /**
   * 广播数据库刷新通知给所有渲染进程
   */
  notifyUpdate(): void {
    // 强制增加一个小延迟，确保数据库写入彻底完成 (30ms 足够 SQLite 写入并释放锁)
    setTimeout(() => {
      const allWindows = BrowserWindow.getAllWindows()
      logger.info(`[Database] Broadcasting database:updated to ${allWindows.length} windows`)

      if (allWindows.length === 0) {
        logger.warn('[Database] No windows found to broadcast update')
        return
      }

      allWindows.forEach((win) => {
        if (!win.isDestroyed()) {
          win.webContents.send('database:updated')
        }
      })
    }, 100)
  }

  getPath(): string {
    return join(getUserDataPath(), 'data', 'database.sqlite')
  }

  /**
   * 初始化数据库连接
   * 应在应用启动时调用一次
   */
  initDB(): Database.Database {
    if (this.db) return this.db

    // 如果正在初始化，这不应该发生，因为这是同步方法
    // 但为了完整性，我们在这里捕获任何潜在问题
    if (this.isInitializing) {
      // 这只在极少数情况下发生，通常不会进入这个分支
      throw new Error('Database initialization already in progress')
    }

    this.isInitializing = true

    try {
      // 使用默认数据库路径
      const dbPath = this.getPath()
      logger.info(`Attempting to open database at: ${dbPath}`)

      // 确保目录存在
      const dbDir = dirname(dbPath)
      if (!existsSync(dbDir)) {
        logger.info(`Creating database directory: ${dbDir}`)
        mkdirSync(dbDir, { recursive: true })
      }

      // 使用 readonly: false 确保数据库可读写
      logger.info('Initializing better-sqlite3 instance...')
      this.db = new Database(dbPath, { readonly: false })
      logger.info('better-sqlite3 instance initialized successfully')

      // 官方推荐：启用 WAL 模式以提高性能
      // WAL (Write-Ahead Logging) 允许并发读取，提高写入性能
      this.db.pragma('journal_mode = WAL')

      // 官方推荐的其他性能优化设置
      this.db.pragma('synchronous = NORMAL') // 比 FULL 更快但仍然安全
      this.db.pragma('cache_size = -64000') // 64MB 缓存

      this.initTables()
      this.validateDataIntegrity()

      return this.db
    } catch (error) {
      logger.error('Failed to connect to database:', error)
      logger.error('Troubleshooting: Check better-sqlite3 documentation for native module issues')
      throw error
    } finally {
      this.isInitializing = false
    }
  }

  /**
   * 获取数据库连接实例
   * 如果未初始化则抛出错误
   */
  getDatabase(): Database.Database {
    if (!this.db) {
      throw new Error('Database not initialized. Call init() first.')
    }
    return this.db
  }

  /**
   * 初始化表结构
   * 对外开放，支持手动触发数据库表初始化
   * 可安全地多次调用，使用 CREATE TABLE IF NOT EXISTS
   */
  initTables(): void {
    if (!this.db) {
      logger.warn('Database not initialized, cannot create tables')
      return
    }

    // 启用外键约束（SQLite 默认关闭）
    this.db.pragma('foreign_keys = ON')

    // 数据清洗：清理已存在的重复 SKU（保留 ID 最小的一个）
    // 检查表是否存在
    const tableExists = this.db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='complaints'")
      .get()
    if (tableExists) {
      this.db.exec(`
        DELETE FROM complaints 
        WHERE id NOT IN (
          SELECT MIN(id) 
          FROM complaints 
          GROUP BY sku
        )
      `)
    }

    this.db.exec(`
      -- 投诉记录表
      -- 存储从 TXT 文件导入的 SKU 数据和对应的投诉信息
      CREATE TABLE IF NOT EXISTS complaints (
        id INTEGER PRIMARY KEY AUTOINCREMENT,          -- 投诉记录的唯一标识符
        sku TEXT UNIQUE,                                -- 商品 SKU 码 (唯一标识)
        reason TEXT,                                    -- 投诉原因描述
        status TEXT DEFAULT 'pending',                  -- 投诉状态
        image_id INTEGER,                               -- 关联的图片ID
        started_at DATETIME,                            -- 任务开始执行的时间
        remark TEXT,                                    -- 备注信息
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP, -- 记录创建时间
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP -- 记录更新时间
      );

      -- 确保现有表也有唯一索引
      CREATE UNIQUE INDEX IF NOT EXISTS idx_complaints_sku ON complaints(sku);
    `)

    this.db.exec(`
      -- 图片文件表
      -- 存储投诉相关的图片文件信息
      CREATE TABLE IF NOT EXISTS images (
        id INTEGER PRIMARY KEY AUTOINCREMENT,          -- 图片记录的唯一标识符
        file_path TEXT NOT NULL,                        -- 图片本地存储路径
        file_name TEXT NOT NULL,                        -- 原始文件名
        file_size INTEGER,                              -- 文件大小（字节）
        file_md5 TEXT UNIQUE,                           -- 文件 MD5 哈希 (防止重复)
        mime_type TEXT,                                 -- 文件MIME类型
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP -- 记录创建时间
      );

      -- 确保 MD5 唯一索引存在
      CREATE UNIQUE INDEX IF NOT EXISTS idx_images_md5 ON images(file_md5);

      -- 创建索引以加速统计和查询（解决 COUNT(*) 慢查询问题）
      CREATE INDEX IF NOT EXISTS idx_complaints_status ON complaints(status);
    `)

    // 检查并自动升级数据库架构 (为旧表增加 MD5 列)
    const tableInfo = this.db.prepare('PRAGMA table_info(images)').all() as any[]
    const hasMd5 = tableInfo.some((col) => col.name === 'file_md5')
    if (!hasMd5) {
      try {
        this.db.exec('ALTER TABLE images ADD COLUMN file_md5 TEXT UNIQUE')
        logger.info('Database schema updated: added file_md5 column to images table')
      } catch (e) {
        logger.warn('Failed to add file_md5 column (might already exist):', e)
      }
    }

    // 为 complaints 表增加 started_at 列
    const complaintTableInfo = this.db.prepare('PRAGMA table_info(complaints)').all() as any[]
    const hasStartedAt = complaintTableInfo.some((col) => col.name === 'started_at')
    if (!hasStartedAt) {
      try {
        this.db.exec('ALTER TABLE complaints ADD COLUMN started_at DATETIME')
        logger.info('Database schema updated: added started_at column to complaints table')
      } catch (e) {
        logger.warn('Failed to add started_at column:', e)
      }
    }
  }

  /**
   * 数据完整性与准确性校验
   * 应用启动时执行，修复异常的业务逻辑状态
   */
  validateDataIntegrity(): void {
    if (!this.db) return

    try {
      logger.info('Starting database integrity and accuracy check...')

      // 1. 修复异常状态：应用启动时，不应该有任何任务处于 'processing' 状态
      // 如果有，说明是上次应用异常退出或关闭时遗留的，将其标记为 'timeout'
      const processingCount = (
        this.db
          .prepare("SELECT COUNT(*) as count FROM complaints WHERE status = 'processing'")
          .get() as any
      ).count

      if (processingCount > 0) {
        logger.warn(`Found ${processingCount} stuck 'processing' tasks, resetting to 'timeout'`)
        this.db.exec("UPDATE complaints SET status = 'timeout' WHERE status = 'processing'")
      }

      // 2. 清理失效的图片引用
      // 如果 complaint 关联的 image_id 在 images 表中不存在，重置为 NULL
      this.db.exec(`
        UPDATE complaints 
        SET image_id = NULL 
        WHERE image_id IS NOT NULL 
        AND image_id NOT IN (SELECT id FROM images)
      `)

      // 3. 检查是否有 SKU 为空的记录并清理
      this.db.exec("DELETE FROM complaints WHERE sku IS NULL OR sku = ''")

      logger.info('Database integrity check completed successfully')
    } catch (error) {
      logger.error('Error during database integrity check:', error)
    }
  }

  /**
   * 关闭数据库
   */
  close(): void {
    if (this.db) {
      this.db.close()
      this.db = null
    }
  }
}

export const databaseService = new DatabaseService()
