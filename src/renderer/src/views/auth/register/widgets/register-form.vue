<template>
  <form @submit.prevent="handleRegister" class="space-y-5">
    <!-- 邮箱输入 -->
    <div class="animate-reveal [animation-fill-mode:forwards] [animation-delay:550ms] opacity-0">
      <label
        for="email"
        class="block text-xs font-black text-slate-500 uppercase tracking-widest mb-1.5 group-focus-within:text-ozon-blue transition-colors flex items-center gap-1.5"
      >
        <i class="ri-mail-line text-ozon-blue"></i>
        账户邮箱
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
    <div class="animate-reveal [animation-fill-mode:forwards] [animation-delay:700ms] opacity-0">
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
          placeholder="至少8位字符"
          minlength="8"
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

    <!-- 确认密码输入 -->
    <div class="animate-reveal [animation-fill-mode:forwards] [animation-delay:850ms] opacity-0">
      <label
        for="confirmPassword"
        class="block text-xs font-black text-slate-500 uppercase tracking-widest mb-1.5 group-focus-within:text-ozon-blue transition-colors flex items-center gap-1.5"
      >
        <i class="ri-lock-password-line text-ozon-blue"></i>
        重复密码
      </label>
      <div class="relative group">
        <input
          id="confirmPassword"
          v-model="confirmPassword"
          :type="showConfirmPassword ? 'text' : 'password'"
          required
          placeholder="再次输入确认密码"
          :disabled="isLoading"
          class="w-full px-4 py-2.5 rounded-lg border-2 border-slate-100 text-xs focus:outline-none focus:ring-4 focus:ring-ozon-blue/10 focus:border-ozon-blue bg-white shadow-sm transition-all disabled:bg-slate-50 disabled:text-slate-400 font-bold group-hover:border-slate-200"
        />
        <button
          type="button"
          @click="showConfirmPassword = !showConfirmPassword"
          :disabled="isLoading"
          class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-ozon-blue transition-colors p-1.5"
        >
          <i :class="showConfirmPassword ? 'ri-eye-off-line' : 'ri-eye-line'" class="text-lg"></i>
        </button>
      </div>
    </div>

    <!-- 条款勾选 -->
    <div
      class="pt-1 animate-reveal [animation-fill-mode:forwards] [animation-delay:950ms] opacity-0"
    >
      <label class="flex items-center gap-2.5 cursor-pointer group">
        <input
          v-model="acceptTerms"
          type="checkbox"
          required
          :disabled="isLoading"
          class="w-4 h-4 text-ozon-blue border-2 border-slate-200 rounded focus:ring-0 focus:ring-offset-0 shrink-0 transition-all group-hover:border-ozon-blue"
        />
        <span
          class="text-[10px] text-slate-500 font-black leading-tight group-hover:text-slate-800 transition-colors uppercase tracking-tight"
        >
          同意并遵守
          <button
            type="button"
            @click="legalApi.openSubWindow('terms')"
            class="text-ozon-blue hover:text-blue-700 cursor-pointer font-black"
          >
            服务条款
          </button>
          与
          <button
            type="button"
            @click="legalApi.openSubWindow('privacy')"
            class="text-ozon-blue hover:text-blue-700 cursor-pointer font-black"
          >
            隐私政策
          </button>
        </span>
      </label>
    </div>

    <!-- 错误反馈 -->
    <div
      v-if="errorMessage"
      class="p-3 bg-red-50 border-2 border-red-100 rounded-lg animate-fade-in shadow-sm"
    >
      <p
        class="text-[10px] font-black text-red-600 flex items-center gap-2 uppercase tracking-wider"
      >
        <i class="ri-error-warning-fill text-sm"></i>
        {{ errorMessage }}
      </p>
    </div>

    <!-- 注册按钮 -->
    <div class="animate-reveal [animation-fill-mode:forwards] [animation-delay:1150ms] opacity-0">
      <button
        type="submit"
        :disabled="isLoading || !acceptTerms"
        class="w-full h-11 bg-ozon-blue hover:bg-blue-600 text-white font-black rounded-lg transition-all shadow-xl shadow-blue-100 hover:shadow-2xl hover:shadow-blue-200 disabled:bg-slate-300 disabled:shadow-none flex items-center justify-center gap-3 text-xs uppercase tracking-[0.2em] group"
      >
        <span>{{ isLoading ? '正在初始化核心档案' : '提交注册申请' }}</span>
        <i
          :class="
            isLoading
              ? 'ri-loader-4-line animate-spin'
              : 'ri-shield-user-line group-hover:translate-x-1 transition-transform'
          "
          class="text-lg"
        ></i>
      </button>
    </div>
  </form>
</template>

<script setup lang="ts">
/**
 * 注册表单组件 (Widget)
 * 职责：用户账号初始化流程管理，包含密码强度校验与法律声明确认
 */
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@renderer/stores/auth'
import { useToast } from '@renderer/composables/use-toast'
import { legalApi } from '@renderer/api/modules/legal'
import { RegisterParams } from '@renderer/api/types/params/auth'
import logger from '@renderer/core/logger'

const router = useRouter()
const authStore = useAuthStore()
const toast = useToast()

// 账户详情表单状态
const form = reactive<RegisterParams>({
  email: '',
  password: ''
})

// 表单独立状态
const confirmPassword = ref('')
const acceptTerms = ref(false)
const showPassword = ref(false)
const showConfirmPassword = ref(false)
const isLoading = ref(false)
const errorMessage = ref('')

/**
 * 提交注册表单，管理账户创建与初始会话流程
 */
const handleRegister = async () => {
  errorMessage.value = ''

  // 1. 验证密码匹配逻辑
  if (form.password !== confirmPassword.value) {
    errorMessage.value = '两次输入的密码不一致'
    return
  }

  // 2. 基础安全性校验
  if (form.password.length < 8) {
    errorMessage.value = '为了您的账户安全，密码必须至少 8 位以上'
    return
  }

  isLoading.value = true

  try {
    // 3. 执行注册并初始化会话
    await authStore.register({
      email: form.email,
      password: form.password,
      name: form.email.split('@')[0]
    })

    toast.success('注册成功，欢迎加入我们的服务')

    // 4. 重定向至仪表盘
    router.push('/')
  } catch (error: any) {
    errorMessage.value = error.message || '账户初始化失败，请稍后重试'
    logger.error('注册表单提交失败:', error)
  } finally {
    isLoading.value = false
  }
}
</script>
