<template>
  <div ref="widgetRoot">
    <!-- 将标题也纳入吸顶容器，从标题开始锁定 -->
    <div class="sticky top-14 z-40 bg-slate-50 pt-2">
      <!-- 头部标题：带背景以遮盖下方滚动内容 -->
      <div class="flex items-center justify-between pb-3">
        <label class="text-xs font-bold text-slate-500 uppercase italic">投诉记录</label>
        <div class="flex items-center gap-4">
          <span class="text-[10px] text-slate-400 font-mono"
            >共 {{ complaintStore.total }} 条数据</span
          >
        </div>
      </div>

      <!-- 投诉记录展示区域的头部：筛选栏 + 表头 -->
      <div
        class="border border-slate-200 border-b-0 rounded-t-xl bg-white shadow-sm overflow-hidden"
      >
        <!-- 筛选栏 -->
        <div class="p-3 space-y-3">
          <div class="grid grid-cols-12 gap-3">
            <div class="col-span-8 relative">
              <i
                class="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs"
              ></i>
              <input
                v-model="searchSku"
                @input="handleFilterChange"
                type="text"
                placeholder="搜索 SKU..."
                class="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-ozon outline-none bg-white transition-all font-mono"
              />
            </div>
            <div class="col-span-4">
              <select
                v-model="filterStatus"
                @change="handleFilterChange"
                class="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-ozon outline-none bg-white appearance-none cursor-pointer"
              >
                <option value="">全部状态</option>
                <option v-for="(info, key) in STATUS_MAP" :key="key" :value="key">
                  {{ info.text }}
                </option>
              </select>
            </div>
          </div>

          <!-- 时间筛选 -->
          <div class="flex items-center gap-2 pt-2 border-t border-slate-100 overflow-x-auto">
            <span class="text-[10px] font-bold text-slate-400 uppercase whitespace-nowrap"
              >时间范围:</span
            >
            <div class="flex items-center gap-1">
              <input
                v-model="startDate"
                @change="handleFilterChange"
                type="date"
                class="px-2 py-1 text-[10px] border border-slate-200 rounded bg-white outline-none focus:ring-1 focus:ring-ozon font-mono"
              />
              <span class="text-slate-300">-</span>
              <input
                v-model="endDate"
                @change="handleFilterChange"
                type="date"
                class="px-2 py-1 text-[10px] border border-slate-200 rounded bg-white outline-none focus:ring-1 focus:ring-ozon font-mono"
              />
            </div>
            <button
              v-if="startDate || endDate"
              @click="clearDateFilter"
              class="text-[10px] text-ozon hover:text-ozon font-bold whitespace-nowrap px-2"
            >
              重置日期
            </button>
          </div>
        </div>

        <!-- 表头 (紧贴筛选栏，无间隙) -->
        <table class="w-full text-left border-separate border-spacing-0 table-fixed">
          <colgroup>
            <col
              v-for="col in COLUMNS"
              :key="col.label"
              :style="col.width ? { width: col.width } : {}"
            />
          </colgroup>
          <thead>
            <tr class="bg-slate-50 shadow-[0_1px_0_rgba(0,0,0,0.05)]">
              <th
                v-for="(col, index) in COLUMNS"
                :key="col.label"
                :class="[
                  'px-6 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50 border-t border-slate-200',
                  index < COLUMNS.length - 1 ? 'border-r border-slate-200/60' : '',
                  col.align === 'right' ? 'text-right' : ''
                ]"
              >
                {{ col.label }}
              </th>
            </tr>
          </thead>
        </table>
      </div>
    </div>

    <!-- 表格内容 (独立展示，带边框包裹以免断层) -->
    <div class="border border-slate-200 border-t-0 rounded-b-xl bg-white shadow-sm overflow-hidden">
      <table class="w-full text-left border-separate border-spacing-0 table-fixed">
        <colgroup>
          <col
            v-for="col in COLUMNS"
            :key="col.label"
            :style="col.width ? { width: col.width } : {}"
          />
        </colgroup>
        <tbody class="divide-y divide-slate-100">
          <tr
            v-for="record in records"
            :key="record.id"
            class="transition-colors odd:bg-white even:bg-slate-50/80 hover:bg-blue-50"
          >
            <td :class="[TD_CLASS, 'text-sm font-mono text-slate-600 font-medium truncate']">
              {{ record.sku }}
            </td>
            <td :class="TD_CLASS">
              <span
                :class="getStatusInfo(record.status).class"
                class="text-[9px] font-bold px-2 py-0.5 rounded-full border"
              >
                {{ getStatusInfo(record.status).text }}
              </span>
            </td>
            <td :class="TD_CLASS">
              <div v-if="record.image_path" class="flex items-center gap-2">
                <div
                  @click="previewImage(record.image_path)"
                  class="cursor-zoom-in group/img relative w-10 h-10 rounded border border-slate-200 overflow-hidden bg-slate-100 flex items-center justify-center shrink-0"
                >
                  <img
                    :src="getImageUrl(record.image_path)"
                    class="w-full h-full object-cover transition-transform group-hover/img:scale-110"
                  />
                  <div
                    class="absolute inset-0 bg-black/20 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center"
                  >
                    <i class="ri-zoom-in-line text-white text-xs"></i>
                  </div>
                </div>
                <button
                  @click="goToImages(record.image_id)"
                  class="p-1.5 rounded-lg hover:bg-slate-100 text-slate-300 hover:text-ozon transition-all cursor-pointer"
                  title="在库中查看"
                >
                  <i class="ri-external-link-line text-sm"></i>
                </button>
              </div>
              <span v-else class="text-[10px] text-slate-300 italic">无凭证</span>
            </td>
            <td :class="[TD_CLASS, 'text-[11px] text-slate-400 font-mono']">
              {{ formatDate(record.created_at) }}
            </td>
            <td :class="[TD_CLASS, 'text-xs text-slate-500 italic max-w-[200px] truncate']">
              {{ record.remark || '无备注' }}
            </td>
            <td class="px-6 py-2.5 text-right">
              <div class="flex items-center justify-end gap-1">
                <button
                  v-if="record.status === 'timeout' || record.status === 'failed'"
                  @click="handleReset(record.id)"
                  class="text-blue-400 hover:text-ozon transition-all p-1.5 rounded-lg hover:bg-blue-50 cursor-pointer"
                  title="重置为等待"
                >
                  <i class="ri-restart-line text-sm"></i>
                </button>
                <button
                  @click="handleDelete(record.id)"
                  class="text-slate-300 hover:text-red-500 transition-colors p-1.5 rounded-lg hover:bg-red-50 cursor-pointer"
                  title="彻底删除"
                >
                  <i class="ri-delete-bin-7-line text-sm"></i>
                </button>
              </div>
            </td>
          </tr>
          <tr v-if="records.length === 0">
            <td
              colspan="5"
              class="px-6 py-20 text-center text-xs text-slate-300 italic tracking-widest uppercase"
            >
              {{ complaintStore.loading ? '正在加载数据...' : '没有符合条件的记录' }}
            </td>
          </tr>
        </tbody>
      </table>

      <!-- 分页控件 (固定在底部) -->
      <div
        v-if="totalPages > 0"
        class="px-6 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between z-10"
      >
        <!-- 左侧：页码跳转与每页显示 -->
        <div class="flex items-center gap-4">
          <div class="text-[10px] text-slate-400 font-mono font-bold uppercase">
            第 {{ complaintStore.currentPage }} / {{ Math.max(1, totalPages) }} 页
          </div>

          <div class="flex items-center gap-2 border-l border-slate-200 pl-4">
            <select
              v-model="pageSize"
              @change="handlePageSizeChange"
              class="px-2 py-0.5 text-[10px] border border-slate-200 rounded bg-white outline-none focus:ring-1 focus:ring-ozon cursor-pointer font-mono"
            >
              <option v-for="size in PAGE_SIZES" :key="size" :value="size">{{ size }} / 页</option>
            </select>

            <div class="flex items-center gap-1 border-l border-slate-200 pl-3 ml-1">
              <span class="text-[10px] text-slate-400">跳至</span>
              <input
                v-model.number="jumpPage"
                @keyup.enter="handleJump"
                type="text"
                class="w-10 px-1 py-0.5 text-[10px] border border-slate-200 rounded text-center focus:ring-1 focus:ring-ozon outline-none bg-white font-mono"
              />
            </div>
          </div>
        </div>

        <!-- 右侧：数字分页按钮 -->
        <div class="flex items-center gap-1">
          <button
            @click="complaintStore.setPage(complaintStore.currentPage - 1)"
            :disabled="complaintStore.currentPage <= 1"
            class="p-1 px-2 text-[10px] font-bold rounded-lg border border-slate-200 transition-colors enabled:hover:bg-white enabled:hover:text-ozon disabled:opacity-30 cursor-pointer"
          >
            <i class="ri-arrow-left-s-line"></i>
          </button>

          <template v-for="p in visiblePages" :key="p">
            <button
              v-if="p !== -1"
              @click="complaintStore.setPage(p)"
              :class="[
                'min-w-[28px] h-7 text-[10px] font-bold rounded-lg transition-all cursor-pointer',
                complaintStore.currentPage === p
                  ? 'bg-ozon text-white border-transparent shadow-sm'
                  : 'bg-white text-slate-600 border border-slate-200 hover:border-blue-400'
              ]"
            >
              {{ p }}
            </button>
            <span v-else class="px-1 text-slate-300 text-[10px]">...</span>
          </template>

          <button
            @click="complaintStore.setPage(complaintStore.currentPage + 1)"
            :disabled="complaintStore.currentPage >= totalPages"
            class="p-1 px-2 text-[10px] font-bold rounded-lg border border-slate-200 transition-colors enabled:hover:bg-white enabled:hover:text-ozon disabled:opacity-30 cursor-pointer"
          >
            <i class="ri-arrow-right-s-line"></i>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import dayjs from 'dayjs'
