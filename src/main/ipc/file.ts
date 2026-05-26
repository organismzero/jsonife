import { IpcMain, BrowserWindow } from 'electron'
import {
  openFileDialog,
  readFilePath,
  saveFileDialog,
  writeFilePath
} from '../services/file'

export function registerFileHandlers(ipcMain: IpcMain): void {
  ipcMain.handle('file:open-dialog', async (event) => {
    const win = BrowserWindow.fromWebContents(event.sender)!
    return openFileDialog(win)
  })

  ipcMain.handle('file:read', async (_event, filePath: string) => {
    return readFilePath(filePath)
  })

  ipcMain.handle('file:save-dialog', async (event, defaultPath?: string) => {
    const win = BrowserWindow.fromWebContents(event.sender)!
    return saveFileDialog(win, defaultPath)
  })

  ipcMain.handle('file:write', async (_event, filePath: string, content: string) => {
    await writeFilePath(filePath, content)
    return true
  })
}
