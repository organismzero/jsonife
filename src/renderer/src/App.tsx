import { useState } from 'react'
import { ToastProvider } from './components/ui/toast'
import { Dialog } from './components/ui/dialog'
import { Button } from './components/ui/button'
import { Sidebar, View } from './components/layout/Sidebar'
import { AppHeader } from './components/layout/AppHeader'
import { StatusBar } from './components/layout/StatusBar'
import { EditorView } from './features/editor/EditorView'
import { CompareView } from './features/compare/CompareView'
import { ChartsView } from './features/charts/ChartsView'
import { useNativeMenu } from './hooks/useNativeMenu'
import { useUiStore } from './stores/uiStore'

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

function AppShell() {
  const [view, setView] = useState<View>('editor')
  const aboutOpen = useUiStore((s) => s.aboutOpen)
  const setAboutOpen = useUiStore((s) => s.setAboutOpen)

  useNativeMenu()

  return (
    <div className="flex h-full bg-[hsl(var(--background))]">
      <Sidebar activeView={view} onViewChange={setView} />
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden bg-mesh">
        <AppHeader view={view} />
        <main className="flex min-h-0 flex-1 flex-col overflow-hidden">
          {view === 'editor' && <EditorView />}
          {view === 'compare' && <CompareView />}
          {view === 'charts' && <ChartsView />}
        </main>
        <StatusBar view={view} />
      </div>

      <Dialog
        open={aboutOpen}
        onClose={() => setAboutOpen(false)}
        title="About Jsonife"
        footer={<Button onClick={() => setAboutOpen(false)}>OK</Button>}
      >
        <div className="flex flex-col gap-2 text-sm text-[hsl(var(--foreground))]">
          <p className="text-base font-semibold">Jsonife</p>
          <p className="text-[hsl(var(--muted-foreground))]">
            Browse, edit, compare, and copy leaves between JSON, JSONC, and JSONL files.
          </p>
          <p className="text-[11px] text-[hsl(var(--muted-foreground))]">Version 1.0.0 · MIT License</p>
        </div>
      </Dialog>
    </div>
  )
}

export default function App() {
  return (
    <ToastProvider>
      <AppShell />
    </ToastProvider>
  )
}
