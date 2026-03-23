<template>
  <div class="max-w-6xl mx-auto flex flex-col gap-5 p-6">
    <!-- 系统信息 -->
    <div class="rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
      <div class="flex items-center gap-2">
        <i class="ri-settings-3-line text-slate-500"></i>
        <h2 class="text-sm font-bold text-slate-800">系统与更新</h2>
      </div>
      <p class="mt-2 text-xs text-slate-500">管理应用版本、自动更新、系统日志及数据目录</p>
    </div>

    <!-- 版本与更新卡片 -->
    <div
      class="rounded-2xl border border-slate-200 bg-gradient-to-br from-blue-50 to-indigo-50 px-6 py-6 shadow-sm"
    >
      <div class="flex flex-col gap-6">
        <!-- 当前版本 -->
        <div class="grid grid-cols-2 gap-4 md:grid-cols-3">
          <div class="rounded-xl border border-slate-200 bg-white p-4">
            <p class="text-xs font-bold uppercase tracking-widest text-slate-400">当前版本</p>
            <p class="mt-2 text-2xl font-black text-slate-800">{{ currentVersion }}</p>
          </div>
          <div class="rounded-xl border border-slate-200 bg-white p-4">
            <p class="text-xs font-bold uppercase tracking-widest text-slate-400">运行环境</p>
            <p class="mt-2 text-sm font-bold text-slate-700">
              {{ isPackaged ? '生产环境' : '开发环境' }}
            </p>
          </div>
          <div class="rounded-xl border border-slate-200 bg-white p-4">
            <p class="text-xs font-bold uppercase tracking-widest text-slate-400">自动更新</p>
            <p
              class="mt-2 text-sm font-bold"
              :class="isPackaged ? 'text-emerald-600' : 'text-slate-500'"
            >
              {{ isPackaged ? '已启用' : '已禁用' }}
            </p>
          </div>
        </div>

        <!-- 检查更新区域 -->
        <div class="rounded-xl border border-slate-200 bg-white p-5">
          <div class="flex flex-col gap-4">
            <!-- 自动更新开关 -->
            <div
              v-if="isPackaged"
              class="flex items-center justify-between pb-4 border-b border-slate-100"
            >
              <div>
                <h3 class="font-bold text-slate-800">自动检查更新</h3>
                <p class="mt-1 text-xs text-slate-500">
                  当启用时，应用将在启动和工作时定期检查新版本
                </p>
              </div>
              <div class="flex items-center gap-2">
                <button
                  @click="toggleAutoUpdate"
                  :disabled="savingConfig"
                  class="relative inline-flex h-8 w-14 items-center rounded-full transition-colors"
                  :class="
                    autoUpdateEnabled
                      ? 'bg-blue-500 hover:bg-blue-600'
                      : 'bg-slate-200 hover:bg-slate-300'
                  "
                >
                  <span
                    class="inline-block h-6 w-6 transform rounded-full bg-white transition-transform shadow-sm"
                    :class="autoUpdateEnabled ? 'translate-x-7' : 'translate-x-1'"
                  ></span>
                </button>
                <span v-if="savingConfig" class="text-xs text-slate-500"> 保存中... </span>
              </div>
            </div>

            <div class="flex items-center justify-between">
              <div>
                <h3 class="font-bold text-slate-800">检查更新</h3>
                <p class="mt-1 text-xs text-slate-500">
                  {{ isPackaged ? '点击下方按钮手动检查最新版本' : '开发环境禁用自动更新' }}
                </p>
              </div>
              <div v-if="checkingForUpdate" class="flex items-center gap-2">
                <span class="inline-block h-2 w-2 rounded-full bg-orange-500 animate-pulse"></span>
                <span class="text-xs font-bold text-orange-600">检查中...</span>
              </div>
            </div>

            <!-- 更新状态信息 -->
            <div v-if="updateStatus" class="rounded-lg border px-4 py-3" :class="updateStatusClass">
              <p class="text-xs font-bold">{{ updateStatusLabel }}</p>
              <p v-if="updateStatus?.payload?.version" class="mt-1 text-xs text-slate-600">
                {{ updateStatus?.status === 'available' ? '可用版本: ' : '最新版本: ' }}
                <span class="font-bold">{{ updateStatus?.payload?.version }}</span>
              </p>
              <p v-if="updateStatus?.payload?.releaseDate" class="mt-1 text-xs text-slate-600">
                发布日期: {{ formatDate(updateStatus?.payload?.releaseDate) }}
              </p>

              <!-- 发布说明/更新日志 -->
              <div
                v-if="updateStatus?.payload?.releaseNotes"
                class="mt-3 pt-3 border-t"
                :class="
                  updateStatus?.status === 'available' || updateStatus?.status === 'downloaded'
                    ? 'border-blue-200'
                    : 'border-slate-200'
                "
              >
                <p class="text-[10px] font-bold uppercase tracking-widest text-slate-600 mb-2">
                  更新说明
                </p>
                <div
                  class="text-xs text-slate-700 leading-relaxed whitespace-pre-wrap break-words max-h-48 overflow-y-auto"
                >
                  {{ updateStatus?.payload?.releaseNotes }}
                </div>
              </div>
            </div>

            <!-- 下载进度 -->
            <div v-if="downloadProgress > 0 && downloadProgress < 100" class="flex flex-col gap-2">
              <div class="flex items-center justify-between">
                <span class="text-xs font-bold text-slate-700">下载进度</span>
                <span class="text-xs font-bold text-slate-600"
                  >{{ downloadProgress.toFixed(0) }}%</span
                >
              </div>
              <div class="h-2 w-full rounded-full bg-slate-200 overflow-hidden">
                <div
                  class="h-full bg-gradient-to-r from-blue-500 to-indigo-600 transition-all"
                  :style="{ width: `${downloadProgress}%` }"
                ></div>
              </div>
              <p v-if="updateStatus?.payload?.bytesPerSecond" class="text-[10px] text-slate-500">
                速度:
                {{ ((updateStatus?.payload?.bytesPerSecond || 0) / 1024 / 1024).toFixed(1) }} MB/s
              </p>
            </div>

            <!-- 操作按钮组 -->
            <div class="flex flex-wrap items-center gap-3">
              <button
                :disabled="!isPackaged || checkingForUpdate || updateStatus?.status === 'checking'"
                @click="handleCheckForUpdates"
                class="px-6 py-2.5 rounded-lg font-bold text-sm transition-all flex items-center gap-2"
                :class="
                  !isPackaged || checkingForUpdate || updateStatus?.status === 'checking'
                    ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                    : 'bg-blue-500 text-white hover:bg-blue-600 shadow-lg shadow-blue-200'
                "
              >
                <i
                  :class="checkingForUpdate ? 'ri-loader-4-line animate-spin' : 'ri-refresh-line'"
                ></i>
                检查更新
              </button>

              <button
                v-if="updateStatus?.status === 'downloaded'"
                @click="handleQuitAndInstall"
                class="px-6 py-2.5 rounded-lg font-bold text-sm bg-emerald-500 text-white hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-200 flex items-center gap-2"
              >
                <i class="ri-download-2-line"></i>
                立即重启安装
              </button>

              <button
                v-if="updateStatus?.status === 'available'"
                @click="handleCheckForUpdates"
                class="px-6 py-2.5 rounded-lg font-bold text-sm bg-amber-500 text-white hover:bg-amber-600 transition-all shadow-lg shadow-amber-200 flex items-center gap-2"
              >
                <i class="ri-download-cloud-2-line"></i>
                开始下载
              </button>
            </div>

            <!-- 最近检查时间 -->
            <div v-if="lastCheckTime" class="pt-3 border-t border-slate-100">
              <p class="text-[10px] text-slate-500">
                最近检查: <span class="font-bold text-slate-600">{{ lastCheckTime }}</span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 数据与日志 -->
    <div class="rounded-2xl border border-slate-200 bg-white px-6 py-5 shadow-sm">
      <div class="space-y-4">
        <div>
          <h3 class="font-bold text-slate-800">数据目录</h3>
          <p
            class="mt-2 text-xs text-slate-600 break-all font-mono hover:bg-slate-50 p-2 rounded border border-slate-100"
          >
            {{ userDataPath }}
          </p>
          <button
            @click="handleOpenUserDataPath"
            class="mt-2 px-4 py-2 rounded-lg border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors flex items-center gap-2"
          >
            <i class="ri-folder-open-line"></i>
            打开文件夹
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useToast } from '@renderer/composables/use-toast'

