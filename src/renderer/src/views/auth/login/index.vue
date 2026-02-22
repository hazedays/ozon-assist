<template>
  <div class="flex-1 flex flex-col items-center p-8 lg:p-12 relative overflow-hidden h-screen">
    <!-- 顶部状态切换 (右上角，采用 fixed 确保其不随容器滚动且保持在视口顶端) -->
    <div class="fixed top-8 right-8 z-50">
      <router-link
        to="/auth/register"
        class="text-xs font-black text-slate-400 hover:text-ozon-blue transition-all uppercase tracking-widest flex items-center gap-1 group"
      >
        <span>注册新账户</span>
        <i class="ri-arrow-right-line transition-transform group-hover:translate-x-1"></i>
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
          欢迎回来
        </h2>
      </div>

      <!-- 登录业务表单 (Widget) -->
      <login-form />
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * 登录视图入口组件
 * 职责：负责整体 UI 布局与背景，渲染身份认证的核心业务组件
 */
import LoginForm from './widgets/login-form.vue'
</script>