import { ref, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useComplaintStore } from '@renderer/stores/complaint'
import { useImageStore } from '@renderer/stores/image'
import { useToast } from '@renderer/composables/use-toast'
import logger from '@renderer/core/logger'

const complaintStore = useComplaintStore()
const imageStore = useImageStore()
const toast = useToast()
const router = useRouter()
const widgetRoot = ref<HTMLElement | null>(null)

// 常量定义
const STATUS_MAP = {
  success: { text: '成功', class: 'bg-emerald-50 text-emerald-600 border-emerald-100' },
  failed: { text: '失败', class: 'bg-red-50 text-red-600 border-red-100' },
  timeout: { text: '超时', class: 'bg-amber-50 text-amber-600 border-amber-100' },
  processing: { text: '处理中', class: 'bg-blue-50 text-ozon border-blue-100' },
  pending: { text: '待处理', class: 'bg-slate-50 text-slate-500 border-slate-100' }
}

const COLUMNS = [
  { label: 'SKU', width: '25%' },
  { label: '状态', width: '12%' },
  { label: '凭证', width: '10%' },
  { label: '更新时间', width: '18%' },
  { label: '备注', width: '' },
  { label: '操作', width: '80px', align: 'right' }
]

const PAGE_SIZES = [10, 20, 50, 100]

