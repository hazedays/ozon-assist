<template>
  <div
    class="flex-1 flex flex-col items-center justify-center p-8 lg:p-12 relative overflow-hidden"
  >
    <!-- 顶部导航切换 -->
    <router-link
      to="/register"
      class="absolute top-8 right-8 text-xs font-bold text-slate-400 hover:text-ozon-blue transition-all animate-fade-in [animation-fill-mode:forwards] uppercase tracking-widest border-b border-transparent hover:border-ozon-blue/30 pb-1"
    >
      创建新账户
    </router-link>

    <div
      class="w-full max-w-sm space-y-8 flex flex-col animate-reveal [animation-fill-mode:forwards]"
    >
      <!-- 欢迎文案 -->
      <div class="mb-10 lg:mb-12 text-center">
        <h2 class="text-3xl font-black text-slate-800 tracking-tighter uppercase mb-4">欢迎回来</h2>
        <p class="text-sm text-slate-500 font-medium">使用您的邮箱和密码登录管理后台</p>
      </div>

      <!-- 登录表单 -->
      <form @submit.prevent="handleLogin" class="space-y-6">
        <!-- 邮箱输入 -->
        <div>
          <label
            for="email"
            class="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 italic"
          >
            <i class="ri-mail-line text-ozon-blue mr-1"></i>
            邮箱地址
          </label>
          <input
            id="email"
            v-model="email"
            type="email"
            required
            placeholder="请输入邮箱 (e.g., admin@example.com)"
            :disabled="isLoading"
            class="w-full px-5 py-4 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-ozon-blue focus:border-transparent bg-white shadow-sm transition-all disabled:bg-slate-50 disabled:text-slate-400 font-medium"
          />
        </div>

        <!-- 密码输入 -->
        <div>
          <label
            for="password"
            class="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 italic"
          >
            <i class="ri-lock-password-line text-ozon-blue mr-1"></i>
            密码
          </label>
          <div class="relative">
            <input
              id="password"
              v-model="password"
              :type="showPassword ? 'text' : 'password'"
              required
              placeholder="请输入密码"
              :disabled="isLoading"
              class="w-full px-5 py-4 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-ozon-blue focus:border-transparent bg-white shadow-sm transition-all disabled:bg-slate-50 disabled:text-slate-400 font-medium"
            />
            <button
              type="button"
              @click="showPassword = !showPassword"
              :disabled="isLoading"
              class="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
            >
              <i :class="showPassword ? 'ri-eye-off-line' : 'ri-eye-line'"></i>
            </button>
          </div>
        </div>

        <!-- 记住我与忘记密码 -->
        <div class="flex items-center justify-between">
          <label class="flex items-center gap-2 cursor-pointer group">
            <input
              v-model="rememberMe"
              type="checkbox"
              :disabled="isLoading"
              class="w-4 h-4 text-ozon-blue border-slate-300 rounded focus:ring-0 focus:ring-offset-0"
            />
            <span
              class="text-xs font-bold text-slate-500 group-hover:text-slate-700 transition-colors"
              >记住我</span
            >
          </label>
          <button
            type="button"
            @click="legalApi.openSubWindow('support')"
            class="text-xs font-bold text-ozon-blue hover:text-blue-600 transition-colors cursor-pointer"
          >
            无法登录？
          </button>
        </div>

        <!-- 错误消息提示 -->
        <div v-if="errorMessage" class="p-4 bg-red-50 border border-red-100 rounded-xl">
          <p
            class="text-[11px] font-bold text-red-600 flex items-center gap-2 uppercase tracking-wider italic leading-none"
          >
            <i class="ri-error-warning-fill text-sm"></i>
            {{ errorMessage }}
          </p>
        </div>

        <!-- 登录按钮 -->
        <button
          type="submit"
          :disabled="isLoading"
          class="w-full py-4 bg-ozon-blue hover:bg-blue-600 text-white font-bold rounded-xl transition-all shadow-xl shadow-blue-100 hover:shadow-2xl hover:shadow-blue-200 disabled:bg-slate-300 disabled:shadow-none disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm uppercase tracking-widest italic overflow-hidden relative"
        >
          <span class="relative z-10">{{ isLoading ? '正在建立会话...' : '立即安全登录' }}</span>
          <i v-if="isLoading" class="ri-loader-4-line animate-spin text-lg relative z-10"></i>
        </button>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * 登录页面业务组件
 * 提供基于 Appwrite 的会话创建功能及表单状态管理
 */
import { legalApi } from '@renderer/api/modules/legal'
import { useToast } from '@renderer/composables/use-toast'
import { useAuthStore } from '@renderer/stores/auth'
import { ref } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const authStore = useAuthStore()
const toast = useToast()

const email = ref('')
const password = ref('')
const showPassword = ref(false)
const rememberMe = ref(true)
const isLoading = ref(false)
const errorMessage = ref('')

/**
 * 提交登录表单
 */
const handleLogin = async () => {
  errorMessage.value = ''
  isLoading.value = true

  try {
    await authStore.login(email.value, password.value)
    toast.success('登录成功')
    router.push('/')
  } catch (error: any) {
    errorMessage.value = error.message || '登录失败，请检查邮箱和密码'
    console.error('Login error:', error)
  } finally {
    isLoading.value = false
  }
}
</script>

<style scoped>
/* 使用 Tailwind 4 的 @theme 变量定义的颜色 */
/* 无需在 style 块中硬编码颜色 */
</style>
