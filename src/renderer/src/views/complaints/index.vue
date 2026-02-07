<template>
  <div class="max-w-5xl mx-auto flex flex-col gap-6 p-6">
    <!-- 顶部说明 -->
    <div class="flex items-center gap-2 px-1">
      <i class="ri-information-line text-slate-400"></i>
      <p class="text-xs text-slate-500 font-medium">
        投诉管理中心用于导入商品 SKU 并监控自动化投诉进度。系统会自动分发任务至浏览器插件执行。
      </p>
    </div>

    <!-- 顶部：统计与导入 -->
    <div class="space-y-6">
      <StatWidget />
      <ActiveTaskWidget />
      <ImportWidget />
    </div>

    <!-- 底部：记录表格 -->
    <RecordWidget />
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import StatWidget from './widgets/stat-widget.vue'
import ActiveTaskWidget from './widgets/active-task-widget.vue'
import ImportWidget from './widgets/import-widget.vue'
import RecordWidget from './widgets/record-widget.vue'
import { useComplaintStore } from '@renderer/stores/complaint'

const complaintStore = useComplaintStore()

onMounted(() => {
  complaintStore.init()
})
</script>
