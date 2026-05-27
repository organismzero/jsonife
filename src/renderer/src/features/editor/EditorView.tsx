import { useCallback, useRef, useState } from 'react'
import MonacoEditor from '@monaco-editor/react'
import { FileJson, Upload, Link, Loader2 } from 'lucide-react'
import { useDocumentStore } from '../../stores/documentStore'
import { Button } from '../../components/ui/button'
import { Dialog } from '../../components/ui/dialog'
import { Input } from '../../components/ui/input'
import { TabBar } from '../../components/layout/TabBar'
import { JsonTree } from './JsonTree'
import { ResizableSplit } from '../../components/ui/resizable-split'
import { useToast } from '../../components/ui/toast'
import { getJsonifeApi } from '../../lib/api'
import { useUiStore } from '../../stores/uiStore'
import { useEditorCommands } from '../../hooks/useEditorCommands'
import { defineJsonifeTheme, getJsonifeThemeId } from '../../lib/monaco/jsonifeTheme'

const LANG_MAP = { json: 'json', jsonc: 'jsonc', jsonl: 'json' } as const

export function EditorView() {
  const {
    documents,
    activeId,
    setActiveId,
    openUrl,
    updateContent,
    updateValue,
    removeDocument
  } = useDocumentStore()

  const urlDialogOpen = useUiStore((s) => s.urlDialogOpen)
  const setUrlDialogOpen = useUiStore((s) => s.setUrlDialogOpen)
  const [urlInput, setUrlInput] = useState('')
  const [urlLoading, setUrlLoading] = useState(false)
  const [monacoLoading, setMonacoLoading] = useState(true)
  const { toast } = useToast()
  const syncRef = useRef(0)

  const {
    activeDoc,
    openingFile,
    oversizedWarning,
    setOversizedWarning,
    handleOpenFile
  } = useEditorCommands()

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

  const handleMonacoBeforeMount = useCallback((monaco: { editor: { defineTheme: (name: string, data: object) => void } }) => {
    defineJsonifeTheme(monaco)
  }, [])

  return (
    <div className="flex h-full flex-col">
      <TabBar
        documents={documents}
        activeId={activeId}
        onSelect={setActiveId}
        onClose={handleCloseTab}
      />

      {activeDoc ? (
        <ResizableSplit
          className="flex-1 min-h-0"
          defaultLeftPercent={50}
          minLeft={140}
          minRight={240}
          left={
            <div className="panel-accent-cyan flex h-full flex-col bg-[hsl(var(--surface))] p-2">
              <div className="section-label mb-2 px-1">Tree</div>
              <div className="min-h-0 flex-1 overflow-y-auto">
                {activeDoc.value !== null ? (
                  <JsonTree
                    value={activeDoc.value}
                    onChange={(v) => updateValue(activeDoc.id, v)}
                  />
                ) : (
                  <p className="px-1 text-[11px] text-[hsl(var(--muted-foreground))]">
                    Parse errors — fix JSON in editor
                  </p>
                )}
              </div>
            </div>
          }
          right={
            <div className="relative flex h-full flex-col bg-[hsl(var(--background))]">
              <div className="section-label shrink-0 border-b border-[hsl(var(--border))] px-3 py-1.5">
                Source
              </div>
              <div className="relative min-h-0 flex-1">
                {monacoLoading && (
                  <div className="absolute inset-0 z-10 flex items-center justify-center bg-[hsl(var(--background))]">
                    <Loader2 size={24} className="animate-spin text-[hsl(var(--muted-foreground))]" />
                  </div>
                )}
                <MonacoEditor
                  language={LANG_MAP[activeDoc.format]}
                  value={activeDoc.content}
                  onChange={handleMonacoChange}
                  beforeMount={handleMonacoBeforeMount}
                  onMount={() => setMonacoLoading(false)}
                  theme={getJsonifeThemeId()}
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
            </div>
          }
        />
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center gap-5 text-[hsl(var(--muted-foreground))]">
          <div className="glow-cyan flex h-20 w-20 items-center justify-center rounded-2xl bg-[hsl(var(--primary)/0.08)]">
            <FileJson size={48} strokeWidth={1} className="text-[hsl(var(--primary))]" />
          </div>
          <p className="text-sm font-medium text-[hsl(var(--foreground))]">Open a JSON file to get started</p>
          <div className="flex gap-2">
            <Button onClick={() => void handleOpenFile()} disabled={openingFile}>
              {openingFile ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
              Open file
            </Button>
            <Button variant="outline" onClick={() => setUrlDialogOpen(true)}>
              <Link size={14} /> Open URL
            </Button>
          </div>
        </div>
      )}

      <Dialog
        open={urlDialogOpen}
        onClose={() => { setUrlDialogOpen(false); setUrlInput('') }}
        title="Open from URL"
        footer={
          <>
            <Button variant="outline" onClick={() => setUrlDialogOpen(false)}>Cancel</Button>
            <Button onClick={() => void handleOpenUrl()} disabled={urlLoading}>
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
            onKeyDown={(e) => e.key === 'Enter' && void handleOpenUrl()}
            autoFocus
          />
        </div>
      </Dialog>

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
