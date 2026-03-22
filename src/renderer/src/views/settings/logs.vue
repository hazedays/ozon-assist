<template>
  <div class="max-w-6xl mx-auto flex flex-col gap-5 p-6">
    <div class="rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div class="flex items-center gap-2">
          <i class="ri-terminal-box-line text-slate-500"></i>
          <h2 class="text-sm font-bold text-slate-800">插件运行日志</h2>
          <span class="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-ozon">
            实时监控
          </span>
        </div>
        <div class="text-xs text-slate-500">
          自动刷新: <span class="font-bold text-slate-700">2s</span>
        </div>
      </div>
      <p class="mt-2 text-xs text-slate-500">
        日志由浏览器插件实时上报到宿主，用于排查自动化执行过程中的行为、分支和异常。
      </p>
    </div>

    <div class="grid grid-cols-2 gap-3 md:grid-cols-7">
      <div class="rounded-xl border border-slate-200 bg-white p-3">
        <p class="text-[10px] font-bold uppercase tracking-wider text-slate-400">总条数</p>
        <p class="mt-1 text-lg font-black tabular-nums text-slate-800">{{ logs.length }}</p>
      </div>
      <div class="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
        <p class="text-[10px] font-bold tracking-wider text-emerald-600">成功</p>
        <p class="mt-1 text-lg font-black tabular-nums text-emerald-700">{{ successCount }}</p>
      </div>
      <div class="rounded-xl border border-amber-200 bg-amber-50 p-3">
        <p class="text-[10px] font-bold tracking-wider text-amber-700">警告</p>
        <p class="mt-1 text-lg font-black tabular-nums text-amber-700">{{ warnCount }}</p>
      </div>
      <div class="rounded-xl border border-red-200 bg-red-50 p-3">
        <p class="text-[10px] font-bold tracking-wider text-red-600">错误</p>
        <p class="mt-1 text-lg font-black tabular-nums text-red-700">{{ errorCount }}</p>
      </div>
      <div class="rounded-xl border border-slate-200 bg-slate-100 p-3">
        <p class="text-[10px] font-bold uppercase tracking-wider text-slate-500">显示数量</p>
        <p class="mt-1 text-lg font-black tabular-nums text-slate-700">{{ filteredLogs.length }}</p>
      </div>
      <div class="rounded-xl border border-teal-200 bg-teal-50 p-3">
        <p class="text-[10px] font-bold uppercase tracking-wider text-teal-700">任务完成停止</p>
        <p class="mt-1 text-lg font-black tabular-nums text-teal-700">{{ completedStopCount }}</p>
      </div>
      <div class="rounded-xl border border-orange-200 bg-orange-50 p-3">
        <p class="text-[10px] font-bold uppercase tracking-wider text-orange-700">异常中断停止</p>
        <p class="mt-1 text-lg font-black tabular-nums text-orange-700">
          {{ interruptedStopCount }}
        </p>
      </div>
    </div>

    <div
      class="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-600"
      v-if="lastStopReason"
    >
      最近一次停止原因: <span class="font-bold text-slate-800">{{ lastStopReason }}</span>
    </div>

    <div class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div class="flex flex-wrap items-center gap-2">
        <select
          v-model.number="limit"
          class="h-9 rounded-lg border border-slate-200 bg-white px-2 text-xs text-slate-700"
          @change="refreshLogs"
        >
          <option :value="100">最近 100 条</option>
          <option :value="300">最近 300 条</option>
          <option :value="500">最近 500 条</option>
          <option :value="1000">最近 1000 条</option>
        </select>

        <select
          v-model="selectedLevel"
          class="h-9 rounded-lg border border-slate-200 bg-white px-2 text-xs text-slate-700"
        >
          <option value="all">全部等级</option>
          <option value="debug">调试</option>
          <option value="info">信息</option>
          <option value="success">成功</option>
          <option value="warn">警告</option>
          <option value="error">错误</option>
        </select>

        <input
          v-model="keyword"
          type="text"
          placeholder="按消息关键字筛选"
          class="h-9 min-w-[180px] flex-1 rounded-lg border border-slate-200 px-3 text-xs text-slate-700"
        />

        <button
          class="h-9 rounded-lg border border-slate-200 px-3 text-xs font-bold text-slate-600 hover:bg-slate-50"
          :disabled="loading"
          @click="refreshLogs"
        >
          {{ loading ? '刷新中...' : '刷新' }}
        </button>

        <button
          class="h-9 rounded-lg border border-red-200 px-3 text-xs font-bold text-red-600 hover:bg-red-50"
          :disabled="clearing"
          @click="clearLogs"
        >
          {{ clearing ? '清空中...' : '清空日志' }}
        </button>
      </div>

      <div class="mt-4 rounded-xl border border-slate-100 bg-slate-50">
        <table class="w-full text-xs">
          <thead class="sticky top-0 bg-slate-100 text-slate-600">
            <tr>
              <th class="px-3 py-2 text-left font-bold">时间</th>
              <th class="px-3 py-2 text-left font-bold">等级</th>
              <th class="px-3 py-2 text-left font-bold">消息</th>
              <th class="px-3 py-2 text-left font-bold">页面</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="filteredLogs.length === 0">
              <td colspan="4" class="px-3 py-10 text-center">
                <div class="mx-auto flex max-w-xs flex-col items-center gap-2 text-slate-400">
                  <i class="ri-file-search-line text-2xl"></i>
                  <p class="text-xs">暂无匹配日志</p>
                  <p class="text-[11px] text-slate-400">
                    可尝试放宽筛选条件，或触发一次插件动作后刷新
                  </p>
                </div>
              </td>
            </tr>
            <tr
              v-for="item in filteredLogs"
              :key="item.id"
              class="border-t border-slate-100 transition-colors hover:bg-white"
            >
              <td class="whitespace-nowrap px-3 py-2 text-slate-500">
                {{ formatTime(item.timestamp) }}
              </td>
              <td class="px-3 py-2">
                <span
                  class="rounded px-2 py-0.5 text-[10px] font-bold"
                  :class="levelClass(item.level)"
                >
                  {{ levelLabel(item.level) }}
                </span>
              </td>
              <td class="px-3 py-2 text-slate-700">
                <div class="break-all">{{ item.message }}</div>
                <div v-if="item.error" class="mt-1 break-all text-red-500">{{ item.error }}</div>
              </td>
              <td class="px-3 py-2 text-slate-500">
                <span class="break-all">{{ item.pageUrl || '-' }}</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { serverService, type PluginRuntimeLog } from '@renderer/services/server'
