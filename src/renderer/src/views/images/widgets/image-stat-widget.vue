<template>
  <div class="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
    <div
      v-for="stat in stats"
      :key="stat.label"
      class="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow group overflow-hidden relative"
    >
      <div
        class="absolute -right-3 -bottom-3 opacity-[0.03] group-hover:scale-110 transition-transform duration-500"
      >
        <i :class="[stat.icon, 'text-4xl text-slate-800 font-black']"></i>
      </div>

      <div class="flex items-start justify-between">
        <div class="space-y-0.5">
          <p class="text-[9px] font-bold text-slate-400 uppercase tracking-widest italic">
            {{ stat.label }}
          </p>
          <div class="flex items-baseline gap-1">
            <h3 class="text-xl font-black text-slate-800 font-mono tracking-tighter">
              {{ stat.value }}
            </h3>
            <span class="text-[9px] font-bold text-slate-400 uppercase">{{ stat.unit }}</span>
          </div>
        </div>
        <div :class="[stat.color, 'w-8 h-8 rounded-lg flex items-center justify-center shadow-sm']">
          <i :class="[stat.icon, 'text-base text-white']"></i>
        </div>
      </div>

      <div class="mt-2.5 flex items-center gap-1.5 grayscale opacity-50">
        <span class="text-[8px] font-black text-slate-400 font-mono">{{ stat.desc }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useImageStore } from '@renderer/stores/image'

const imageStore = useImageStore()

const totalSizeFormatted = computed(() => {
  const bytes = imageStore.totalSize
  if (bytes < 1024) return { val: bytes.toFixed(1), unit: 'B' }
  if (bytes < 1024 * 1024) return { val: (bytes / 1024).toFixed(1), unit: 'KB' }
  return { val: (bytes / (1024 * 1024)).toFixed(2), unit: 'MB' }
})

const stats = computed(() => [
  {
    label: '凭证总数',
    value: imageStore.total,
    unit: 'FILES',
    icon: 'ri-image-2-line',
    color: 'bg-ozon',
    desc: 'IMAGES DATABASE'
  },
  {
    label: '空间占用',
    value: totalSizeFormatted.value.val,
    unit: totalSizeFormatted.value.unit,
    icon: 'ri-hard-drive-2-line',
    color: 'bg-indigo-600',
    desc: 'LOCAL STORAGE USAGE'
  },
  {
    label: '页面效率',
    value: imageStore.pageSize,
    unit: 'IPS',
    icon: 'ri-speed-up-line',
    color: 'bg-emerald-600',
    desc: 'IMAGES PER SECTION'
  }
])
</script>
