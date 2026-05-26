import { useEffect } from 'react'
import { getJsonifeApi } from '../lib/api'
import { useDocumentStore } from '../stores/documentStore'
import { useUiStore } from '../stores/uiStore'
import { useToast } from '../components/ui/toast'

/**
 * Registers native OS menu IPC listeners once at app root.
 * Must run outside EditorView so menus work even if editor effects fail.
 */
export function useNativeMenu(): void {
  const { toast } = useToast()
  const { openFile, openUrl, markSaved } = useDocumentStore()
  const setAboutOpen = useUiStore((s) => s.setAboutOpen)
  const setUrlDialogOpen = useUiStore((s) => s.setUrlDialogOpen)

  useEffect(() => {
    const api = getJsonifeApi()
    if (!api) {
      console.error('Jsonife preload bridge not available — native menus and file dialogs will not work.')
      return
    }

    const handleOpenFile = async (): Promise<void> => {
      const result = await api.openFileDialog()
      if (!result) return
      openFile(result.filePath, result.content)
      if (result.oversized) {
        toast(`Large file (${result.sizeMB.toFixed(1)} MB). Performance may be reduced.`, 'warning')
      }
    }

    const handleSave = async (): Promise<void> => {
      const { documents, activeId } = useDocumentStore.getState()
      const doc = documents.find((d) => d.id === activeId)
      if (!doc) {
        toast('No document open', 'warning')
        return
      }
      if (doc.source.type === 'file' && doc.source.path) {
        await api.writeFile(doc.source.path, doc.content)
        markSaved(doc.id, doc.source.path)
        toast('Saved', 'success')
      } else {
        await handleSaveAs()
      }
    }

    const handleSaveAs = async (): Promise<void> => {
      const { documents, activeId } = useDocumentStore.getState()
      const doc = documents.find((d) => d.id === activeId)
      if (!doc) {
        toast('No document open', 'warning')
        return
      }
      const path = await api.saveFileDialog(doc.source.path)
      if (!path) return
      await api.writeFile(path, doc.content)
      markSaved(doc.id, path)
      toast('Saved', 'success')
    }

    const offs = [
      api.onMenuEvent('menu:open-file', () => { void handleOpenFile() }),
      api.onMenuEvent('menu:open-url', () => setUrlDialogOpen(true)),
      api.onMenuEvent('menu:save', () => { void handleSave() }),
      api.onMenuEvent('menu:save-as', () => { void handleSaveAs() }),
      api.onMenuEvent('menu:about', () => setAboutOpen(true))
    ]

    return () => offs.forEach((off) => off())
  }, [openFile, markSaved, setAboutOpen, setUrlDialogOpen, toast])
}
