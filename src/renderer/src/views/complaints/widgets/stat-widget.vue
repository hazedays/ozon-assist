<template>
  <div class="grid grid-cols-5 gap-4 mb-6">
    <div
      v-for="item in statItems"
      :key="item.label"
      class="bg-white p-4 rounded-xl border border-slate-200 shadow-sm transition-all hover:shadow-md"
    >
      <div class="flex items-center gap-3">
        <div
          :class="[item.bgClass, item.textClass]"
          class="w-10 h-10 rounded-lg flex items-center justify-center text-xl"
        >
          <i :class="item.icon"></i>
        </div>
        <div>
          <p class="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            {{ item.label }}
          </p>
          <p class="text-lg font-bold text-slate-900 tabular-nums leading-tight">
            {{ item.value }}
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useComplaintStore } from '@renderer/stores/complaint'

const complaintStore = useComplaintStore()
const stat = computed(() => complaintStore.stat)

const statItems = computed(() => [
  {
    label: '总投诉',
    value: stat.value?.totalComplaints || 0,
    icon: 'ri-file-list-3-line',
    bgClass: 'bg-blue-50',
    textClass: 'text-ozon'
  },
  {
    label: '正在处理',
    value: stat.value?.processingComplaints || 0,
    icon: 'ri-loader-4-line',
    bgClass: 'bg-indigo-50',
    textClass: 'text-indigo-600 font-bold animate-pulse'
  },
  {
    label: '成功',
    value: stat.value?.successComplaints || 0,
    icon: 'ri-checkbox-circle-line',
    bgClass: 'bg-emerald-50',
    textClass: 'text-emerald-600'
  },
  {
    label: '失败',
    value: stat.value?.failedComplaints || 0,
    icon: 'ri-close-circle-line',
    bgClass: 'bg-red-50',
    textClass: 'text-red-600'
  },
  {
    label: '超时',
    value: stat.value?.timeoutComplaints || 0,
    icon: 'ri-time-line',
    bgClass: 'bg-amber-50',
    textClass: 'text-amber-600'
  }
])
</script>
