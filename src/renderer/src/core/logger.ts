const { ipcRenderer } = window.electron || {}

const logger = {
  info: (...args: any[]) => {
    ipcRenderer?.send('logger:log', { level: 'info', args: args })
  },
  debug: (...args: any[]) => {
    ipcRenderer?.send('logger:log', { level: 'debug', args: args })
  },
  warn: (...args: any[]) => {
    ipcRenderer?.send('logger:log', { level: 'warn', args: args })
  },
  error: (...args: any[]) => {
    ipcRenderer?.send('logger:log', { level: 'error', args: args })
  }
}

export default logger
