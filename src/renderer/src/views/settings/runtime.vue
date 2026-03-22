<template>
  <div class="max-w-5xl mx-auto flex flex-col gap-6 p-6">
    <div class="flex items-center gap-2 px-1">
      <i class="ri-settings-3-line text-slate-400"></i>
      <p class="text-xs text-slate-500 font-medium">
        运行配置用于控制浏览器插件轮询间隔、日志等级与详细日志开关。保存后将由宿主下发给插件。
      </p>
    </div>

    <RuntimeConfigWidget />
  </div>
</template>

<script setup lang="ts">
import RuntimeConfigWidget from '../complaints/widgets/runtime-config-widget.vue'
</script>
