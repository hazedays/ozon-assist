<template>
  <div class="flex flex-col" ref="widgetRoot">
    <div class="sticky top-14 z-40 bg-slate-50 pt-2">
      <div class="flex items-center justify-between pb-3 bg-slate-50">
        <label class="text-xs font-bold text-slate-500 uppercase italic">凭证库</label>
        <div class="flex items-center gap-4">
          <span class="text-[10px] text-slate-400 font-mono">共 {{ imageStore.total }} 条凭证</span>
        </div>
      </div>

      <div
        class="border border-slate-200 border-b-0 rounded-t-xl bg-white shadow-sm overflow-hidden"
      >
        <div class="p-3">
          <div class="relative">
            <i
              class="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs"
            ></i>
            <input
              v-model="searchQuery"
              @input="handleSearch"
              type="text"
              placeholder="搜索文件名或路径..."
              class="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-ozon outline-none bg-white transition-all font-mono"
            />
          </div>
        </div>

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
            v-for="img in imageStore.records"
            :key="img.id"
            class="transition-colors odd:bg-white even:bg-slate-50/80 hover:bg-blue-50"
          >
            <td :class="[TD_CLASS, 'py-3 text-center']">
              <div
                class="mx-auto w-12 h-12 rounded border border-slate-200 bg-slate-50 overflow-hidden flex items-center justify-center cursor-zoom-in relative"
                @click="previewImage(img)"
              >
                <img
                  v-if="!img.is_missing"
                  :src="imageStore.getImageUrl(img)"
                  class="max-w-full max-h-full object-contain hover:scale-110 transition-transform"
                />
                <div v-else class="flex flex-col items-center justify-center text-red-400">
                  <i class="ri-error-warning-fill text-lg"></i>
                </div>
              </div>
            </td>
            <td :class="[TD_CLASS, 'text-xs font-mono text-slate-600 font-medium truncate']">
              <div class="flex items-center gap-2">
                <span :class="{ 'text-red-500': img.is_missing }">{{ img.file_name }}</span>
                <span
                  v-if="img.is_missing"
                  class="px-1 py-0.5 bg-red-100 text-red-600 text-[8px] font-black uppercase rounded leading-none"
                  >文件丢失</span
                >
              </div>
            </td>
            <td
              :class="[
                TD_CLASS,
                'text-[11px] font-mono',
                img.is_missing ? 'text-red-300' : 'text-slate-400'
              ]"
            >
              {{ (img.file_size / 1024).toFixed(1) }} KB
            </td>
            <td
              :class="[
                TD_CLASS,
                'text-[11px] font-mono truncate',
                img.is_missing ? 'text-red-300' : 'text-slate-400'
              ]"
            >
              {{ img.file_path }}
            </td>
            <td class="px-6 py-2.5 text-right">
              <button
                @click="handleDelete(img.id)"
                class="text-slate-300 hover:text-red-500 transition-colors p-1 rounded-lg hover:bg-red-50 cursor-pointer"
              >
                <i class="ri-delete-bin-7-line text-sm"></i>
              </button>
            </td>
          </tr>
          <tr v-if="imageStore.records.length === 0">
            <td
              colspan="5"
              class="px-6 py-20 text-center text-xs text-slate-300 italic tracking-widest uppercase"
            >
              {{ imageStore.loading ? '正在加载数据...' : '没有找到凭证图片' }}
            </td>
          </tr>
        </tbody>
      </table>

      <div
        v-if="totalPages > 0"
        class="px-6 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between"
      >
        <div class="flex items-center gap-4">
          <div class="text-[10px] text-slate-400 font-mono font-bold uppercase">
            第 {{ imageStore.currentPage }} / {{ totalPages }} 页
          </div>
          <select
            v-model="pageSize"
            @change="imageStore.setPageSize(pageSize)"
            class="px-2 py-0.5 text-[10px] border border-slate-200 rounded bg-white outline-none focus:ring-1 focus:ring-ozon cursor-pointer font-mono"
          >
            <option v-for="size in [10, 20, 50, 100]" :key="size" :value="size">
              {{ size }} / 页
            </option>
          </select>
        </div>
        <div class="flex items-center gap-1">
          <button
            @click="imageStore.setPage(imageStore.currentPage - 1)"
            :disabled="imageStore.currentPage <= 1"
            class="p-1 px-2 text-[10px] font-bold rounded-lg border border-slate-200 disabled:opacity-30 cursor-pointer"
          >
            <i class="ri-arrow-left-s-line"></i>
          </button>
          <button
            @click="imageStore.setPage(imageStore.currentPage + 1)"
            :disabled="imageStore.currentPage >= totalPages"
            class="p-1 px-2 text-[10px] font-bold rounded-lg border border-slate-200 disabled:opacity-30 cursor-pointer"
          >
            <i class="ri-arrow-right-s-line"></i>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useImageStore } from '@renderer/stores/image'
import { useToast } from '@renderer/composables/use-toast'

const route = useRoute()
const imageStore = useImageStore()
const toast = useToast()
const widgetRoot = ref<HTMLElement | null>(null)

const searchQuery = ref((route.query.search as string) || '')
const pageSize = ref(20)

const COLUMNS = [
  { label: '预览', width: '100px', align: 'center' },
  { label: '文件名', width: '25%' },
  { label: '大小', width: '12%' },
  { label: '路径', width: '' },
  { label: '操作', width: '80px', align: 'right' }
]

const TD_CLASS = 'px-6 border-r border-slate-100/80'
const totalPages = computed(() => Math.ceil(imageStore.total / imageStore.pageSize))

let searchTimer: any = null
const handleSearch = () => {
  if (searchTimer) clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    imageStore.setFilter({ search: searchQuery.value })
  }, 300)
}

const previewImage = (img: any) => {
  const url = imageStore.getImageUrl(img)
  if (url) {
    // 强制检查方法是否存在，防止 HMR 延迟导致的脚本错误
    if (typeof imageStore.showPreview === 'function') {
      imageStore.showPreview(url)
    } else {
      window.open(url)
    }
  }
}

const scrollToWidget = () => {
  if (widgetRoot.value) {
    const elementPosition = widgetRoot.value.getBoundingClientRect().top + window.scrollY
    window.scrollTo({ top: elementPosition - 56, behavior: 'smooth' })
  }
}

watch(() => imageStore.currentPage, scrollToWidget)
watch(() => imageStore.pageSize, scrollToWidget)

const handleDelete = async (id: number) => {
  if (!confirm('确定要彻底删除这张凭证吗？此操作无法撤销。')) return
  try {
    await imageStore.removeRecord(id)
    toast.success('删除成功')
  } catch (error) {
    toast.error('操作失败')
  }
}

onMounted(() => {
  imageStore.init()
  if (route.query.id) {
    // 如果是从投诉进来的，可以根据文件名或者特定 ID 搜索
    // 这里简单处理为根据 ID 搜索文件名的 mock 逻辑，或者直接根据 ID
    imageStore.setFilter({ search: route.query.id as string })
  } else {
    imageStore.refresh()
  }
})
</script>
