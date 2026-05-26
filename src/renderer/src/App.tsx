import { useState } from 'react'
import { ToastProvider } from './components/ui/toast'
import { Sidebar, View } from './components/layout/Sidebar'
import { EditorView } from './features/editor/EditorView'
import { CompareView } from './features/compare/CompareView'
import { ChartsView } from './features/charts/ChartsView'

declare global {
  interface Window {
    jsonife: {
      openFileDialog: () => Promise<{ filePath: string; content: string; sizeMB: number; oversized: boolean } | null>
      readFile: (filePath: string) => Promise<{ filePath: string; content: string; sizeMB: number; oversized: boolean }>
      saveFileDialog: (defaultPath?: string) => Promise<string | null>
      writeFile: (filePath: string, content: string) => Promise<boolean>
      fetchUrl: (url: string) => Promise<{ url: string; content: string; sizeMB: number; oversized: boolean; contentType: string }>
      onMenuEvent: (channel: string, callback: () => void) => () => void
      platform: string
    }
  }
}

export default function App() {
  const [view, setView] = useState<View>('editor')

  return (
    <ToastProvider>
      <div className="flex h-full bg-[hsl(var(--background))]">
        <Sidebar activeView={view} onViewChange={setView} />
        <main className="flex flex-1 flex-col overflow-hidden">
          {view === 'editor' && <EditorView />}
          {view === 'compare' && <CompareView />}
          {view === 'charts' && <ChartsView />}
        </main>
      </div>
    </ToastProvider>
  )
}
