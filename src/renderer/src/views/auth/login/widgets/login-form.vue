<template>
  <form @submit.prevent="handleLogin" class="space-y-5">
    <!-- 邮箱输入 -->
    <div class="animate-reveal [animation-fill-mode:forwards] [animation-delay:600ms] opacity-0">
      <label
        for="email"
        class="block text-xs font-black text-slate-500 uppercase tracking-widest mb-1.5 group-focus-within:text-ozon-blue transition-colors flex items-center gap-1.5"
      >
        <i class="ri-mail-line text-ozon-blue"></i>
        登录账号
      </label>
      <div class="relative group">
        <input
          id="email"
          v-model="form.email"
          type="email"
          required
          placeholder="请输入您的电子邮箱"
          :disabled="isLoading"
          class="w-full px-4 py-2.5 rounded-lg border-2 border-slate-100 text-xs focus:outline-none focus:ring-4 focus:ring-ozon-blue/10 focus:border-ozon-blue bg-white shadow-sm transition-all disabled:bg-slate-50 disabled:text-slate-400 font-bold group-hover:border-slate-200"
        />
      </div>
    </div>

    <!-- 密码输入 -->
    <div class="animate-reveal [animation-fill-mode:forwards] [animation-delay:750ms] opacity-0">
      <label
        for="password"
        class="block text-xs font-black text-slate-500 uppercase tracking-widest mb-1.5 group-focus-within:text-ozon-blue transition-colors flex items-center gap-1.5"
      >
        <i class="ri-lock-password-line text-ozon-blue"></i>
        安全密码
      </label>
      <div class="relative group">
        <input
          id="password"
          v-model="form.password"
          :type="showPassword ? 'text' : 'password'"
          required
          placeholder="请输入您的登录密码"
          :disabled="isLoading"
          class="w-full px-4 py-2.5 rounded-lg border-2 border-slate-100 text-xs focus:outline-none focus:ring-4 focus:ring-ozon-blue/10 focus:border-ozon-blue bg-white shadow-sm transition-all disabled:bg-slate-50 disabled:text-slate-400 font-bold group-hover:border-slate-200"
        />
        <button
          type="button"
          @click="showPassword = !showPassword"
          :disabled="isLoading"
          class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-ozon-blue transition-colors p-1.5"
        >
          <i :class="showPassword ? 'ri-eye-off-line' : 'ri-eye-line'" class="text-lg"></i>
        </button>
      </div>
    </div>

    <!-- 辅助选项 -->
    <div
      class="flex items-center justify-between animate-reveal [animation-fill-mode:forwards] [animation-delay:900ms] opacity-0"
    >
      <label class="flex items-center gap-2 cursor-pointer group">
        <input
          v-model="rememberMe"
          type="checkbox"
          :disabled="isLoading"
          class="w-4 h-4 text-ozon-blue border-2 border-slate-200 rounded focus:ring-0 focus:ring-offset-0 transition-all group-hover:border-ozon-blue"
        />
        <span
          class="text-[10px] font-black text-slate-400 uppercase tracking-widest group-hover:text-slate-600 transition-colors"
          >自动登录模式</span
        >
      </label>
      <button
        type="button"
        @click="legalApi.openSubWindow('support')"
        class="text-[10px] font-black text-ozon-blue hover:text-blue-700 transition-all cursor-pointer uppercase tracking-widest"
      >
        找回访问权限
      </button>
    </div>

    <!-- 错误反馈 -->
    <div
      v-if="errorMessage"
      class="p-3 bg-red-50 border-2 border-red-100 rounded-lg animate-fade-in shadow-sm"
    >
      <p
        class="text-[10px] font-black text-red-600 flex items-center gap-2 uppercase tracking-wider leading-none"
      >
        <i class="ri-error-warning-fill text-sm"></i>
        {{ errorMessage }}
      </p>
    </div>

    <!-- 提交按钮 -->
    <div class="animate-reveal [animation-fill-mode:forwards] [animation-delay:1000ms] opacity-0">
      <button
        type="submit"
        :disabled="isLoading"
        class="w-full h-11 bg-ozon-blue hover:bg-blue-600 text-white font-black rounded-lg transition-all shadow-xl shadow-blue-100 hover:shadow-2xl hover:shadow-blue-200 disabled:bg-slate-300 disabled:shadow-none flex items-center justify-center gap-3 text-xs uppercase tracking-[0.2em] group"
      >
        <span>{{ isLoading ? '正在同步云端身份' : '立即建立安全会话' }}</span>
        <i
          :class="
            isLoading
              ? 'ri-loader-4-line animate-spin'
              : 'ri-login-box-line group-hover:translate-x-1 transition-transform'
          "
          class="text-lg"
        ></i>
      </button>
    </div>
  </form>
</template>

<script setup lang="ts">
/**
 * 登录表单组件 (Widget)
 * 职责：处理登录表单交互，管理本地表单状态，调用 authStore 进行认证
 */
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@renderer/stores/auth'
import { useToast } from '@renderer/composables/use-toast'
import { legalApi } from '@renderer/api/modules/legal'
import { LoginParams } from '@renderer/api/types/params/auth'
import logger from '@renderer/core/logger'

const router = useRouter()
const authStore = useAuthStore()
const toast = useToast()

// 表单数据绑定
const form = reactive<LoginParams>({
  email: '',
  password: ''
})

// UI 状态管理
const showPassword = ref(false)
const rememberMe = ref(true)
const isLoading = ref(false)
const errorMessage = ref('')

/**
 * 提交登录表单，执行身份验证逻辑
 */
const handleLogin = async () => {
  if (!form.email || !form.password) return

  errorMessage.value = ''
  isLoading.value = true

  try {
    await authStore.login({
      email: form.email,
      password: form.password
    })

    toast.success('身份验证成功')

    // 登录成功后跳转至首页
    router.push('/')
  } catch (error: any) {
    errorMessage.value = error.message || '登录失败，请核实邮箱与密码'
    logger.error('登录表单提交失败:', error)
  } finally {
    isLoading.value = false
  }
}
</script>
