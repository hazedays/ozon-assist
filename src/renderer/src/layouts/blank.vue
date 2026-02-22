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

      <!-- 中心内容容器：自适应高度并垂直居中 -->
      <div
        class="flex-1 flex flex-col justify-center relative z-10 text-center max-w-sm mx-auto w-full -mt-12"
      >
        <!-- Logo 容器 -->
        <div
          class="w-20 h-20 mx-auto mb-8 bg-white/10 backdrop-blur-xl rounded-2xl overflow-hidden flex items-center justify-center border border-white/20 shadow-[0_0_30px_rgba(255,255,255,0.1)] animate-logo-pop group"
        >
          <img
            src="@renderer/assets/logo.png"
            class="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
          />
          <div
            class="absolute inset-0 bg-linear-to-tr from-white/0 via-white/5 to-white/0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000"
          ></div>
        </div>

        <h1
          class="text-4xl lg:text-5xl font-black text-white italic tracking-tighter uppercase mb-6 animate-reveal [animation-fill-mode:forwards] [animation-delay:200ms]"
        >
          Ozon<span class="text-white/60 drop-shadow-[0_0_10px_rgba(255,255,255,0.2)]">Assist</span>
        </h1>
        <p
          class="text-white/70 text-sm lg:text-base font-medium leading-relaxed animate-reveal [animation-fill-mode:forwards] [animation-delay:400ms]"
        >
          专业的投诉自动化助手，助力卖家维护权益，高效解决侵权与违规。
        </p>

        <!-- 特性列表 -->
        <div
          class="mt-10 space-y-4 text-left border-t border-white/10 pt-8 animate-reveal [animation-fill-mode:forwards] [animation-delay:600ms]"
        >
          <div
            class="flex items-center gap-4 text-white/40 group cursor-default transition-all hover:translate-x-1"
          >
            <div
              class="w-7 h-7 rounded-lg bg-white/5 flex items-center justify-center group-hover:bg-white/10 transition-colors"
            >
              <i class="ri-checkbox-circle-line text-base text-white/60 group-hover:text-white"></i>
            </div>
            <span
              class="text-[10px] font-bold uppercase tracking-widest italic transition-colors group-hover:text-white"
              >凭证库智能去重</span
            >
          </div>
          <div
            class="flex items-center gap-4 text-white/40 group cursor-default transition-all hover:translate-x-1"
          >
            <div
              class="w-7 h-7 rounded-lg bg-white/5 flex items-center justify-center group-hover:bg-white/10 transition-colors"
            >
              <i class="ri-checkbox-circle-line text-base text-white/60 group-hover:text-white"></i>
            </div>
            <span
              class="text-[10px] font-bold uppercase tracking-widest italic transition-colors group-hover:text-white"
              >全自动化投诉异步任务</span
            >
          </div>
          <div
            class="flex items-center gap-4 text-white/40 group cursor-default transition-all hover:translate-x-1"
          >
            <div
              class="w-7 h-7 rounded-lg bg-white/5 flex items-center justify-center group-hover:bg-white/10 transition-colors"
            >
              <i class="ri-checkbox-circle-line text-base text-white/60 group-hover:text-white"></i>
            </div>
            <span
              class="text-[10px] font-bold uppercase tracking-widest italic transition-colors group-hover:text-white"
              >浏览器插件深度垂直集成</span
            >
          </div>
        </div>
      </div>

      <!-- 底部版权及法律文档：由 flex-col 自动推至底部 -->
      <div
        class="mt-auto pt-6 text-center animate-fade-in [animation-fill-mode:forwards] [animation-delay:1000ms] relative z-10"
      >
        <div class="flex items-center justify-center gap-4 mb-3">
          <button
            @click="legalApi.openSubWindow('terms')"
            class="text-[10px] font-bold text-white/30 hover:text-white uppercase tracking-[0.2em] transition-colors cursor-pointer"
          >
            服务条款
          </button>
          <div class="w-0.5 h-0.5 bg-white/20 rounded-full"></div>
          <button
            @click="legalApi.openSubWindow('privacy')"
            class="text-[10px] font-bold text-white/30 hover:text-white uppercase tracking-[0.2em] transition-colors cursor-pointer"
          >
            隐私政策
          </button>
          <div class="w-0.5 h-0.5 bg-white/20 rounded-full"></div>
          <button
            @click="legalApi.openSubWindow('support')"
            class="text-[10px] font-bold text-white/30 hover:text-white uppercase tracking-[0.2em] transition-colors cursor-pointer"
          >
            联系支持
          </button>
        </div>
        <p class="text-[9px] text-white/20 font-bold uppercase tracking-[0.3em]">
          © 2026 OZON ASSIST CORE SYSTEM
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
