import { app, BrowserWindow, ipcMain } from 'electron'
import { existsSync } from 'fs'
import { join } from 'path'
import { registerFileHandlers } from './ipc/file'
import { registerUrlHandlers } from './ipc/url'
import { buildMenu } from './menu'

function preloadScriptPath(): string {
  const js = join(__dirname, '../preload/index.js')
  const mjs = join(__dirname, '../preload/index.mjs')
  if (existsSync(js)) return js
  if (existsSync(mjs)) return mjs
  return js
}

function createWindow(): BrowserWindow {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    backgroundColor: '#0d1117',
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    webPreferences: {
      preload: preloadScriptPath(),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  })

  if (process.env['ELECTRON_RENDERER_URL']) {
    win.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    win.loadFile(join(__dirname, '../renderer/index.html'))
  }

  return win
}

app.setName('Jsonife')

app.whenReady().then(() => {
  registerFileHandlers(ipcMain)
  registerUrlHandlers(ipcMain)

  const win = createWindow()
  buildMenu(win)

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      const newWin = createWindow()
      buildMenu(newWin)
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