const toast = useToast()

const currentVersion = ref<string>('')
const isPackaged = ref(false)
const userDataPath = ref<string>('')
const checkingForUpdate = ref(false)
const downloadProgress = ref(0)
const lastCheckTime = ref<string>('')
const autoUpdateEnabled = ref(true)
const savingConfig = ref(false)
const updateStatus = ref<{
  status: string
  payload: Record<string, any> | null
  timestamp: number
} | null>(null)

onMounted(async () => {
  try {
    // 获取应用版本和环境信息，通过 IPC 调用
    const ipcRenderer = window.electron?.ipcRenderer
    if (ipcRenderer) {
      currentVersion.value = (await ipcRenderer.invoke('app:getVersion')) || 'unknown'
      isPackaged.value = (await ipcRenderer.invoke('app:isPackaged')) || false
      userDataPath.value = (await ipcRenderer.invoke('app:getUserDataPath')) || ''
    }

    // 加载自动更新配置
    if (window.api?.updater?.getConfig) {
      try {
        const config = await window.api.updater.getConfig()
        autoUpdateEnabled.value = config.autoUpdateEnabled ?? true
      } catch (error) {
        console.error('[system page] Failed to load auto-update config:', error)
      }
    }
  } catch (error) {
    console.error('[system page] Failed to fetch app info:', error)
  }

  // 监听更新状态变更
  if (window.api?.updater?.onStatus) {
    unsubscribeUpdater.value = window.api.updater.onStatus((payload) => {
      updateStatus.value = payload
      lastCheckTime.value = new Date().toLocaleTimeString('zh-CN')

      // 更新下载进度
      if (payload.status === 'download-progress' && payload.payload?.percent) {
        downloadProgress.value = (payload.payload.percent as number) || 0
      } else if (
        payload.status === 'available' ||
        payload.status === 'not-available' ||
        payload.status === 'checked'
      ) {
        downloadProgress.value = 0
      }
    })
  }
})

