import { dialog, BrowserWindow } from 'electron'
import { readFile, writeFile } from 'fs/promises'
import { statSync } from 'fs'

const SIZE_WARN_BYTES = 5 * 1024 * 1024 // 5 MB

export interface OpenFileResult {
  filePath: string
  content: string
  sizeMB: number
  oversized: boolean
}

export async function openFileDialog(win: BrowserWindow): Promise<OpenFileResult | null> {
  const { canceled, filePaths } = await dialog.showOpenDialog(win, {
    title: 'Open JSON file',
    filters: [
      { name: 'JSON files', extensions: ['json', 'jsonc', 'jsonl'] },
      { name: 'All files', extensions: ['*'] }
    ],
    properties: ['openFile']
  })
  if (canceled || filePaths.length === 0) return null
  return readFilePath(filePaths[0])
}

export async function readFilePath(filePath: string): Promise<OpenFileResult> {
  const stat = statSync(filePath)
  const sizeMB = stat.size / (1024 * 1024)
  const oversized = stat.size > SIZE_WARN_BYTES
  const content = await readFile(filePath, 'utf-8')
  return { filePath, content, sizeMB, oversized }
}

export async function saveFileDialog(
  win: BrowserWindow,
  defaultPath?: string
): Promise<string | null> {
  const { canceled, filePath } = await dialog.showSaveDialog(win, {
    title: 'Save JSON file',
    defaultPath,
    filters: [
      { name: 'JSON files', extensions: ['json', 'jsonc', 'jsonl'] },
      { name: 'All files', extensions: ['*'] }
    ]
  })
  return canceled || !filePath ? null : filePath
}

export async function writeFilePath(filePath: string, content: string): Promise<void> {
  await writeFile(filePath, content, 'utf-8')
}
