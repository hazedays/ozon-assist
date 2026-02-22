<template>
  <header
    class="h-14 border-b border-slate-200 flex items-center px-6 bg-white shrink-0 sticky top-0 z-50"
  >
    <div class="flex items-center gap-2 mr-10 cursor-default select-none">
      <img src="@renderer/assets/logo.png" alt="Logo" class="w-7 h-7 rounded-lg shadow-sm" />
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
            $route.name === 'complaints' ? 'text-blue-100' : 'text-slate-400 group-hover:text-ozon'
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

    <!-- 用户菜单 -->
    <div v-if="authStore.user" class="ml-4 flex items-center gap-3">
      <div class="h-4 w-px bg-slate-200"></div>
      <div class="flex items-center gap-2">
        <div
          class="w-7 h-7 rounded-full bg-linear-to-br from-ozon to-blue-600 flex items-center justify-center text-white text-xs font-bold shadow-sm"
        >
          {{ userInitial }}
        </div>
        <span class="text-xs font-bold text-slate-700">{{ authStore.user.name }}</span>
      </div>
      <button
        @click="handleLogout"
        class="px-3 py-1.5 rounded-lg text-xs font-bold text-slate-500 hover:bg-red-50 hover:text-red-600 transition-all flex items-center gap-1.5"
        title="登出"
      >
        <i class="ri-logout-box-line"></i>
        登出
      </button>
    </div>
  </header>
</template>

<script setup lang="ts">
/**
 * 顶部导航组件
 * 包含 Logo、菜单导航、全局统计和用户信息
 */
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useComplaintStore } from '../../stores/complaint'
import { useAuthStore } from '../../stores/auth'
import { useToast } from '../../composables/use-toast'

const router = useRouter()
const complaintStore = useComplaintStore()
const authStore = useAuthStore()
const toast = useToast()

/** 获取用户名首字母 */
const userInitial = computed(() => {
  if (!authStore.user?.name) return 'U'
  return authStore.user.name.charAt(0).toUpperCase()
})

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

/** 处理登出 */
const handleLogout = async () => {
  try {
    await authStore.logout()
    toast.success('已退出登录')
    router.push('/login')
  } catch (error: any) {
    toast.error(error.message || '登出失败')
  }
}
</script>
