<template>
  <div class="max-w-5xl mx-auto flex flex-col gap-6 p-6">
    <!-- 顶部说明 -->
    <div class="flex items-center gap-2 px-1">
      <i class="ri-information-line text-slate-400"></i>
      <p class="text-xs text-slate-500 font-medium">
        凭证库用于管理投诉时所需的图片证据。支持 MD5 去重，已上传的图片可直接在投诉记录中引用。
      </p>
    </div>

    <!-- Stats -->
    <ImageStatWidget />

    <!-- Import -->
    <ImageImportWidget />

    <!-- Table -->
    <ImageListWidget />
  </div>
</template>

<script setup lang="ts">
import ImageStatWidget from './widgets/image-stat-widget.vue'
import ImageImportWidget from './widgets/image-import-widget.vue'
import ImageListWidget from './widgets/image-list-widget.vue'
</script>
