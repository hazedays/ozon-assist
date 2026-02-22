/**
 * OzonAssist - Ozon 卖家自动化维权工具
 *
 * 功能：
 * - 创建和管理应用窗口
 * - 单实例应用控制
 * - 管理应用生命周期
 * - 集成本地服务器服务
 */

import { app, shell, BrowserWindow, nativeTheme, protocol, net, ipcMain } from 'electron'
import { join } from 'path'
import { pathToFileURL } from 'url'
import { electronApp, is } from '@electron-toolkit/utils'
import dotenv from 'dotenv'

// 加载环境变量配置
dotenv.config()

import icon from '../../resources/icon.png?asset'
import { logger, initRendererLogging } from './core/logger'
import { databaseService, serverService } from './services'
import { databaseRendererService } from './services/renderer/database'
import { serverRendererService } from './services/renderer/server'
import { APP_CONSTANTS } from '@shared/constants'

/** 主窗口实例 */
let mainWindow: BrowserWindow | null = null

// ==================== 法律与支持窗口管理 ====================

/** 储存已打开的二级窗口实例，避免重复打开 */
const subWindows = new Map<string, BrowserWindow>()

/**
 * 创建并管理独立的法律/支持窗口
 * @param route 路由路径 (例如: 'terms', 'privacy', 'support')
 */
function createSubWindow(route: string): void {
  const windowKey = `legal-${route}`

  // 如果窗口已打开且未销毁，则聚焦该窗口
  if (subWindows.has(windowKey)) {
    const existingWin = subWindows.get(windowKey)
    if (existingWin && !existingWin.isDestroyed()) {
      if (existingWin.isMinimized()) existingWin.restore()
      existingWin.focus()
      return
    }
  }

  // 创建一个精简的辅助窗口
  const subWin = new BrowserWindow({
    width: 800,
    height: 700,
    minWidth: 480,
    minHeight: 500,
    show: false,
    autoHideMenuBar: true,
    title: 'Ozon Assist',
    icon,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      devTools: is.dev
    }
  })

  subWindows.set(windowKey, subWin)

  // 窗口关闭时从缓存中移除
  subWin.on('closed', () => {
    subWindows.delete(windowKey)
  })

  // 资源就绪后显示
  subWin.once('ready-to-show', () => {
    subWin.show()
  })

  // 针对不同环境加载对应的 URL 或本地文件 (使用 Hash 路由定位到 /legal/子路径)
  const baseUrl =
    is.dev && process.env['ELECTRON_RENDERER_URL']
      ? process.env['ELECTRON_RENDERER_URL']
      : `file://${join(__dirname, '../renderer/index.html')}`

  subWin.loadURL(`${baseUrl}#/legal/${route}`)
}

/** 注册跨进程通信监听：打开法律相关窗口 */
ipcMain.on('open-sub-window', (_event, route: string) => {
  createSubWindow(route)
})

// ==================== 单实例控制 ====================

/** 请求单实例锁，确保应用只运行一个实例 */
const gotTheLock = app.requestSingleInstanceLock()

if (!gotTheLock) {
  // 如果获取锁失败，说明已有实例在运行，直接退出
  app.quit()
} else {
  // 当第二个实例尝试启动时，聚焦到第一个实例的窗口
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore()
      mainWindow.focus()
    }
  })
}

// ==================== 窗口管理 ====================

/**
 * 创建主应用窗口
 * - 支持单窗口模式，如果窗口已存在则直接显示
 * - 配置窗口尺寸和预加载脚本
 * - 开发模式下自动打开开发者工具
 */
function createWindow(): void {
  // 创建新的浏览器窗口
  mainWindow = new BrowserWindow({
    width: 900,
    height: 670,
    minWidth: 900,
    minHeight: 670,
    maxWidth: 1600,
    maxHeight: 1200,
    show: false, // 先隐藏，等待 ready-to-show 事件
    autoHideMenuBar: true, // 自动隐藏菜单栏
    icon, // 设置应用图标
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false, // 禁用沙箱以访问 Node.js API
      devTools: true // 允许使用开发者工具
    }
  })

  // 窗口准备好后再显示，避免闪烁
  mainWindow.on('ready-to-show', () => {
    mainWindow?.show()
    // 开发模式下自动打开开发者工具
    if (is.dev) {
      mainWindow?.webContents.openDevTools()
    }
  })

  // 窗口最小化时隐藏（可选行为）
  mainWindow.on('minimize', () => {
    mainWindow?.hide()
  })

  // 在外部浏览器中打开链接
  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // 加载应用页面
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// ==================== 应用生命周期 ====================

/**
 * 应用准备就绪
 * - 设置应用用户模型 ID
 * - 创建主窗口
 * - 初始化渲染进程日志支持
 */
app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.ozon_assist.app')
  nativeTheme.themeSource = 'light'

  // 注册本地资源协议，允许加载本地图片
  protocol.handle('local-resource', (request) => {
    const url = request.url.replace(/^local-resource:\/\//, '')
    // 处理解码后的路径
    const decodedUrl = decodeURI(url)
    return net.fetch(pathToFileURL(decodedUrl).toString())
  })

  // 初始化渲染进程日志记录
  initRendererLogging()

  // 初始化数据库连接
  databaseService.initDB()
  // 初始化数据库 IPC 服务
  databaseRendererService.initRendererDatabase()
  // 初始化服务器 IPC 服务
  serverRendererService.initRendererServer()
  // 启动本地服务器
  serverService
    .start(APP_CONSTANTS.DEFAULT_SERVER_PORT.toString())
    .then(() => {
      logger.info('Server started successfully')
    })
    .catch((error) => {
      logger.error('Error starting server:', error)
    })

  createWindow()
  logger.info('App is starting...')
})

/**
 * 应用即将退出
 * - 标记退出状态，允许窗口正常关闭
 * - 停止本地服务器
 * - 清理资源
 */
app.on('before-quit', async () => {
  logger.info('App is closing, stopping server...')
  try {
    await serverService.stop()
    logger.info('Server stopped successfully')
  } catch (error) {
    logger.error('Error stopping server:', error)
  }
})

/**
 * 所有窗口关闭
 * - macOS：保持应用运行
 * - 其他平台：退出应用
 */
app.on('window-all-closed', () => {
  app.quit()
})

/**
 * macOS：点击 Dock 图标时激活应用
 * - 如果窗口存在则显示
 * - 否则创建新窗口
 */
app.on('activate', () => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    // 窗口存在，显示它
    mainWindow.show()
    mainWindow.focus()
  }
})
