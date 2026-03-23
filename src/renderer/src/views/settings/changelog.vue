<template>
  <div class="max-w-6xl mx-auto p-6">
    <div
      class="rounded-3xl border border-slate-200 bg-gradient-to-br from-white via-blue-50/30 to-cyan-50/40 px-6 py-6 shadow-sm"
    >
      <div class="flex flex-wrap items-center gap-3">
        <div class="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-900 text-white">
          <i class="ri-history-line"></i>
        </div>
        <div>
          <h2 class="text-base font-black tracking-tight text-slate-800">更新日志</h2>
          <p class="mt-1 text-xs text-slate-500">
            自动同步 GitHub Releases，按时间轴查看每个版本的变化。
          </p>
        </div>
      </div>
    </div>

    <div v-if="loading" class="mt-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div class="flex items-center gap-2 text-slate-500 text-sm">
        <i class="ri-loader-4-line animate-spin"></i>
        正在加载更新日志...
      </div>
    </div>

    <div v-else-if="error" class="mt-5 rounded-2xl border border-red-200 bg-red-50 p-6 shadow-sm">
      <p class="text-sm font-bold text-red-700">加载失败</p>
      <p class="mt-1 text-xs text-red-600">{{ error }}</p>
      <button
        @click="loadReleaseHistory"
        class="mt-3 inline-flex items-center gap-2 rounded-lg border border-red-200 bg-white px-4 py-2 text-xs font-bold text-red-700 hover:bg-red-100 transition-colors"
      >
        <i class="ri-refresh-line"></i>
        重试
      </button>
    </div>

    <div
      v-else-if="history.length === 0"
      class="mt-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
    >
      <p class="text-sm text-slate-600">暂无可展示的更新记录。</p>
    </div>

    <div v-else class="mt-6">
      <div class="relative">
        <div class="absolute bottom-3 left-5 top-3 hidden w-px bg-slate-200 sm:block"></div>

        <div class="space-y-5">
          <article
            v-for="(item, idx) in history"
            :key="item.version + item.date"
            class="relative flex gap-4 sm:gap-5"
          >
            <div class="hidden sm:flex pt-1">
              <div
                class="h-10 w-10 flex-shrink-0 rounded-xl border flex items-center justify-center"
                :class="
                  idx === 0
                    ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-200'
                    : 'bg-white border-slate-200 text-slate-500 shadow-sm'
                "
              >
                <i :class="idx === 0 ? 'ri-rocket-line' : 'ri-time-line'"></i>
              </div>
            </div>

            <div
              class="flex-1 rounded-2xl border p-5 shadow-sm"
              :class="idx === 0 ? 'border-blue-200 bg-blue-50/40' : 'border-slate-200 bg-white'"
            >
              <div class="flex flex-wrap items-center gap-2">
                <span
                  class="rounded-lg px-2.5 py-1 text-xs font-black"
                  :class="idx === 0 ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-700'"
                >
                  v{{ item.version }}
                </span>
                <span class="text-xs font-medium text-slate-500">{{ formatDate(item.date) }}</span>
                <span
                  v-if="idx === 0"
                  class="ml-auto rounded-lg bg-blue-100 px-2.5 py-1 text-[11px] font-bold text-blue-700"
                >
                  最新版本
                </span>
              </div>

              <div v-if="item.notes" class="mt-4">
                <div
                  class="relative rounded-xl border border-slate-100 bg-white p-4 text-xs leading-relaxed text-slate-700 break-words overflow-hidden"
                  :class="
                    isExpanded(getItemKey(item)) || !shouldCollapse(item.notes) ? '' : 'max-h-44'
                  "
                >
                  <div class="space-y-2">
                    <template
                      v-for="(block, blockIndex) in parseMarkdownBlocks(item.notes)"
                      :key="`${getItemKey(item)}-${blockIndex}`"
                    >
                      <h3
                        v-if="block.type === 'heading2'"
                        class="mt-3 mb-1 text-sm font-black text-slate-900"
                      >
                        {{ block.content }}
                      </h3>
                      <h4
                        v-else-if="block.type === 'heading3'"
                        class="mt-3 mb-1 text-xs font-bold text-slate-800"
                      >
                        {{ block.content }}
                      </h4>
                      <ul v-else-if="block.type === 'list'" class="list-disc pl-4 space-y-1">
                        <li v-for="(listItem, liIndex) in block.items" :key="liIndex">
                          {{ listItem }}
                        </li>
                      </ul>
                      <p v-else class="mb-1 whitespace-pre-wrap">
                        {{ block.content }}
                      </p>
                    </template>
                  </div>
                  <div
                    v-if="!isExpanded(getItemKey(item)) && shouldCollapse(item.notes)"
                    class="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-white to-transparent"
                  ></div>
                </div>
                <button
                  v-if="shouldCollapse(item.notes)"
                  @click="toggleExpanded(getItemKey(item))"
                  class="mt-2 inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:text-blue-700"
                >
                  <i
                    :class="
                      isExpanded(getItemKey(item)) ? 'ri-arrow-up-s-line' : 'ri-arrow-down-s-line'
                    "
                  ></i>
                  {{ isExpanded(getItemKey(item)) ? '收起说明' : '展开全文' }}
                </button>
              </div>
              <p v-else class="mt-4 text-xs text-slate-400">该版本未提供详细说明。</p>
            </div>
          </article>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'