const TD_CLASS = 'px-6 py-2.5 border-r border-slate-100/80'

// 状态
const records = computed(() => complaintStore.records)
const totalPages = computed(() => Math.ceil(complaintStore.total / complaintStore.pageSize))

// 筛选状态
const searchSku = ref(complaintStore.filters.sku)
const filterStatus = ref(complaintStore.filters.status)
const startDate = ref(complaintStore.filters.startDate)
const endDate = ref(complaintStore.filters.endDate)
const pageSize = ref(complaintStore.pageSize)
const jumpPage = ref(complaintStore.currentPage)

// 防抖搜索
let timer: any = null
const handleFilterChange = () => {
  if (timer) clearTimeout(timer)
  timer = setTimeout(() => {
    complaintStore.setFilter({
      sku: searchSku.value,
      status: filterStatus.value,
      startDate: startDate.value,
      endDate: endDate.value
    })
  }, 300)
}

const clearDateFilter = () => {
  startDate.value = ''
  endDate.value = ''
  handleFilterChange()
}

const handlePageSizeChange = () => {
  complaintStore.setPageSize(pageSize.value)
}

const handleJump = () => {
  let p = jumpPage.value
  if (isNaN(p) || p < 1) p = 1
  if (p > totalPages.value) p = totalPages.value
  complaintStore.setPage(p)
  jumpPage.value = p
}

