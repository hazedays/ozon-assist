<template>
  <div class="min-h-screen flex flex-col bg-slate-50 text-slate-900">
    <AppHeader />

    <!-- 内容区域 -->
    <main class="flex-1 overflow-visible">
      <router-view />
    </main>

    <!-- 全局弹窗与元素 -->
    <ImagePreviewModal v-model:visible="imageStore.previewVisible" :url="imageStore.previewUrl" />
  </div>
</template>

<script setup lang="ts">
/**
 * 默认布局组件
 * 包含通用顶部导航和侧边栏（如果需要）
 */
import AppHeader from './components/app-header.vue'
import ImagePreviewModal from '../components/image-preview-modal.vue'
import { useImageStore } from '../stores/image'

const imageStore = useImageStore()
</script>