type ReleaseItem = {
  version: string
  date: string
  notes: string
}

type MarkdownBlock =
  | { type: 'heading2'; content: string }
  | { type: 'heading3'; content: string }
  | { type: 'paragraph'; content: string }
  | { type: 'list'; items: string[] }

const loading = ref(true)
const error = ref('')
const history = ref<ReleaseItem[]>([])
const expandedKeys = ref<Set<string>>(new Set())

const formatDate = (value: string): string => {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  })
}

const parseMarkdownBlocks = (markdown: string): MarkdownBlock[] => {
  const lines = markdown.split(/\r?\n/)
  const blocks: MarkdownBlock[] = []
  let listBuffer: string[] = []

  const flushList = (): void => {
    if (listBuffer.length > 0) {
      blocks.push({ type: 'list', items: listBuffer })
      listBuffer = []
    }
  }

  for (const line of lines) {
    const trimmed = line.trim()

    if (!trimmed) {
      flushList()
      continue
    }

    if (/^[-*]\s+/.test(trimmed)) {
      listBuffer.push(trimmed.replace(/^[-*]\s+/, ''))
      continue
    }

    flushList()

    if (/^##\s+/.test(trimmed) || /^#\s+/.test(trimmed)) {
      blocks.push({ type: 'heading2', content: trimmed.replace(/^#{1,2}\s+/, '') })
      continue
    }

    if (/^###\s+/.test(trimmed)) {
      blocks.push({ type: 'heading3', content: trimmed.replace(/^###\s+/, '') })
      continue
    }

    blocks.push({ type: 'paragraph', content: trimmed })
  }

  flushList()
  return blocks
}

const getItemKey = (item: ReleaseItem): string => `${item.version}-${item.date}`

const shouldCollapse = (notes: string): boolean => {
  const nonEmptyLines = notes.split(/\r?\n/).filter((line) => line.trim().length > 0).length
  return notes.length > 420 || nonEmptyLines > 8
}

const isExpanded = (key: string): boolean => expandedKeys.value.has(key)

const toggleExpanded = (key: string): void => {
  const next = new Set(expandedKeys.value)
  if (next.has(key)) {
    next.delete(key)
  } else {
    next.add(key)
  }
  expandedKeys.value = next
}

const loadReleaseHistory = async (): Promise<void> => {
  loading.value = true
  error.value = ''

  try {
    const result = await window.api.updater.getReleaseHistory()
    history.value = Array.isArray(result) ? result : []
  } catch (err) {
    const message = err instanceof Error ? err.message : '未知错误'
    error.value = `无法获取发布历史：${message}`
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  void loadReleaseHistory()
})
</script>