import { useToast } from '@renderer/composables/use-toast'

const toast = useToast()
const logs = ref<PluginRuntimeLog[]>([])
const loading = ref(false)
const clearing = ref(false)
const limit = ref(300)
const selectedLevel = ref<'all' | PluginRuntimeLog['level']>('all')
const keyword = ref('')
const autoFollowLogs = ref(true)
let timer: ReturnType<typeof setInterval> | null = null

function isPageNearBottom() {
  const threshold = 24
  const scrollTop = window.scrollY || document.documentElement.scrollTop || 0
  const viewportHeight = window.innerHeight || document.documentElement.clientHeight
  const scrollHeight = document.documentElement.scrollHeight
  return scrollHeight - scrollTop - viewportHeight <= threshold
}

function scrollToBottom() {
  window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'smooth' })
}

function handleWindowScroll() {
  autoFollowLogs.value = isPageNearBottom()
}

const successCount = computed(() => logs.value.filter((i) => i.level === 'success').length)
const warnCount = computed(() => logs.value.filter((i) => i.level === 'warn').length)
const errorCount = computed(() => logs.value.filter((i) => i.level === 'error').length)

const latestStopStatsLog = computed(() => {
  for (let i = logs.value.length - 1; i >= 0; i--) {
    const item = logs.value[i]
    if (item.event === 'complaint.stop-stats') {
      return item
    }
  }
  return null
})

const completedStopCount = computed(() => {
  const value = latestStopStatsLog.value?.data?.completed
  return typeof value === 'number' ? value : 0
})

const interruptedStopCount = computed(() => {
  const value = latestStopStatsLog.value?.data?.interrupted
  return typeof value === 'number' ? value : 0
})

const lastStopReason = computed(() => {
  const value = latestStopStatsLog.value?.data?.lastReason
  return typeof value === 'string' && value ? value : ''
})

const filteredLogs = computed(() => {
  const kw = keyword.value.trim().toLowerCase()
  return logs.value.filter((item) => {
    if (selectedLevel.value !== 'all' && item.level !== selectedLevel.value) {
      return false
    }
    if (!kw) return true
    return (
      item.message.toLowerCase().includes(kw) ||
      item.error?.toLowerCase().includes(kw) ||
      item.pageUrl?.toLowerCase().includes(kw)
    )
  })
})

function formatTime(ts: string) {
  const d = new Date(ts)
  if (Number.isNaN(d.getTime())) return ts
  return `${d.toLocaleDateString()} ${d.toLocaleTimeString()}`
}

function levelClass(level: PluginRuntimeLog['level']) {
  if (level === 'error') return 'bg-red-100 text-red-600'
  if (level === 'warn') return 'bg-amber-100 text-amber-700'
  if (level === 'success') return 'bg-emerald-100 text-emerald-700'
  if (level === 'debug') return 'bg-slate-200 text-slate-700'
  return 'bg-blue-100 text-blue-700'
}

function levelLabel(level: PluginRuntimeLog['level']) {
  if (level === 'error') return '错误'
  if (level === 'warn') return '警告'
  if (level === 'success') return '成功'
  if (level === 'debug') return '调试'
  return '信息'
}

async function refreshLogs() {
  loading.value = true
  try {
    const shouldStickToBottom = autoFollowLogs.value || isPageNearBottom()
    logs.value = await serverService.getPluginLogs(limit.value)
    await nextTick()
    if (shouldStickToBottom) {
      scrollToBottom()
    }
  } catch (error) {
    toast.error(`加载运行日志失败: ${error instanceof Error ? error.message : String(error)}`)
  } finally {
    loading.value = false
  }
}

watch(filteredLogs, async () => {
  await nextTick()
  if (autoFollowLogs.value) {
    scrollToBottom()
  }
})

async function clearLogs() {
  clearing.value = true
  try {
    await serverService.clearPluginLogs()
    logs.value = []
    toast.success('运行日志已清空')
  } catch (error) {
    toast.error(`清空运行日志失败: ${error instanceof Error ? error.message : String(error)}`)
  } finally {
    clearing.value = false
  }
}

onMounted(async () => {
  window.addEventListener('scroll', handleWindowScroll, { passive: true })
  autoFollowLogs.value = isPageNearBottom()
  await refreshLogs()
  timer = setInterval(() => {
    void refreshLogs()
  }, 2000)
})

onUnmounted(() => {
  window.removeEventListener('scroll', handleWindowScroll)
  if (timer) clearInterval(timer)
})
</script>
