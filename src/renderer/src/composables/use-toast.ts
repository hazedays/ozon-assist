import { ref } from 'vue'

export interface Toast {
  id: string
  type: 'success' | 'error' | 'warning' | 'info'
  message: string
  duration?: number
}

const toasts = ref<Toast[]>([])
let id = 0

export const useToast = () => {
  const add = (type: Toast['type'], message: string, duration = 3000) => {
    const toastId = `toast-${++id}`
    const toast: Toast = {
      id: toastId,
      type,
      message,
      duration
    }
    toasts.value.push(toast)

    if (duration > 0) {
      setTimeout(() => {
        remove(toastId)
      }, duration)
    }

    return toastId
  }

  const remove = (id: string) => {
    const index = toasts.value.findIndex((t) => t.id === id)
    if (index > -1) {
      toasts.value.splice(index, 1)
    }
  }

  return {
    toasts,
    success: (message: string, duration?: number) => add('success', message, duration),
    error: (message: string, duration?: number) => add('error', message, duration),
    warning: (message: string, duration?: number) => add('warning', message, duration),
    info: (message: string, duration?: number) => add('info', message, duration),
    remove
  }
}
