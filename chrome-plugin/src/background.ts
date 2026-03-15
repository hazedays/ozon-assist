/**
 * Ozon Auto Complaint - Background Service Worker (MV3 完整版)
 */

const API_BASE = 'http://127.0.0.1:8972/api'

// ====== 创建右键菜单 ======
function createContextMenu() {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: 'ozon-start-auto-complaint',
      title: '启动 Ozon 自动化',
      contexts: ['page'],
      documentUrlPatterns: ['https://*.ozon.ru/*']
    })
    chrome.contextMenus.create({
      id: 'ozon-stop-auto-complaint',
      title: '停止 Ozon 自动化',
      contexts: ['page'],
      documentUrlPatterns: ['https://*.ozon.ru/*']
    })
  })
}

// 安装/启动时注册菜单
chrome.runtime.onInstalled.addListener(createContextMenu)
chrome.runtime.onStartup.addListener(createContextMenu)
createContextMenu()

// ====== 安全发送消息 ======
async function sendOrInject(tabId: number, action: string) {
  if (!tabId) return
  try {
    await chrome.tabs.sendMessage(tabId, { action })
  } catch (error) {
    console.warn(`[Background] ${action} 消息发送失败: ${error}, 尝试注入 content script...`)
    try {
      await chrome.scripting.executeScript({
        target: { tabId },
        files: ['content.js']
      })
      await new Promise((r) => setTimeout(r, 300))
      await chrome.tabs.sendMessage(tabId, { action })
      console.log(`[Background] ${action} 成功触发`)
    } catch (injectError) {
      console.error(`[Background] 注入 content script 失败: ${injectError}`)
    }
  }
}

// ====== 右键菜单点击 ======
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (!tab || !tab.id) return
  if (info.menuItemId === 'ozon-start-auto-complaint') {
    await sendOrInject(tab.id, 'start-auto-complaint')
  } else if (info.menuItemId === 'ozon-stop-auto-complaint') {
    await sendOrInject(tab.id, 'stop-auto-complaint')
  }
})

// ====== 后台请求处理 ======
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (!request || !request.action) return false

  const url = request.url
    ? request.url.startsWith('http')
      ? request.url
      : `${API_BASE}${request.url}`
    : ''

  if (request.action === 'get') {
    fetch(url, { method: 'GET', headers: { 'Content-Type': 'application/json' } })
      .then((resp) => resp.json())
      .then((data) => sendResponse(data))
      .catch((error) => sendResponse({ success: false, error: error.message }))
    return true
  }

  if (request.action === 'post') {
    fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request.data || {})
    })
      .then((resp) => resp.json())
      .then((data) => sendResponse(data))
      .catch((error) => sendResponse({ success: false, error: error.message }))
    return true
  }

  if (request.action === 'get-image') {
    fetch(url, { method: 'GET', headers: { 'Content-Type': 'application/json' } })
      .then((resp) => resp.json())
      .then((json) => {
        if (!json.success || !json.data?.url) {
          throw new Error('Invalid API response: ' + JSON.stringify(json))
        }
        return fetch(json.data.url)
      })
      .then((imageResp) => {
        if (!imageResp.ok) throw new Error(`Download failed: ${imageResp.status}`)
        return imageResp.blob()
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
      .catch((error) => sendResponse({ success: false, error: error.message }))
    return true
  }
})
