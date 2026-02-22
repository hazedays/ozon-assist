<template>
  <div
    class="flex-1 flex flex-col items-center justify-center p-8 lg:p-12 relative overflow-hidden"
  >
    <!-- 顶部状态切换 (右上角) -->
    <router-link
      to="/login"
      class="absolute top-8 right-8 text-xs font-bold text-slate-400 hover:text-ozon-blue transition-all animate-fade-in [animation-fill-mode:forwards] uppercase tracking-widest border-b border-transparent hover:border-ozon-blue/30 pb-1"
    >
      立即登录
    </router-link>

    <div
      class="w-full max-w-sm space-y-8 flex flex-col animate-reveal [animation-fill-mode:forwards]"
    >
      <!-- 欢迎文案 -->
      <div class="mb-10 lg:mb-12 text-center">
        <h2 class="text-3xl font-black text-slate-800 tracking-tighter uppercase mb-4">
          创建新账户
        </h2>
        <p class="text-sm text-slate-500 font-medium">加入 Ozon Assist，开启自动化投诉之旅</p>
      </div>

      <!-- 注册表单 -->
      <form @submit.prevent="handleRegister" class="space-y-5">
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
            placeholder="请输入有效邮箱"
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
            设置密码
          </label>
          <div class="relative">
            <input
              id="password"
              v-model="password"
              :type="showPassword ? 'text' : 'password'"
              required
              placeholder="至少8位字符"
              minlength="8"
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

        <!-- 确认密码输入 -->
        <div>
          <label
            for="confirmPassword"
            class="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 italic"
          >
            <i class="ri-lock-password-line text-ozon-blue mr-1"></i>
            确认密码
          </label>
          <div class="relative">
            <input
              id="confirmPassword"
              v-model="confirmPassword"
              :type="showConfirmPassword ? 'text' : 'password'"
              required
              placeholder="请再次输入密码"
              :disabled="isLoading"
              class="w-full px-5 py-4 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-ozon-blue focus:border-transparent bg-white shadow-sm transition-all disabled:bg-slate-50 disabled:text-slate-400 font-medium"
            />
            <button
              type="button"
              @click="showConfirmPassword = !showConfirmPassword"
              :disabled="isLoading"
              class="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
            >
              <i :class="showConfirmPassword ? 'ri-eye-off-line' : 'ri-eye-line'"></i>
            </button>
          </div>
        </div>

        <!-- 条款勾选 -->
        <div class="pt-2">
          <label class="flex items-center gap-3 cursor-pointer group">
            <input
              v-model="acceptTerms"
              type="checkbox"
              required
              :disabled="isLoading"
              class="w-4 h-4 text-ozon-blue border-slate-300 rounded focus:ring-0 focus:ring-offset-0 shrink-0"
            />
            <span
              class="text-xs text-slate-500 font-medium leading-relaxed group-hover:text-slate-700"
            >
              本人已阅读并完全同意 Ozon Assist 的
              <button
                type="button"
                @click="legalApi.openSubWindow('terms')"
                class="text-ozon-blue font-bold hover:underline cursor-pointer"
              >
                服务条款
              </button>
              与
              <button
                type="button"
                @click="legalApi.openSubWindow('privacy')"
                class="text-ozon-blue font-bold hover:underline cursor-pointer"
              >
                隐私政策</button
              >。
            </span>
          </label>
        </div>

        <!-- 错误提示 -->
        <div v-if="errorMessage" class="p-4 bg-red-50 border border-red-100 rounded-xl">
          <p
            class="text-[11px] font-bold text-red-600 flex items-center gap-2 uppercase tracking-wider italic"
          >
            <i class="ri-error-warning-fill text-sm"></i>
            {{ errorMessage }}
          </p>
        </div>

        <!-- 注册按钮 -->
        <button
          type="submit"
          :disabled="isLoading || !acceptTerms"
          class="w-full py-4 bg-linear-to-r from-ozon-blue to-blue-600 hover:from-blue-600 hover:to-ozon-blue text-white font-bold rounded-xl transition-all shadow-xl shadow-blue-100 hover:shadow-2xl hover:shadow-blue-200 disabled:bg-slate-300 disabled:from-slate-300 disabled:to-slate-300 disabled:shadow-none disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm uppercase tracking-[0.2em] italic"
        >
          <span class="relative z-10">{{
            isLoading ? '正在初始化账户...' : '立即开启自动化'
          }}</span>
          <i v-if="isLoading" class="ri-loader-4-line animate-spin text-lg relative z-10"></i>
        </button>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * 注册页面业务组件
 * 调用 AuthStore 进行账户创建及初始会话管理
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
const confirmPassword = ref('')
const showPassword = ref(false)
const showConfirmPassword = ref(false)
const acceptTerms = ref(false)
const isLoading = ref(false)
const errorMessage = ref('')

/**
 * 提交注册表单
 */
const handleRegister = async () => {
  errorMessage.value = ''

  // 验证密码匹配
  if (password.value !== confirmPassword.value) {
    errorMessage.value = '两次输入的密码不一致'
    return
  }

  // 验证密码长度
  if (password.value.length < 8) {
    errorMessage.value = '密码长度至少为8位'
    return
  }

  isLoading.value = true

  try {
    await authStore.register(email.value, password.value, email.value.split('@')[0])
    toast.success('注册成功，欢迎使用 OzonAssist！')
    router.push('/')
  } catch (error: any) {
    errorMessage.value = error.message || '注册失败，请稍后重试'
    console.error('Register error:', error)
  } finally {
    isLoading.value = false
  }
}
</script>

<style scoped>
/* 样式已迁移至 Tailwind 4 主题变量，此处目前无需自定义样式覆盖 */
</style>
