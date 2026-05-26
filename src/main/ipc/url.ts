import { IpcMain } from 'electron'
import { fetchJsonUrl } from '../services/url'

export function registerUrlHandlers(ipcMain: IpcMain): void {
  ipcMain.handle('url:fetch', async (_event, url: string) => {
    return fetchJsonUrl(url)
  })
}
