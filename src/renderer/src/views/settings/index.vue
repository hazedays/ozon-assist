<template>
  <div class="flex flex-col min-h-full">
    <!-- 设置子导航 Tab 栏 -->
    <div class="border-b border-slate-200 bg-white px-6 sticky top-14 z-40">
      <nav class="flex items-center gap-1">
        <router-link
          v-for="tab in tabs"
          :key="tab.to"
          :to="tab.to"
          class="flex items-center gap-1.5 px-4 py-3 text-xs font-bold border-b-2 transition-colors -mb-px whitespace-nowrap"
          :class="[
            $route.path === tab.to
              ? 'border-ozon text-ozon'
              : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
          ]"
        >
          <i :class="tab.icon" class="text-base leading-none"></i>
          {{ tab.label }}
        </router-link>
      </nav>
    </div>

    <!-- 子页面内容 -->
    <div class="flex-1">
      <router-view />
    </div>
  </div>
</template>

<script setup lang="ts">
const tabs = [
  { to: '/settings/runtime', label: '运行配置', icon: 'ri-settings-3-line' },
  { to: '/settings/system', label: '应用设置', icon: 'ri-computer-line' },
  { to: '/settings/changelog', label: '更新日志', icon: 'ri-history-line' }
]
</script>
