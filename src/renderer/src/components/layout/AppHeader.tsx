import { ChevronRight, Upload, Link, Save, WrapText, RotateCcw, AlertTriangle, Loader2 } from 'lucide-react'
import type { View } from './Sidebar'
import { Button } from '../ui/button'
import { useEditorCommands } from '../../hooks/useEditorCommands'

const VIEW_LABELS: Record<View, string> = {
  editor: 'Editor',
  compare: 'Compare',
  charts: 'Charts'
}

interface AppHeaderProps {
  view: View
}

export function AppHeader({ view }: AppHeaderProps) {
  const {
    activeDoc,
    openingFile,
    handleOpenFile,
    handleSave,
    handleFormat,
    handleUndoApply,
    setUrlDialogOpen
  } = useEditorCommands()

  const docLabel = activeDoc?.name ?? null
  const crumbs = ['Jsonife', VIEW_LABELS[view], ...(docLabel && view === 'editor' ? [docLabel] : [])]

  return (
    <header className="drag-region shrink-0 border-b border-[hsl(var(--border))] bg-[hsl(var(--surface))] px-4 py-2.5">
      <div className="flex items-center justify-between gap-4">
        <div className="no-drag flex min-w-0 flex-col gap-0.5">
          <nav className="flex items-center gap-1 text-[11px] text-[hsl(var(--muted-foreground))]">
            {crumbs.map((part, i) => (
              <span key={i} className="flex items-center gap-1">
                {i > 0 && <ChevronRight size={10} className="opacity-50" />}
                <span className={i === crumbs.length - 1 ? 'text-[hsl(var(--foreground))]' : ''}>
                  {part}
                </span>
              </span>
            ))}
          </nav>
          <h1 className="flex items-center gap-1 text-base font-semibold text-[hsl(var(--foreground))]">
            {VIEW_LABELS[view]}
            <ChevronRight size={14} className="rotate-90 text-[hsl(var(--muted-foreground))]" />
          </h1>
        </div>

        {view === 'editor' && (
          <div className="no-drag flex flex-wrap items-center justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => void handleOpenFile()} disabled={openingFile}>
              {openingFile ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} />}
              Open
            </Button>
            <Button variant="outline" size="sm" onClick={() => setUrlDialogOpen(true)}>
              <Link size={12} /> URL
            </Button>
            {activeDoc && (
              <>
                <div className="h-4 w-px bg-[hsl(var(--border))]" />
                <Button variant="outline" size="sm" onClick={() => void handleSave()}>
                  <Save size={12} /> Save
                </Button>
                <Button variant="ghost" size="sm" onClick={handleFormat}>
                  <WrapText size={12} /> Format
                </Button>
                {activeDoc.undoStack.length > 0 && (
                  <Button variant="ghost" size="sm" onClick={handleUndoApply}>
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
        )}
      </div>
    </header>
  )
}
