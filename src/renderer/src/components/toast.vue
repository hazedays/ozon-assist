<template>
  <transition-group
    name="toast"
    tag="div"
    class="fixed top-4 right-4 z-50 space-y-3 pointer-events-none"
  >
    <div
      v-for="toast in toasts"
      :key="toast.id"
      :class="{
        'bg-emerald-500': toast.type === 'success',
        'bg-red-500': toast.type === 'error',
        'bg-amber-500': toast.type === 'warning',
        'bg-ozon': toast.type === 'info'
      }"
      class="flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg text-white text-sm font-medium pointer-events-auto animate-slide-in-right"
    >
      <i
        :class="{
          'ri-check-circle-fill': toast.type === 'success',
          'ri-error-warning-fill': toast.type === 'error',
          'ri-alert-fill': toast.type === 'warning',
          'ri-information-fill': toast.type === 'info'
        }"
        class="text-lg"
      ></i>
      <span>{{ toast.message }}</span>
      <button @click="remove(toast.id)" class="ml-2 hover:opacity-80 transition-opacity">
        <i class="ri-close-line"></i>
      </button>
    </div>
  </transition-group>
</template>

<script setup lang="ts">
import { useToast } from '@renderer/composables/use-toast'

const { toasts, remove } = useToast()
</script>

<style scoped>
.toast-enter-active,
.toast-leave-active {
  transition: all 0.3s ease;
}

.toast-enter-from {
  opacity: 0;
  transform: translateX(30px);
}

.toast-leave-to {
  opacity: 0;
  transform: translateX(30px);
}

@keyframes slideInRight {
  from {
    opacity: 0;
    transform: translateX(30px);
  }

  to {
    opacity: 1;
    transform: translateX(0);
  }
}

.animate-slide-in-right {
  animation: slideInRight 0.3s ease-out;
}
</style>
