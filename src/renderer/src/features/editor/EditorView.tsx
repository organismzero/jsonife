import { useCallback, useRef, useState } from 'react'
import MonacoEditor from '@monaco-editor/react'
import { FileJson, Upload, Link, Save, WrapText, RotateCcw, AlertTriangle, Loader2 } from 'lucide-react'
import { useDocumentStore } from '../../stores/documentStore'
import { formatContent } from '../../lib/json/parse'
import { Button } from '../../components/ui/button'
import { Dialog } from '../../components/ui/dialog'
import { Input } from '../../components/ui/input'
import { TabBar } from '../../components/layout/TabBar'
import { JsonTree } from './JsonTree'
import { ResizableSplit } from '../../components/ui/resizable-split'
import { useToast } from '../../components/ui/toast'
import { getJsonifeApi } from '../../lib/api'
import { useUiStore } from '../../stores/uiStore'

const LANG_MAP = { json: 'json', jsonc: 'jsonc', jsonl: 'json' } as const

export function EditorView() {
  const {
    documents,
    activeId,
    setActiveId,
    openFile,
    openUrl,
    updateContent,
    updateValue,
    removeDocument,
    markSaved,
    pushUndo
  } = useDocumentStore()

  const urlDialogOpen = useUiStore((s) => s.urlDialogOpen)
  const setUrlDialogOpen = useUiStore((s) => s.setUrlDialogOpen)
  const [urlInput, setUrlInput] = useState('')
  const [urlLoading, setUrlLoading] = useState(false)
  const [openingFile, setOpeningFile] = useState(false)
  const [monacoLoading, setMonacoLoading] = useState(true)
  const [oversizedWarning, setOversizedWarning] = useState<{ id: string; mb: number } | null>(null)
  const { toast } = useToast()
  const syncRef = useRef(0)

  const activeDoc = documents.find((d) => d.id === activeId) ?? null

  async function handleOpenFile() {
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
  }

  async function handleOpenUrl() {
    if (!urlInput.trim()) return
    const api = getJsonifeApi()
    if (!api) {
      toast('Desktop bridge unavailable — restart the app', 'error')
      return
    }
    setUrlLoading(true)
    try {
      const result = await api.fetchUrl(urlInput.trim())
      openUrl(result.url, result.content)
      setUrlDialogOpen(false)
      setUrlInput('')
      if (result.oversized) toast(`Large file (${result.sizeMB.toFixed(1)} MB). Performance may be reduced.`, 'warning')
    } catch (err) {
      toast(String(err), 'error')
    } finally {
      setUrlLoading(false)
    }
  }

  async function handleSave() {
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
      handleSaveAs()
    }
  }

  async function handleSaveAs() {
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
  }

  function handleFormat() {
    if (!activeDoc) return
    const formatted = formatContent(activeDoc.content, activeDoc.format)
    pushUndo(activeDoc.id)
    updateContent(activeDoc.id, formatted)
    toast('Formatted', 'info')
  }

  function handleCloseTab(id: string) {
    const doc = documents.find((d) => d.id === id)
    if (doc?.isDirty) {
      if (!confirm(`"${doc.name}" has unsaved changes. Close anyway?`)) return
    }
    removeDocument(id)
  }

  const handleMonacoChange = useCallback(
    (val: string | undefined) => {
      if (!activeId || val === undefined) return
      const gen = ++syncRef.current
      setTimeout(() => {
        if (syncRef.current !== gen) return
        updateContent(activeId, val)
      }, 300)
    },
    [activeId, updateContent]
  )

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center gap-2 border-b border-[hsl(var(--border))] bg-[hsl(var(--surface))] px-3 py-2">
        <Button variant="outline" size="sm" onClick={handleOpenFile} disabled={openingFile}>
          {openingFile ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} />} Open
        </Button>
        <Button variant="outline" size="sm" onClick={() => setUrlDialogOpen(true)}>
          <Link size={12} /> URL
        </Button>
        {activeDoc && (
          <>
            <div className="h-4 w-px bg-[hsl(var(--border))]" />
            <Button variant="outline" size="sm" onClick={handleSave}>
              <Save size={12} /> Save
            </Button>
            <Button variant="ghost" size="sm" onClick={handleFormat}>
              <WrapText size={12} /> Format
            </Button>
            {activeDoc.undoStack.length > 0 && (
              <Button variant="ghost" size="sm" onClick={() => { const { popUndo } = useDocumentStore.getState(); popUndo(activeDoc.id) }}>
                <RotateCcw size={12} /> Undo apply
              </Button>
            )}
            {activeDoc.errors.length > 0 && (
              <span className="flex items-center gap-1 text-[11px] text-[hsl(var(--destructive))]">
                <AlertTriangle size={12} />
                {activeDoc.errors.length} error{activeDoc.errors.length > 1 ? 's' : ''}
              </span>
            )}
          </>
        )}
      </div>

      {/* Tabs */}
      <TabBar
        documents={documents}
        activeId={activeId}
        onSelect={setActiveId}
        onClose={handleCloseTab}
      />

      {/* Main content */}
      {activeDoc ? (
        <ResizableSplit
          defaultLeftWidth={288}
          minLeft={140}
          minRight={240}
          left={
            <div className="h-full bg-[hsl(var(--surface))] p-2">
              <div className="text-[10px] uppercase tracking-wider text-[hsl(var(--muted-foreground))] mb-2 px-1">
                Tree
              </div>
              {activeDoc.value !== null ? (
                <JsonTree
                  value={activeDoc.value}
                  onChange={(v) => updateValue(activeDoc.id, v)}
                />
              ) : (
                <p className="text-[11px] text-[hsl(var(--muted-foreground))] px-1">
                  Parse errors — fix JSON in editor
                </p>
              )}
            </div>
          }
          right={
            <div className="relative h-full">
              {monacoLoading && (
                <div className="absolute inset-0 z-10 flex items-center justify-center bg-[hsl(var(--background))]">
                  <Loader2 size={24} className="animate-spin text-[hsl(var(--muted-foreground))]" />
                </div>
              )}
              <MonacoEditor
                language={LANG_MAP[activeDoc.format]}
                value={activeDoc.content}
                onChange={handleMonacoChange}
                onMount={() => setMonacoLoading(false)}
                theme="vs-dark"
                options={{
                  fontSize: 13,
                  fontFamily: "'JetBrains Mono', monospace",
                  minimap: { enabled: false },
                  scrollBeyondLastLine: false,
                  wordWrap: 'on',
                  lineNumbers: 'on',
                  glyphMargin: false,
                  folding: true,
                  renderLineHighlight: 'line',
                  padding: { top: 8 }
                }}
              />
            </div>
          }
        />
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 text-[hsl(var(--muted-foreground))]">
          <FileJson size={48} strokeWidth={1} />
          <p className="text-sm">Open a JSON file to get started</p>
            <div className="flex gap-2">
            <Button onClick={handleOpenFile} disabled={openingFile}>
              {openingFile ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />} Open file
            </Button>
            <Button variant="outline" onClick={() => setUrlDialogOpen(true)}>
              <Link size={14} /> Open URL
            </Button>
          </div>
        </div>
      )}

      {/* URL dialog */}
      <Dialog
        open={urlDialogOpen}
        onClose={() => { setUrlDialogOpen(false); setUrlInput('') }}
        title="Open from URL"
        footer={
          <>
            <Button variant="outline" onClick={() => setUrlDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleOpenUrl} disabled={urlLoading}>
              {urlLoading ? 'Loading…' : 'Open'}
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-2">
          <label className="text-xs text-[hsl(var(--muted-foreground))]">
            JSON URL (http/https)
          </label>
          <Input
            placeholder="https://example.com/data.json"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleOpenUrl()}
            autoFocus
          />
        </div>
      </Dialog>

      {/* Large file warning */}
      <Dialog
        open={oversizedWarning !== null}
        onClose={() => setOversizedWarning(null)}
        title="Large file"
        footer={<Button onClick={() => setOversizedWarning(null)}>OK</Button>}
      >
        <p className="text-sm">
          This file is <strong>{oversizedWarning?.mb.toFixed(1)} MB</strong>. Performance may be reduced for large files.
        </p>
      </Dialog>
    </div>
  )
}
