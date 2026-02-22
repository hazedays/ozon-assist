<template>
  <router-view />

  <!-- 全局组件 -->
  <Toast />
</template>

<script setup lang="ts">
/**
 * 根组件
 * 负责全局 Store 初始化、骨架布局及通知系统挂载
 */
import { onMounted } from 'vue'
import Toast from './components/toast.vue'
import { useImageStore } from './stores/image'
import { useComplaintStore } from './stores/complaint'

const imageStore = useImageStore()
const complaintStore = useComplaintStore()

onMounted(() => {
  imageStore.init()
  complaintStore.init()
})
</script>
