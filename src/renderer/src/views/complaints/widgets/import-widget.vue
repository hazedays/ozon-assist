<template>
  <div class="space-y-2">
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-4">
        <label class="text-xs font-bold text-slate-500 uppercase">输入 SKU (每行一个)</label>
        <span
          v-if="skuCount > 0"
          class="text-[10px] bg-blue-50 text-ozon px-1.5 py-0.5 rounded border border-blue-100 font-mono"
        >
          已识别: {{ skuCount }}
        </span>
        <div class="flex items-center gap-2">
          <button
            @click="triggerFileInput"
            class="text-[10px] font-bold text-slate-400 hover:text-ozon transition-colors flex items-center gap-1 cursor-pointer"
          >
            <i class="ri-file-text-line"></i>
            TXT 导入
          </button>
        </div>
        <input
          ref="fileInput"
          type="file"
          accept=".txt"
          class="hidden"
          @change="handleFileChange"
        />
      </div>
      <button
        @click="handleImport"
        :disabled="!skuText.trim() || loading"
        class="text-xs font-bold text-ozon hover:text-blue-700 disabled:text-slate-400 cursor-pointer disabled:cursor-not-allowed"
      >
        {{ loading ? '导入中...' : '提交导入' }}
      </button>
    </div>
    <textarea
      v-model="skuText"
      rows="6"
      placeholder="在此粘贴 SKU 列表，或点击上方按钮选择 TXT 文件..."
      class="w-full p-3 text-sm font-mono border border-slate-200 rounded-lg focus:ring-1 focus:ring-ozon outline-none bg-white resize-none overflow-y-auto"
    ></textarea>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { useToast } from '@renderer/composables/use-toast'
import { useComplaintStore } from '@renderer/stores/complaint'

const complaintStore = useComplaintStore()
const skuText = ref('')
const loading = computed(() => complaintStore.loading)
const fileInput = ref<HTMLInputElement | null>(null)
const toast = useToast()

// 提取并过滤 SKU 工具函数 (移动到上方以供 computed/watch 使用)
const getCleanedSkus = (text: string) => {
  return text
    .split('\n')
    .map((s) => s.trim())
    .map((s) => {
      const match = s.match(/\/product\/(\d+)/)
      return match ? match[1] : s
    })
    .filter((s) => s.length > 0 && /^\d+$/.test(s))
}

// 计算当前有效的 SKU 数量
const skuCount = computed(() => {
  if (!skuText.value.trim()) return 0
  return getCleanedSkus(skuText.value).length
})

// 自动清洗逻辑：当监听到内容变化时（如粘贴），自动过滤有效 SKU
watch(skuText, (newVal) => {
  // 如果包含链接或非法字符，则执行清洗
  if (newVal.includes('http') || /[^\d\n\s]/.test(newVal)) {
    const cleaned = getCleanedSkus(newVal).join('\n')
    if (cleaned !== newVal) {
      skuText.value = cleaned
    }
  }
})

const triggerFileInput = () => {
  fileInput.value?.click()
}

const handleFileChange = (e: Event) => {
  const target = e.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return

  const reader = new FileReader()
  reader.onload = (event) => {
    const content = event.target?.result as string
    // 导入文件瞬间立即执行清洗
    const skus = getCleanedSkus(content)
    skuText.value = skus.join('\n')
  }
  reader.readAsText(file)
  target.value = ''
}

const handleImport = async () => {
  // 1. 初步清洗
  const rawSkus = getCleanedSkus(skuText.value)
  // 2. 前端去重（提升性能，减少无效 IPC 通信）
  const uniqueSkus = [...new Set(rawSkus)]

  if (uniqueSkus.length === 0) {
    toast.error('未识别到有效的 SKU')
    return
  }

  try {
    const result = await complaintStore.importSkus(uniqueSkus)
    if (result?.success) {
      if (result.count === 0) {
        toast.info('所选 SKU 已全部存在，无需导入')
      } else {
        const skipped = uniqueSkus.length - result.count
        toast.success(
          skipped > 0
            ? `成功导入 ${result.count} 条新记录 (跳过 ${skipped} 条重复项)`
            : `成功导入 ${result.count} 条记录`
        )
      }
      skuText.value = ''
    }
  } catch (error) {
    toast.error('导入失败: ' + String(error))
  }
}

// 显式暴露给模板（解决某些环境下的类型推导问题）
defineExpose({
  skuCount
})
</script>
