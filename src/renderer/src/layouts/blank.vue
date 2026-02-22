<template>
  <div class="h-screen flex selection:bg-ozon-blue/10 bg-white overflow-hidden font-sans">
    <!-- 左侧：品牌展示区 -->
    <div
      class="flex flex-col w-[400px] lg:w-[460px] h-full bg-linear-to-br from-ozon-blue to-blue-800 px-10 lg:px-12 pt-16 pb-8 relative overflow-hidden shrink-0 shadow-2xl z-10 transition-all duration-700"
    >
      <div
        class="absolute -right-20 -bottom-20 w-80 h-80 bg-white/5 rounded-full blur-3xl animate-float"
      ></div>
      <div
        class="absolute -left-20 -top-20 w-80 h-80 bg-white/10 rounded-full blur-3xl animate-float-delayed"
      ></div>
      <div
        class="absolute inset-0 bg-linear-to-b from-transparent via-white/2 to-transparent opacity-30 pointer-events-none animate-beam"
      ></div>

      <!-- 中心内容容器：自适应高度并垂直居中 -->
      <div
        class="flex-1 flex flex-col justify-center relative z-10 text-center max-w-sm mx-auto w-full -mt-12"
      >
        <!-- Logo 容器：增加背景光晕效果 -->
        <div class="relative group">
          <div
            class="absolute inset-0 bg-ozon-blue/40 rounded-full blur-3xl scale-125 animate-pulse-soft"
          ></div>
          <div
            class="w-20 h-20 mx-auto mb-8 bg-white/10 backdrop-blur-xl rounded-2xl overflow-hidden flex items-center justify-center border border-white/20 shadow-[0_0_50px_rgba(255,255,255,0.15)] animate-logo-pop relative z-10"
          >
            <img
              src="@renderer/assets/logo.png"
              class="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
            />
            <div
              class="absolute inset-0 bg-linear-to-tr from-white/0 via-white/10 to-white/0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000"
            ></div>
          </div>
        </div>

        <h1
          class="text-2xl lg:text-3xl font-black text-white italic tracking-tighter uppercase mb-2 animate-reveal [animation-fill-mode:forwards] [animation-delay:200ms] opacity-0 group/title"
        >
          <span
            class="inline-block hover:scale-105 transition-transform duration-500 cursor-default animate-text-glow"
          >
            Ozon<span class="text-white drop-shadow-[0_0_20px_rgba(255,255,255,0.4)]">Assist</span>
          </span>
        </h1>
        <p
          class="text-white/80 font-bold text-xs lg:text-sm tracking-[0.2em] mb-10 animate-reveal [animation-fill-mode:forwards] [animation-delay:400ms] opacity-0"
        >
          专业的投诉自动化助手
        </p>

        <!-- 特性列表 -->
        <div class="mt-4 space-y-6 text-left border-t border-white/20 pt-8">
          <div
            class="flex items-center gap-4 text-white group cursor-default transition-all hover:translate-x-1 animate-reveal [animation-fill-mode:forwards] [animation-delay:600ms] opacity-0"
          >
            <div
              class="w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center group-hover:bg-white/20 border border-white/20 group-hover:border-white/40 transition-all shrink-0"
            >
              <i class="ri-shield-flash-line text-lg text-white"></i>
            </div>
            <div class="flex flex-col gap-0.5 min-w-0">
              <span
                class="text-xs font-black uppercase tracking-widest group-hover:text-white whitespace-nowrap"
                >安全防护中心</span
              >
              <span
                class="text-[10px] text-white/60 group-hover:text-white/90 font-bold leading-tight"
                >凭证库智能去重与加密存储</span
              >
            </div>
          </div>

          <div
            class="flex items-center gap-4 text-white group cursor-default transition-all hover:translate-x-1 animate-reveal [animation-fill-mode:forwards] [animation-delay:750ms] opacity-0"
          >
            <div
              class="w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center group-hover:bg-white/20 border border-white/20 group-hover:border-white/40 transition-all shrink-0"
            >
              <i class="ri-rocket-2-line text-lg text-white"></i>
            </div>
            <div class="flex flex-col gap-0.5 min-w-0">
              <span
                class="text-xs font-black uppercase tracking-widest group-hover:text-white whitespace-nowrap"
                >智能异步任务</span
              >
              <span
                class="text-[10px] text-white/60 group-hover:text-white/90 font-bold leading-tight"
                >全自动化任务并发处理</span
              >
            </div>
          </div>

          <div
            class="flex items-center gap-4 text-white group cursor-default transition-all hover:translate-x-1 animate-reveal [animation-fill-mode:forwards] [animation-delay:900ms] opacity-0"
          >
            <div
              class="w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center group-hover:bg-white/20 border border-white/20 group-hover:border-white/40 transition-all shrink-0"
            >
              <i class="ri-cloud-windy-line text-lg text-white"></i>
            </div>
            <div class="flex flex-col gap-0.5 min-w-0">
              <span
                class="text-xs font-black uppercase tracking-widest group-hover:text-white whitespace-nowrap"
                >云端无缝集成</span
              >
              <span
                class="text-[10px] text-white/60 group-hover:text-white/90 font-bold leading-tight"
                >浏览器插件深度垂直无缝挂载</span
              >
            </div>
          </div>
        </div>
      </div>

      <!-- 底部版权及法律文档：由 flex-col 自动推至底部 -->
      <div
        class="mt-auto pt-6 text-center animate-fade-in [animation-fill-mode:forwards] [animation-delay:1000ms] relative z-10 border-t border-white/10"
      >
        <div class="flex items-center justify-center gap-5 mb-4 px-4">
          <button
            @click="legalApi.openSubWindow('terms')"
            class="text-[10px] font-black text-white hover:text-white/80 uppercase tracking-widest transition-colors cursor-pointer whitespace-nowrap"
          >
            服务条款
          </button>
          <div class="w-1 h-1 bg-white/30 rounded-full shrink-0"></div>
          <button
            @click="legalApi.openSubWindow('privacy')"
            class="text-[10px] font-black text-white hover:text-white/80 uppercase tracking-widest transition-colors cursor-pointer whitespace-nowrap"
          >
            隐私政策
          </button>
          <div class="w-1 h-1 bg-white/30 rounded-full shrink-0"></div>
          <button
            @click="legalApi.openSubWindow('support')"
            class="text-[10px] font-black text-white hover:text-white/80 uppercase tracking-widest transition-colors cursor-pointer whitespace-nowrap"
          >
            联系支持
          </button>
        </div>
        <p
          class="text-[9px] text-white/50 font-black uppercase tracking-[0.2em] italic leading-relaxed whitespace-nowrap"
        >
          © 2026 OZON ASSIST 核心系统
        </p>
      </div>
    </div>

    <!-- 右侧：内容容器 -->
    <div class="flex-1 flex flex-col bg-slate-50/50 overflow-y-auto relative scroll-smooth">
      <!-- 内容渲染区：由各页面自行决定宽度和对齐 -->
      <div class="flex-1 flex flex-col overflow-x-hidden">
        <router-view v-slot="{ Component }">
          <transition name="page-fade" mode="out-in">
            <component :is="Component" />
          </transition>
        </router-view>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { legalApi } from '@renderer/api/modules/legal'
</script>

<style scoped>
.page-fade-enter-active,
.page-fade-leave-active {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.page-fade-enter-from {
  opacity: 0;
  transform: translateX(10px);
}

.page-fade-leave-to {
  opacity: 0;
  transform: translateX(-10px);
}
</style>
