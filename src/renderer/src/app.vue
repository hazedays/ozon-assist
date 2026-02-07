<template>
  <div class="min-h-screen flex flex-col bg-slate-50 text-slate-900">
    <!-- 顶部导航 -->
    <header
      class="h-14 border-b border-slate-200 flex items-center px-6 bg-white shrink-0 sticky top-0 z-50"
    >
      <div class="flex items-center gap-2 mr-10 cursor-default select-none">
        <img src="./assets/logo.png" alt="Logo" class="w-7 h-7 rounded-lg shadow-sm" />
        <h1 class="text-sm font-black tracking-tighter uppercase italic text-slate-800">
          Ozon<span class="text-ozon">Assist</span>
        </h1>
      </div>

      <!-- 导航菜单 -->
      <nav class="flex items-center gap-1">
        <router-link
          to="/"
          class="px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 group"
          :class="[
            $route.name === 'complaints'
              ? 'bg-ozon text-white shadow-sm shadow-blue-100'
              : 'text-slate-500 hover:bg-blue-50 hover:text-ozon'
          ]"
        >
          <i
            class="ri-list-check-2 transition-transform group-hover:scale-110"
            :class="[
              $route.name === 'complaints'
                ? 'text-blue-100'
                : 'text-slate-400 group-hover:text-ozon'
            ]"
          ></i>
          投诉记录
        </router-link>
        <router-link
          to="/images"
          class="px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 group"
          :class="[
            $route.name === 'images'
              ? 'bg-ozon text-white shadow-sm shadow-blue-100'
              : 'text-slate-500 hover:bg-blue-50 hover:text-ozon'
          ]"
        >
          <i
            class="ri-image-2-line transition-transform group-hover:scale-110"
            :class="[
              $route.name === 'images' ? 'text-blue-100' : 'text-slate-400 group-hover:text-ozon'
            ]"
          ></i>
          凭证库
        </router-link>
        <router-link
          to="/help"
          class="px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 group"
          :class="[
            $route.name === 'help'
              ? 'bg-ozon text-white shadow-sm shadow-blue-100'
              : 'text-slate-500 hover:bg-blue-50 hover:text-ozon'
          ]"
        >
          <i
            class="ri-question-line transition-transform group-hover:scale-110"
            :class="[
              $route.name === 'help' ? 'text-blue-100' : 'text-slate-400 group-hover:text-ozon'
            ]"
          ></i>
          使用说明
        </router-link>
      </nav>

      <!-- 紧凑型统计信息 -->
      <div
        v-if="complaintStore.stat"
        class="flex gap-4 ml-auto items-center bg-slate-50/50 px-4 py-1.5 rounded-xl border border-slate-100"
      >
        <div class="flex items-center gap-1.5 translate-y-[0.5px]">
          <span class="text-[9px] font-bold text-slate-400 leading-none">任务</span>
          <span class="text-xs font-bold tabular-nums text-slate-700 leading-none">{{
            complaintStore.stat.totalComplaints
          }}</span>
        </div>

        <div class="w-px h-3 bg-slate-200"></div>

        <div class="flex items-center gap-3">
          <div
            v-for="stat in headerStats"
            :key="stat.label"
            class="flex items-center gap-1.5 group relative cursor-help"
          >
            <div
              :class="[stat.color, stat.animate ? 'animate-pulse' : '', 'w-1.5 h-1.5 rounded-full']"
            ></div>
            <span :class="[stat.textClass, 'text-xs font-bold tabular-nums leading-none']">{{
              stat.value
            }}</span>
            <div
              class="absolute top-full left-1/2 -translate-x-1/2 mt-2 px-2 py-1 bg-slate-900 text-white text-[10px] font-bold rounded shadow-xl opacity-0 group-hover:opacity-100 transition-all transform scale-95 group-hover:scale-100 pointer-events-none whitespace-nowrap z-60"
            >
              <div
                class="absolute bottom-full left-1/2 -translate-x-1/2 border-4 border-transparent border-b-slate-900"
              ></div>
              {{ stat.label }}
            </div>
          </div>
        </div>

        <div class="w-px h-3 bg-slate-200"></div>

        <div class="flex items-center gap-2 group relative cursor-help translate-y-[0.5px]">
          <i class="ri-image-2-line text-purple-400 text-xs leading-none"></i>
          <span class="text-xs font-bold text-purple-600 tabular-nums leading-none">{{
            complaintStore.stat.totalImages
          }}</span>
          <div
            class="absolute top-full left-1/2 -translate-x-1/2 mt-2 px-2 py-1 bg-slate-900 text-white text-[10px] font-bold rounded shadow-xl opacity-0 group-hover:opacity-100 transition-all transform scale-95 group-hover:scale-100 pointer-events-none whitespace-nowrap z-60"
          >
            <div
              class="absolute bottom-full left-1/2 -translate-x-1/2 border-4 border-transparent border-b-slate-900"
            ></div>
            凭证库数量
          </div>
        </div>
      </div>
    </header>

    <!-- 内容区域 -->
    <main class="flex-1 overflow-visible">
      <router-view />
    </main>

    <!-- Toast 通知 -->
    <Toast />

    <!-- 全局图片预览 -->
    <ImagePreviewModal v-model:visible="imageStore.previewVisible" :url="imageStore.previewUrl" />
  </div>
</template>

<script setup lang="ts">
import { onMounted, computed } from 'vue'
import Toast from './components/toast.vue'
import ImagePreviewModal from './components/image-preview-modal.vue'
import { useImageStore } from './stores/image'
import { useComplaintStore } from './stores/complaint'

const imageStore = useImageStore()
const complaintStore = useComplaintStore()

/** 顶部状态栏统计项定义 */
const headerStats = computed(() => [
  {
    label: '正在处理',
    value: complaintStore.stat?.processingComplaints || 0,
    color: 'bg-ozon',
    textClass: 'text-ozon',
    animate: true
  },
  {
    label: '成功',
    value: complaintStore.stat?.successComplaints || 0,
    color: 'bg-emerald-500',
    textClass: 'text-emerald-600'
  },
  {
    label: '失败',
    value: complaintStore.stat?.failedComplaints || 0,
    color: 'bg-red-500',
    textClass: 'text-red-600'
  },
  {
    label: '超时',
    value: complaintStore.stat?.timeoutComplaints || 0,
    color: 'bg-amber-500',
    textClass: 'text-amber-600'
  }
])

onMounted(() => {
  imageStore.init()
  complaintStore.init()
})
</script>
