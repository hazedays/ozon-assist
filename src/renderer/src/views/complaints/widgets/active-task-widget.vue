<template>
  <div
    v-if="complaintStore.activeTasks.length > 0"
    class="bg-ozon rounded-2xl shadow-xl p-6 text-white overflow-hidden relative group transition-all"
  >
    <!-- 背景装饰 -->
    <div
      class="absolute -right-4 -top-4 w-32 h-32 bg-white/10 rounded-full blur-3xl group-hover:scale-150 transition-transform"
    ></div>
    <div class="absolute -left-4 -bottom-4 w-24 h-24 bg-blue-400/20 rounded-full blur-2xl"></div>

    <div class="relative z-10">
      <div class="flex items-center justify-between mb-6">
        <div class="flex items-center gap-3">
          <div
            class="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center backdrop-blur-md"
          >
            <i class="ri-loader-4-line text-xl animate-spin"></i>
          </div>
          <div>
            <h3 class="text-sm font-bold uppercase tracking-wider italic">正在处理的任务</h3>
            <p class="text-[10px] text-blue-100 font-bold uppercase tracking-widest mt-0.5">
              Currently Processing Tasks
            </p>
          </div>
        </div>
        <div class="px-3 py-1 bg-white/20 rounded-full backdrop-blur-md">
          <span class="text-[10px] font-bold uppercase"
            >{{ complaintStore.activeTasks.length }} 个活跃任务</span
          >
        </div>
      </div>

      <div class="space-y-3">
        <div
          v-for="task in complaintStore.activeTasks"
          :key="task.id"
          class="bg-white/10 hover:bg-white/15 transition-colors rounded-xl p-4 flex items-center justify-between group/item"
        >
          <div class="flex items-center gap-4">
            <div
              class="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center text-blue-100 overflow-hidden border border-white/5"
            >
              <img
                v-if="task.image_path"
                :src="'local-resource://' + task.image_path"
                class="w-full h-full object-cover"
              />
              <i v-else class="ri-image-line text-lg"></i>
            </div>
            <div>
              <div class="flex items-center gap-2">
                <span class="text-xs font-bold font-mono tracking-wider">{{ task.sku }}</span>
                <span class="px-1.5 py-0.5 bg-blue-400/30 rounded text-[9px] font-bold uppercase"
                  >Processing</span
                >
              </div>
              <p class="text-[10px] text-blue-100/70 mt-1 truncate max-w-[200px] italic">
                {{ task.reason || 'No reason provided' }}
              </p>
            </div>
          </div>

          <div class="flex items-center gap-6">
            <div class="text-right hidden sm:block">
              <p class="text-[9px] font-bold text-blue-200 uppercase tracking-widest">执行耗时</p>
              <p class="text-[10px] font-bold mt-0.5 font-mono bg-white/10 px-1.5 py-0.5 rounded">
                {{ getDuration(task.started_at) }}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useComplaintStore } from '@renderer/stores/complaint'
import dayjs from 'dayjs'
import duration from 'dayjs/plugin/duration'

dayjs.extend(duration)

const complaintStore = useComplaintStore()
const now = ref(dayjs())
let timer: NodeJS.Timeout | null = null

const getDuration = (startTime: string) => {
  if (!startTime) return '00:00'

  // SQLite CURRENT_TIMESTAMP 是 UTC 时间，追加 Z 强制按 UTC 解析
  const start = dayjs(startTime.includes(' ') ? startTime.replace(' ', 'T') + 'Z' : startTime)

  // 必须引用 now.value 才能触发每秒一次的响应式更新
  const diff = Math.max(0, now.value.diff(start))
  const dur = dayjs.duration(diff)

  const minutes = Math.floor(dur.asMinutes())
  const seconds = dur.seconds()

  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
}

onMounted(() => {
  timer = setInterval(() => {
    now.value = dayjs()
  }, 1000)
})

onUnmounted(() => {
  if (timer) clearInterval(timer)
})
</script>
