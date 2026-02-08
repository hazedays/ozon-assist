<template>
  <div
    class="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 mb-8 group transition-all hover:border-blue-200"
  >
    <div class="flex items-start justify-between">
      <div class="flex gap-4">
        <div
          class="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center text-ozon group-hover:scale-110 transition-transform"
        >
          <i class="ri-image-add-line text-2xl"></i>
        </div>
        <div>
          <h3 class="text-sm font-bold text-slate-800 uppercase italic">导入凭证文件</h3>
          <p class="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-1">
            Select and import voucher images to the library
          </p>
        </div>
      </div>
      <div class="flex gap-2">
        <label
          class="cursor-pointer px-5 py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-2 shadow-sm active:scale-95"
        >
          <i class="ri-file-upload-line"></i>
          选择图片
          <input
            ref="fileInput"
            type="file"
            multiple
            accept="image/*"
            class="hidden"
            @change="handleFileChange"
          />
        </label>
      </div>
    </div>

    <!-- Drop Zone (Optional visual) -->
    <div
      class="mt-6 border-2 border-dashed border-slate-100 rounded-xl p-8 flex flex-col items-center justify-center gap-3 transition-colors hover:bg-slate-50 cursor-pointer"
      @dragover.prevent="isDragging = true"
      @dragleave.prevent="isDragging = false"
      @drop.prevent="handleDrop"
      @click="fileInput?.click()"
      :class="{ 'border-blue-200 bg-blue-50/50': isDragging }"
    >
      <div
        class="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center text-slate-300"
      >
        <i class="ri-download-cloud-2-line text-xl"></i>
      </div>
      <p
        class="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-relaxed text-center"
      >
        将图片文件拖拽至此处 <br />
        <span class="text-ozon/60 lowercase italic font-medium">Supports JPG, PNG, WEBP</span>
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { databaseService } from '@renderer/services/database'
import { useToast } from '@renderer/composables/use-toast'
import { useImageStore } from '@renderer/stores/image'
import logger from '@renderer/core/logger'

const toast = useToast()
const imageStore = useImageStore()
const isDragging = ref(false)
const fileInput = ref<HTMLInputElement | null>(null)

const processFiles = async (files: FileList | File[]) => {
  const fileArray = Array.from(files)
  if (fileArray.length === 0) return

  const imageFiles = fileArray.filter((f) => f.type.startsWith('image/'))
  if (imageFiles.length === 0) {
    toast.error('请选择有效的图片文件')
    return
  }

  // 使用 FileReader 将所有文件读取为二进制数据 (解决 Electron v32+ 无法获取 path 的问题)
  const payload = await Promise.all(
    imageFiles.map(async (f) => {
      const name = f.name
      const size = f.size
      return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = (e) => {
          if (e.target?.result instanceof ArrayBuffer) {
            resolve({
              name,
              size,
              data: new Uint8Array(e.target.result)
            })
          } else {
            reject(new Error('Failed to read file as ArrayBuffer'))
          }
        }
        reader.onerror = () => reject(new Error('FileReader error'))
        reader.readAsArrayBuffer(f)
      })
    })
  )

  try {
    const result = await databaseService.importImages(payload as any)
    if (result.success) {
      if (result.count === 0 && result.skippedCount > 0) {
        toast.info(`所选文件已全部存在 (跳过 ${result.skippedCount} 个)`)
      } else if (result.skippedCount > 0) {
        toast.success(`成功导入 ${result.count} 张凭证 (跳过 ${result.skippedCount} 个重复文件)`)
      } else {
        toast.success(`成功导入 ${result.count} 张凭证`)
      }
      imageStore.refresh()
    }
  } catch (error) {
    toast.error('导入失败，请重试')
    logger.error(error)
  }
}

const handleFileChange = (e: Event) => {
  const target = e.target as HTMLInputElement
  if (target.files) {
    processFiles(target.files)
    target.value = '' // Reset
  }
}

const handleDrop = (e: DragEvent) => {
  isDragging.value = false
  if (e.dataTransfer?.files) {
    processFiles(e.dataTransfer.files)
  }
}
</script>