const unsubscribeUpdater = ref<(() => void) | null>(null)

onUnmounted(() => {
  if (unsubscribeUpdater.value) {
    unsubscribeUpdater.value()
  }
})

const updateStatusClass = computed(() => {
  const status = updateStatus.value?.status
  if (status === 'available' || status === 'downloaded')
    return 'border-blue-200 bg-blue-50 text-blue-700'
  if (status === 'not-available') return 'border-emerald-200 bg-emerald-50 text-emerald-700'
  if (status === 'error') return 'border-red-200 bg-red-50 text-red-700'
  if (status === 'checking') return 'border-orange-200 bg-orange-50 text-orange-700'
  return 'border-slate-200 bg-slate-50 text-slate-600'
})

const updateStatusLabel = computed(() => {
  const status = updateStatus.value?.status
  if (status === 'checking') return '正在检查更新...'
  if (status === 'available') return '发现新版本！'
  if (status === 'downloaded') return '更新已下载完成'
  if (status === 'not-available') return '已是最新版本'
  if (status === 'error')
    return `更新检查失败: ${updateStatus.value?.payload?.message || '未知错误'}`
  return '未检查'
})

function formatDate(dateStr: string | number | undefined) {
  if (!dateStr) return '-'
  try {
    const d = new Date(dateStr)
    if (Number.isNaN(d.getTime())) return String(dateStr)
    return d.toLocaleDateString('zh-CN')
  } catch {
    return String(dateStr)
  }
}

async function handleCheckForUpdates() {
  if (!isPackaged.value) {
    toast.info('开发环境禁用了自动更新功能')
    return
  }

  checkingForUpdate.value = true
  try {
    const result = await window.api?.updater?.checkForUpdates?.()
    if (!result?.started) {
      toast.error(result?.reason || '检查更新失败，请稍后重试')
    }
  } catch (error) {
    toast.error(error instanceof Error ? error.message : '检查更新出现异常')
    console.error('[system page] Check for updates failed:', error)
  } finally {
    checkingForUpdate.value = false
  }
}

async function toggleAutoUpdate() {
  if (!isPackaged.value) return

  savingConfig.value = true
  try {
    const newValue = !autoUpdateEnabled.value
    const result = await window.api?.updater?.setConfig?.({
      autoUpdateEnabled: newValue
    })

    if (result?.ok) {
      autoUpdateEnabled.value = newValue
      toast.success(newValue ? '已启用自动更新' : '已禁用自动更新')
    } else {
      toast.error(result?.reason || '配置保存失败')
    }
  } catch (error) {
    toast.error(error instanceof Error ? error.message : '配置保存出现异常')
    console.error('[system page] Toggle auto update failed:', error)
  } finally {
    savingConfig.value = false
  }
}

async function handleQuitAndInstall() {
  try {
    const result = await window.api?.updater?.quitAndInstall?.()
    if (!result?.ok) {
      toast.error(result?.reason || '安装更新失败')
    }
  } catch (error) {
    toast.error(error instanceof Error ? error.message : '安装更新出现异常')
    console.error('[system page] Quit and install failed:', error)
  }
}

function handleOpenUserDataPath() {
  try {
    const ipcRenderer = window.electron?.ipcRenderer
    if (ipcRenderer) {
      ipcRenderer.send('app:openUserDataPath')
      toast.info('正在打开数据目录...')
    }
  } catch (error) {
    toast.error('无法打开数据目录')
    console.error('[system page] Open user data path failed:', error)
  }
}
</script>
