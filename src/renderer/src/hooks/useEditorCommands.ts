import { useCallback, useState } from 'react'
import { useDocumentStore } from '../stores/documentStore'
import { useUiStore } from '../stores/uiStore'
import { useToast } from '../components/ui/toast'
import { formatContent } from '../lib/json/parse'
import { getJsonifeApi } from '../lib/api'

export function useEditorCommands() {
  const {
    documents,
    activeId,
    openFile,
    openUrl,
    updateContent,
    markSaved,
    pushUndo
  } = useDocumentStore()
  const setUrlDialogOpen = useUiStore((s) => s.setUrlDialogOpen)
  const { toast } = useToast()
  const [openingFile, setOpeningFile] = useState(false)
  const [oversizedWarning, setOversizedWarning] = useState<{ id: string; mb: number } | null>(null)

  const activeDoc = documents.find((d) => d.id === activeId) ?? null

  const handleOpenFile = useCallback(async () => {
    const api = getJsonifeApi()
    if (!api) {
      toast('Desktop bridge unavailable — restart the app', 'error')
      return
    }
    setOpeningFile(true)
    try {
      const result = await api.openFileDialog()
      if (!result) return
      if (result.oversized) {
        const id = openFile(result.filePath, result.content)
        setOversizedWarning({ id, mb: result.sizeMB })
      } else {
        openFile(result.filePath, result.content)
      }
    } finally {
      setOpeningFile(false)
    }
  }, [openFile, toast])

  const handleSaveAs = useCallback(async () => {
    if (!activeDoc) return
    const api = getJsonifeApi()
    if (!api) {
      toast('Desktop bridge unavailable — restart the app', 'error')
      return
    }
    const path = await api.saveFileDialog(activeDoc.source.path)
    if (!path) return
    await api.writeFile(path, activeDoc.content)
    markSaved(activeDoc.id, path)
    toast('Saved', 'success')
  }, [activeDoc, markSaved, toast])

  const handleSave = useCallback(async () => {
    if (!activeDoc) return
    const api = getJsonifeApi()
    if (!api) {
      toast('Desktop bridge unavailable — restart the app', 'error')
      return
    }
    if (activeDoc.source.type === 'file' && activeDoc.source.path) {
      await api.writeFile(activeDoc.source.path, activeDoc.content)
      markSaved(activeDoc.id, activeDoc.source.path)
      toast('Saved', 'success')
    } else {
      await handleSaveAs()
    }
  }, [activeDoc, markSaved, toast, handleSaveAs])

  const handleFormat = useCallback(() => {
    if (!activeDoc) return
    const formatted = formatContent(activeDoc.content, activeDoc.format)
    pushUndo(activeDoc.id)
    updateContent(activeDoc.id, formatted)
    toast('Formatted', 'info')
  }, [activeDoc, pushUndo, updateContent, toast])

  const handleUndoApply = useCallback(() => {
    if (!activeDoc) return
    const { popUndo } = useDocumentStore.getState()
    popUndo(activeDoc.id)
  }, [activeDoc])

  return {
    activeDoc,
    openingFile,
    oversizedWarning,
    setOversizedWarning,
    setUrlDialogOpen,
    handleOpenFile,
    handleSave,
    handleSaveAs,
    handleFormat,
    handleUndoApply
  }
}
