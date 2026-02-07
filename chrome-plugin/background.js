/**
 * Ozon Auto Complaint - Background Service Worker
 */

// 创建右键菜单
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'ozon-submit-complaint',
    title: '提交 Ozon 投诉',
    contexts: ['page'],
    documentUrlPatterns: ['https://*.ozon.ru/*']
  })
})

// 处理右键菜单点击
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === 'ozon-submit-complaint') {
    try {
      // 直接发送消息，不重复注入脚本
      await chrome.tabs.sendMessage(tab.id, { action: 'submitComplaint' })
    } catch (error) {
      // 如果失败（脚本未加载），则注入脚本
      console.log('Content script not loaded, injecting...')
      try {
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: ['content.js']
        })
        await new Promise((resolve) => setTimeout(resolve, 100))
        await chrome.tabs.sendMessage(tab.id, { action: 'submitComplaint' })
      } catch (injectError) {
        console.error('Failed to inject script:', injectError)
      }
    }
  }
})

// 处理来自 content script 的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // 基础防御
  if (!request || !request.action) return false

  // 构造 URL (仅当存在 url 属性时)
  let url = ''
  if (request.url) {
    url = request.url.startsWith('http') ? request.url : `http://127.0.0.1:8972/api${request.url}`
  }

  console.log(`[Background] 收到指令: ${request.action}`, request.url ? `目标 URL: ${url}` : '')

  if (request.action === 'get') {
    fetch(url, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    })
      .then((resp) => resp.json())
      .then((data) => sendResponse(data))
      .catch((error) => {
        console.error('[Background] GET 失败:', error)
        sendResponse({ success: false, error: error.message })
      })
    return true
  }

  if (request.action === 'post') {
    console.log('[Background] 执行 POST 数据:', request.data)
    fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request.data || {})
    })
      .then((resp) => resp.json())
      .then((data) => {
        console.log('[Background] POST 响应成功:', data)
        sendResponse(data)
      })
      .catch((error) => {
        console.error('[Background] POST 失败:', error)
        sendResponse({ success: false, error: error.message })
      })
    return true
  }

  if (request.action === 'fetchImage') {
    fetch(url)
      .then((resp) => {
        if (!resp.ok) throw new Error(`Download failed: ${resp.status}`)
        return resp.blob()
      })
      .then((blob) => {
        const reader = new FileReader()
        reader.onloadend = () => {
          sendResponse({
            success: true,
            data: reader.result,
            type: blob.type
          })
        }
        reader.onerror = () => sendResponse({ success: false, error: 'File reading failed' })
        reader.readAsDataURL(blob)
      })
      .catch((error) => {
        console.error('[Background] fetchImage 失败:', error)
        sendResponse({ success: false, error: error.message })
      })
    return true
  }
})
