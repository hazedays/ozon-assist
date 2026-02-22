<template>
  <div class="flex-1 flex flex-col items-center p-8 lg:p-12 relative overflow-hidden h-screen">
    <!-- 顶部状态切换 (采用 fixed 确保其不随容器滚动且保持在视口顶端) -->
    <div class="fixed top-8 right-8 z-50">
      <router-link
        to="/auth/login"
        class="text-xs font-black text-slate-400 hover:text-ozon-blue transition-all uppercase tracking-widest flex items-center gap-1 group"
      >
        <i class="ri-arrow-left-line transition-transform group-hover:-translate-x-1"></i>
        <span>返回账号登录</span>
      </router-link>
    </div>

    <div class="w-full max-w-sm space-y-8 flex flex-col my-auto py-10 lg:py-0">
      <!-- 欢迎文案 -->
      <div
        class="mb-6 lg:mb-8 text-center animate-reveal [animation-fill-mode:forwards] [animation-delay:400ms] opacity-0 group/title"
      >
        <h2
          class="text-2xl font-black text-slate-800 tracking-tighter hover:scale-105 transition-transform duration-500 cursor-default"
        >
          创建新账户
        </h2>
      </div>

      <!-- 注册业务表单 (Widget) -->
      <register-form />
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * 注册视图入口组件
 * 职责：负责整体 UI 布局与背景，渲染账户初始化的核心业务组件
 */
import RegisterForm from './widgets/register-form.vue'
</script>
