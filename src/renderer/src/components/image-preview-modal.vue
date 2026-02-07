<template>
  <Transition name="fade">
    <div
      v-if="visible"
      class="fixed inset-0 z-100 flex items-center justify-center p-4 sm:p-8 overflow-hidden bg-slate-950/95 backdrop-blur-sm"
      @click.self="close"
      @keydown.esc="close"
      tabindex="0"
    >
      <!-- Close Button -->
      <button
        @click="close"
        class="absolute top-6 right-6 w-10 h-10 flex items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition-all z-110 cursor-pointer"
      >
        <i class="ri-close-line text-2xl"></i>
      </button>

      <!-- Toolbar -->
      <div
        class="absolute bottom-10 left-1/2 -translate-x-1/2 flex items-center gap-6 px-6 py-3 rounded-2xl bg-white/10 backdrop-blur-md border border-white/10 z-110"
      >
        <button
          @click="zoomOut"
          class="text-white/60 hover:text-white transition-colors cursor-pointer"
          title="缩小"
        >
          <i class="ri-zoom-out-line text-xl"></i>
        </button>
        <span class="text-white text-[10px] font-mono font-bold w-12 text-center uppercase"
          >{{ Math.round(scale * 100) }}%</span
        >
        <button
          @click="zoomIn"
          class="text-white/60 hover:text-white transition-colors cursor-pointer"
          title="放大"
        >
          <i class="ri-zoom-in-line text-xl"></i>
        </button>
        <div class="w-px h-4 bg-white/10 mx-1"></div>
        <button
          @click="rotate"
          class="text-white/60 hover:text-white transition-colors cursor-pointer"
          title="旋转"
        >
          <i class="ri-reset-right-line text-xl"></i>
        </button>
        <button
          @click="reset"
          class="text-white/60 hover:text-white transition-colors cursor-pointer"
          title="重置"
        >
          <i class="ri-refresh-line text-xl"></i>
        </button>
      </div>

      <!-- Image Container -->
      <div
        class="relative w-full h-full flex items-center justify-center pointer-events-none"
        :style="containerStyle"
      >
        <img
          :src="url"
          class="max-w-full max-h-full object-contain shadow-2xl transition-transform duration-200 pointer-events-auto cursor-grab active:cursor-grabbing"
          :style="imageStyle"
          @mousedown="startDrag"
          @wheel="handleWheel"
          @dragstart.prevent
        />
      </div>

      <!-- Loading State -->
      <div v-if="loading" class="absolute inset-0 flex items-center justify-center text-white/40">
        <i class="ri-loader-4-line text-4xl animate-spin"></i>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { ref, watch, computed, onMounted, onUnmounted } from 'vue'

const props = defineProps<{
  visible: boolean
  url: string
}>()

const emit = defineEmits(['update:visible'])

const loading = ref(true)
const scale = ref(1)
const rotation = ref(0)
const position = ref({ x: 0, y: 0 })
const isDragging = ref(false)
const lastMousePos = ref({ x: 0, y: 0 })

const containerStyle = computed(() => ({
  transform: `translate(${position.value.x}px, ${position.value.y}px)`
}))

const imageStyle = computed(() => ({
  transform: `scale(${scale.value}) rotate(${rotation.value}deg)`
}))

const close = () => {
  emit('update:visible', false)
}

const zoomIn = () => {
  scale.value = Math.min(scale.value + 0.2, 5)
}

const zoomOut = () => {
  scale.value = Math.max(scale.value - 0.2, 0.2)
}

const rotate = () => {
  rotation.value = (rotation.value + 90) % 360
}

const reset = () => {
  scale.value = 1
  rotation.value = 0
  position.value = { x: 0, y: 0 }
}

const handleWheel = (e: WheelEvent) => {
  if (e.deltaY < 0) zoomIn()
  else zoomOut()
}

const startDrag = (e: MouseEvent) => {
  isDragging.value = true
  lastMousePos.value = { x: e.clientX, y: e.clientY }
  window.addEventListener('mousemove', handleDrag)
  window.addEventListener('mouseup', stopDrag)
}

const handleDrag = (e: MouseEvent) => {
  if (!isDragging.value) return
  const dx = e.clientX - lastMousePos.value.x
  const dy = e.clientY - lastMousePos.value.y
  position.value.x += dx
  position.value.y += dy
  lastMousePos.value = { x: e.clientX, y: e.clientY }
}

const stopDrag = () => {
  isDragging.value = false
  window.removeEventListener('mousemove', handleDrag)
  window.removeEventListener('mouseup', stopDrag)
}

watch(
  () => props.visible,
  (newVal) => {
    if (newVal) {
      loading.value = true
      reset()
      // 强制获取焦点以监听 Esc
      setTimeout(() => {
        const el = document.querySelector('.bg-slate-950\\/95') as HTMLElement
        el?.focus()
      }, 100)

      const img = new Image()
      img.src = props.url
      img.onload = () => {
        loading.value = false
      }
    }
  }
)

// 快捷键
const handleKeydown = (e: KeyboardEvent) => {
  if (!props.visible) return
  if (e.key === 'Escape') close()
  if (e.key === '0') reset()
  if (e.key === '+') zoomIn()
  if (e.key === '-') zoomOut()
  if (e.key === 'r') rotate()
}

onMounted(() => window.addEventListener('keydown', handleKeydown))
onUnmounted(() => window.removeEventListener('keydown', handleKeydown))
</script>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
