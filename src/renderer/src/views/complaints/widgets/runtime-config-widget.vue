<template>
  <div class="bg-white border border-slate-200 rounded-2xl shadow-sm p-5">
    <div class="flex items-center justify-between mb-4">
      <div>
        <h3 class="text-sm font-bold text-slate-800">宿主运行配置</h3>
        <p class="text-[11px] text-slate-500 mt-1">
          用于控制插件轮询间隔与日志输出等级（由 Electron 宿主下发）
        </p>
      </div>
      <button
        class="px-3 py-1.5 text-xs font-bold rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
        :disabled="loading"
        @click="loadConfig"
      >
        {{ loading ? '刷新中...' : '刷新配置' }}
      </button>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
      <label class="flex flex-col gap-1.5">
        <span class="text-[11px] font-bold text-slate-500 uppercase tracking-wider"
          >任务间隔 (ms)</span
        >
        <input
          v-model.number="form.taskIntervalMs"
          type="number"
          min="100"
          max="10000"
          step="100"
          class="h-10 px-3 rounded-lg border border-slate-200 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400"
        />
      </label>

      <label class="flex flex-col gap-1.5">
        <span class="text-[11px] font-bold text-slate-500 uppercase tracking-wider">日志等级</span>
        <select
          v-model="form.logLevel"
          class="h-10 px-3 rounded-lg border border-slate-200 text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400"
        >
          <option value="debug">debug</option>
          <option value="info">info</option>
          <option value="warn">warn</option>
          <option value="error">error</option>
          <option value="silent">silent</option>
        </select>
      </label>

      <label class="flex flex-col gap-1.5">
        <span class="text-[11px] font-bold text-slate-500 uppercase tracking-wider">详细日志</span>
        <button
          @click="form.verbose = !form.verbose"
          class="h-10 px-3 rounded-lg border text-sm font-bold transition-colors"
          :class="
            form.verbose
              ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
              : 'border-slate-200 bg-slate-50 text-slate-600'
          "
        >
          {{ form.verbose ? '已开启' : '已关闭' }}
        </button>
      </label>
    </div>

    <div class="flex items-center justify-end gap-3 mt-4">
      <button
        class="px-4 py-2 text-xs font-bold rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
        :disabled="saving"
        @click="loadConfig"
      >
        重置为当前值
      </button>
      <button
        class="px-4 py-2 text-xs font-bold rounded-lg bg-ozon text-white hover:bg-blue-600 transition-colors disabled:opacity-60"
        :disabled="saving"
        @click="saveConfig"
      >
        {{ saving ? '保存中...' : '保存配置' }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { serverService, type RuntimeConfig } from '@renderer/services/server'
import { useToast } from '@renderer/composables/use-toast'

const toast = useToast()
const loading = ref(false)
const saving = ref(false)

const form = reactive<RuntimeConfig>({
  taskIntervalMs: 500,
  logLevel: 'info',
  verbose: false
})

async function loadConfig() {
  loading.value = true
  try {
    const data = await serverService.getRuntimeConfig()
    form.taskIntervalMs = data.taskIntervalMs
    form.logLevel = data.logLevel
    form.verbose = data.verbose
  } catch (error) {
    toast.error(`加载配置失败: ${error instanceof Error ? error.message : String(error)}`)
  } finally {
    loading.value = false
  }
}

async function saveConfig() {
  saving.value = true
  try {
    const data = await serverService.setRuntimeConfig({
      taskIntervalMs: form.taskIntervalMs,
      logLevel: form.logLevel,
      verbose: form.verbose
    })
    form.taskIntervalMs = data.taskIntervalMs
    form.logLevel = data.logLevel
    form.verbose = data.verbose
    toast.success('宿主配置已保存，插件将在下一次同步时生效')
  } catch (error) {
    toast.error(`保存配置失败: ${error instanceof Error ? error.message : String(error)}`)
  } finally {
    saving.value = false
  }
}

onMounted(() => {
  loadConfig()
})
</script>
