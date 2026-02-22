const { ipcRenderer } = window.electron || {}

/**
 * 格式化参数并处理 Error 对象，确保它们在 IPC 通信中能被正确序列化
 * @param args 原始参数数组
 */
const formatArgs = (args: any[]) => {
  return args.map((arg) => {
    if (arg instanceof Error) {
      return {
        name: arg.name,
        message: arg.message,
        stack: arg.stack,
        code: (arg as any).code, // 针对 AppwriteException 等自定义错误
        type: (arg as any).type
      }
    }
    return arg
  })
}

const logger = {
  info: (...args: any[]) => {
    ipcRenderer?.send('logger:log', { level: 'info', args: formatArgs(args) })
  },
  debug: (...args: any[]) => {
    ipcRenderer?.send('logger:log', { level: 'debug', args: formatArgs(args) })
  },
  warn: (...args: any[]) => {
    ipcRenderer?.send('logger:log', { level: 'warn', args: formatArgs(args) })
  },
  error: (...args: any[]) => {
    ipcRenderer?.send('logger:log', { level: 'error', args: formatArgs(args) })
  }
}

export default logger
