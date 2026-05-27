import { Save, Search } from 'lucide-react'
import type { View } from './Sidebar'
import { Button } from '../ui/button'
import { useDocumentStore } from '../../stores/documentStore'
import { useCompareShellStore } from '../../stores/compareShellStore'
import { countNodes, formatContentSize } from '../../lib/stats/jsonStats'

interface StatusBarProps {
  view: View
}

function MetricPanel({
  label,
  value,
  sub
}: {
  label: string
  value: string | number
  sub?: string
}) {
  return (
    <div className="flex flex-1 flex-col justify-center px-5 py-2 min-w-0">
      <span className="metric-label">{label}</span>
      <span className="metric-value text-[hsl(var(--foreground))] truncate">{value}</span>
      {sub && <span className="text-[10px] text-[hsl(var(--muted-foreground))] mt-0.5">{sub}</span>}
    </div>
  )
}

export function StatusBar({ view }: StatusBarProps) {
  const { documents, activeId } = useDocumentStore()
  const activeDoc = documents.find((d) => d.id === activeId) ?? null
  const compareMetrics = useCompareShellStore((s) => s.metrics)

  if (view === 'compare' && compareMetrics) {
    const m = compareMetrics
    return (
      <footer className="shrink-0 flex items-stretch border-t border-[hsl(var(--border))] bg-[hsl(var(--surface))] min-h-[72px]">
        <MetricPanel label="Total changes" value={m.totalDiffs} />
        <div className="divider-vertical my-3" />
        <MetricPanel label="Selected for merge" value={m.selectedCount} sub={`of ${m.totalDiffs}`} />
        <div className="divider-vertical my-3" />
        <MetricPanel
          label="Breakdown"
          value={`+${m.adds} / −${m.removes} / ~${m.replaces}`}
          sub="add / remove / replace"
        />
        <div className="divider-vertical my-3" />
        <div className="flex flex-1 items-center justify-center gap-2 px-4">
          {m.mergeReady ? (
            <>
              <Button
                variant="outline"
                size="sm"
                className="glow-lime border-[hsl(var(--cta))] text-[hsl(var(--cta))] hover:bg-[hsl(var(--cta)/0.1)]"
                onClick={m.applyToLeft}
              >
                <Save size={12} /> Apply to Left
              </Button>
              <Button
                variant="default"
                size="sm"
                className="glow-lime"
                onClick={m.applyToRight}
              >
                <Search size={12} /> Apply to Right
              </Button>
            </>
          ) : (
            <span className="text-xs text-[hsl(var(--muted-foreground))]">Select files and diffs to merge</span>
          )}
        </div>
      </footer>
    )
  }

  if (view === 'compare') {
    return (
      <footer className="shrink-0 flex items-center border-t border-[hsl(var(--border))] bg-[hsl(var(--surface))] px-5 py-3 min-h-[72px]">
        <span className="text-xs text-[hsl(var(--muted-foreground))]">
          Open two documents and select left/right files to compare
        </span>
      </footer>
    )
  }

  if (view === 'editor' && activeDoc) {
    const nodes = countNodes(activeDoc.value)
    const size = formatContentSize(activeDoc.content)
    const status = activeDoc.isDirty ? 'Unsaved' : 'Saved'
    return (
      <footer className="shrink-0 flex items-stretch border-t border-[hsl(var(--border))] bg-[hsl(var(--surface))] min-h-[72px]">
        <MetricPanel label="Size" value={size} sub={activeDoc.format.toUpperCase()} />
        <div className="divider-vertical my-3" />
        <MetricPanel label="Nodes" value={activeDoc.value !== null ? nodes : '—'} />
        <div className="divider-vertical my-3" />
        <MetricPanel
          label="Parse errors"
          value={activeDoc.errors.length}
          sub={activeDoc.errors.length === 0 ? 'Valid JSON' : 'Fix in source editor'}
        />
        <div className="divider-vertical my-3" />
        <MetricPanel
          label="Status"
          value={status}
          sub={activeDoc.name}
        />
      </footer>
    )
  }

  if (view === 'editor') {
    return (
      <footer className="shrink-0 flex items-center border-t border-[hsl(var(--border))] bg-[hsl(var(--surface))] px-5 py-3 min-h-[72px]">
        <span className="text-xs text-[hsl(var(--muted-foreground))]">
          Open a JSON, JSONC, or JSONL file to begin
        </span>
      </footer>
    )
  }

  return (
    <footer className="shrink-0 border-t border-[hsl(var(--border))] bg-[hsl(var(--surface))] min-h-[48px]" />
  )
}
