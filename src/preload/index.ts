import { contextBridge, ipcRenderer } from 'electron'

export interface OpenFileResult {
  filePath: string
  content: string
  sizeMB: number
  oversized: boolean
}

export interface FetchUrlResult {
  url: string
  content: string
  sizeMB: number
  oversized: boolean
  contentType: string
}

const api = {
  // File operations
  openFileDialog: (): Promise<OpenFileResult | null> =>
    ipcRenderer.invoke('file:open-dialog'),

  readFile: (filePath: string): Promise<OpenFileResult> =>
    ipcRenderer.invoke('file:read', filePath),

  saveFileDialog: (defaultPath?: string): Promise<string | null> =>
    ipcRenderer.invoke('file:save-dialog', defaultPath),

  writeFile: (filePath: string, content: string): Promise<boolean> =>
    ipcRenderer.invoke('file:write', filePath, content),

  // URL fetch
  fetchUrl: (url: string): Promise<FetchUrlResult> =>
    ipcRenderer.invoke('url:fetch', url),

  // Menu events
  onMenuEvent: (
    channel: string,
    callback: () => void
  ): (() => void) => {
    const handler = (): void => callback()
    ipcRenderer.on(channel, handler)
    return () => ipcRenderer.removeListener(channel, handler)
  },

  platform: process.platform
}

contextBridge.exposeInMainWorld('jsonife', api)

export type JsonifeApi = typeof api