const scrollToWidget = () => {
  if (widgetRoot.value) {
    // 56px 是 AppHeader 的高度 (h-14)
    const elementPosition = widgetRoot.value.getBoundingClientRect().top + window.scrollY
    const offsetPosition = elementPosition - 56
    window.scrollTo({
      top: offsetPosition,
      behavior: 'smooth'
    })
  }
}

// 同步页码回显与自动滚动
watch(
  () => complaintStore.currentPage,
  (val) => {
    jumpPage.value = val
    scrollToWidget()
  }
)

// 切换每页数量时也回到顶部
watch(
  () => complaintStore.pageSize,
  () => {
    scrollToWidget()
  }
)

// 计算显示的页码块（带省略号逻辑）
const visiblePages = computed(() => {
  const current = complaintStore.currentPage
  const total = totalPages.value
  const pages: number[] = []

  if (total <= 7) {
    for (let i = 1; i <= total; i++) pages.push(i)
  } else {
    pages.push(1)
    if (current > 4) pages.push(-1) // -1 代表省略号

    const start = Math.max(2, current - 2)
    const end = Math.min(total - 1, current + 2)

    for (let i = start; i <= end; i++) {
      if (!pages.includes(i)) pages.push(i)
    }

    if (current < total - 3) pages.push(-1)
    if (!pages.includes(total)) pages.push(total)
  }
  return pages
})

const getStatusInfo = (status: string) => {
  return STATUS_MAP[status] || STATUS_MAP.pending
}

const getImageUrl = (path: string) => {
  if (!path) return ''
  // 提取文件名
  const parts = path.split(/[\\/]/)
  const fileName = parts[parts.length - 1]

  // 如果服务器运行中，使用服务器 URL
  if (imageStore.serverUrl) {
    return `${imageStore.serverUrl}/images/${fileName}`
  }
  return `local-resource://${path}`
}

const previewImage = (path: string) => {
  const url = getImageUrl(path)
  if (url) {
    if (typeof imageStore.showPreview === 'function') {
      imageStore.showPreview(url)
    } else {
      window.open(url)
    }
  }
}

const formatDate = (date: string) => {
  return dayjs(date).format('YYYY-MM-DD HH:mm')
}

const goToImages = (imageId?: number) => {
  if (imageId) {
    router.push({ name: 'images', query: { id: imageId.toString() } })
  } else {
    router.push({ name: 'images' })
  }
}

const handleReset = async (id: number) => {
  if (!confirm('确定要将此记录重置为等待处理状态吗？')) return
  try {
    const result = await complaintStore.updateStatus(id, 'pending')
    if (result.success) {
      toast.success('已重置为等待状态')
    }
  } catch (error) {
    logger.error(error)
    toast.error('重置失败')
  }
}

const handleDelete = async (id: number) => {
  if (!confirm('确定要彻底删除这条投诉记录吗？此操作无法撤销。')) return
  try {
    const result = await complaintStore.removeRecord(id)
    if (result.success) {
      toast.success('删除成功')
    }
  } catch (error) {
    logger.error(error)
    toast.error('操作失败')
  }
}
</script>
