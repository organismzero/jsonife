import { useState, useMemo, useCallback, useEffect, ReactNode } from 'react'
import { stringifyContent } from '../../lib/json/parse'
import { jsonPathToPointer } from '../../lib/json/paths'
import { GitCompare } from 'lucide-react'
import { useDocumentStore } from '../../stores/documentStore'
import { useCompareShellStore } from '../../stores/compareShellStore'
import { computeDiff, LeafDiff, DiffKind } from '../../lib/diff/compute'
import { computeMergePreview } from '../../lib/diff/mergePreview'
import { ResizablePanels } from '../../components/ui/resizable-panels'
import { JsonTree } from '../editor/JsonTree'
import { Button } from '../../components/ui/button'
import { Badge } from '../../components/ui/badge'
import { Input } from '../../components/ui/input'
import { useToast } from '../../components/ui/toast'
import type { JsonValue } from '../../lib/json/parse'

type MergeBaseline = 'left' | 'right'

function ComparePanel({
  title,
  subtitle,
  accentClass,
  children
}: {
  title: string
  subtitle?: string
  accentClass: string
  children: ReactNode
}) {
  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-[hsl(var(--surface))]">
      <div className={`shrink-0 border-b border-[hsl(var(--border))] px-3 py-2 ${accentClass}`}>
        <div className="text-[11px] font-semibold truncate text-[hsl(var(--foreground))]">{title}</div>
        {subtitle && (
          <div className="text-[10px] text-[hsl(var(--muted-foreground))] truncate">{subtitle}</div>
        )}
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-2">{children}</div>
    </div>
  )
}

function buildHighlightMap(diffs: LeafDiff[]): Map<string, DiffKind> {
  const m = new Map<string, DiffKind>()
  for (const d of diffs) {
    m.set(jsonPathToPointer(d.path), d.kind)
  }
  return m
}

function buildDiffByPointer(diffs: LeafDiff[]): Map<string, LeafDiff> {
  const m = new Map<string, LeafDiff>()
  for (const d of diffs) {
    m.set(jsonPathToPointer(d.path), d)
  }
  return m
}

export function CompareView() {
  const { documents, updateContent, pushUndo } = useDocumentStore()
  const { toast } = useToast()
  const setMetrics = useCompareShellStore((s) => s.setMetrics)

  const [leftId, setLeftId] = useState('')
  const [rightId, setRightId] = useState('')
  const [arrayKey, setArrayKey] = useState('id')
  const [mergeBaseline, setMergeBaseline] = useState<MergeBaseline>('right')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [rowSide, setRowSide] = useState<Map<string, 'left' | 'right'>>(new Map())

  const leftDoc = documents.find((d) => d.id === leftId)
  const rightDoc = documents.find((d) => d.id === rightId)

  useEffect(() => {
    setSelected(new Set())
    setRowSide(new Map())
  }, [leftId, rightId])

  const diffs = useMemo<LeafDiff[]>(() => {
    if (!leftDoc?.value || !rightDoc?.value) return []
    return computeDiff(leftDoc.value, rightDoc.value, arrayKey || 'id')
  }, [leftId, rightId, leftDoc?.content, rightDoc?.content, arrayKey])

  const highlightMap = useMemo(() => buildHighlightMap(diffs), [diffs])
  const diffByPointer = useMemo(() => buildDiffByPointer(diffs), [diffs])

  const selectedPointers = useMemo(() => {
    const s = new Set<string>()
    for (const d of diffs) {
      if (selected.has(d.id)) s.add(jsonPathToPointer(d.path))
    }
    return s
  }, [diffs, selected])

  const mergePreview = useMemo<JsonValue | null>(() => {
    if (!leftDoc?.value || !rightDoc?.value) return null
    const baseline = mergeBaseline === 'left' ? leftDoc.value : rightDoc.value
    return computeMergePreview(baseline, diffs, selected, rowSide)
  }, [leftDoc?.value, rightDoc?.value, mergeBaseline, diffs, selected, rowSide])

  const diffCounts = useMemo(() => {
    let adds = 0
    let removes = 0
    let replaces = 0
    for (const d of diffs) {
      if (d.kind === 'add') adds++
      else if (d.kind === 'remove') removes++
      else replaces++
    }
    return { adds, removes, replaces }
  }, [diffs])

  const applyMergeTo = useCallback(
    (target: 'left' | 'right') => {
      const tgtDoc = target === 'left' ? leftDoc : rightDoc
      if (!tgtDoc || mergePreview === null) return
      pushUndo(tgtDoc.id)
      updateContent(tgtDoc.id, stringifyContent(mergePreview, tgtDoc.format))
      toast(`Applied merge result to ${tgtDoc.name}`, 'success')
    },
    [leftDoc, rightDoc, mergePreview, pushUndo, updateContent, toast]
  )

  useEffect(() => {
    if (!leftId || !rightId || !leftDoc?.value || !rightDoc?.value) {
      setMetrics(null)
      return
    }
    setMetrics({
      totalDiffs: diffs.length,
      selectedCount: selected.size,
      adds: diffCounts.adds,
      removes: diffCounts.removes,
      replaces: diffCounts.replaces,
      mergeReady: mergePreview !== null && selected.size > 0,
      applyToLeft: () => applyMergeTo('left'),
      applyToRight: () => applyMergeTo('right')
    })
    return () => setMetrics(null)
  }, [
    leftId,
    rightId,
    leftDoc?.value,
    rightDoc?.value,
    diffs.length,
    selected.size,
    diffCounts,
    mergePreview,
    applyMergeTo,
    setMetrics
  ])

  const toggleDiffAtPointer = useCallback(
    (pointer: string, fromPanel: 'left' | 'right') => {
      const d = diffByPointer.get(pointer)
      if (!d) return

      setSelected((prev) => {
        const next = new Set(prev)
        if (next.has(d.id)) {
          next.delete(d.id)
        } else {
          next.add(d.id)
          if (d.kind === 'replace') {
            setRowSide((rs) => new Map(rs).set(d.id, fromPanel))
          } else if (d.kind === 'remove') {
            setRowSide((rs) => new Map(rs).set(d.id, 'left'))
          } else {
            setRowSide((rs) => new Map(rs).set(d.id, 'right'))
          }
        }
        return next
      })
    },
    [diffByPointer]
  )

  function selectAllDiffs() {
    setSelected(new Set(diffs.map((d) => d.id)))
    setRowSide((prev) => {
      const m = new Map(prev)
      for (const d of diffs) {
        if (d.kind === 'replace' && !m.has(d.id)) m.set(d.id, 'left')
        else if (d.kind === 'remove') m.set(d.id, 'left')
        else if (d.kind === 'add') m.set(d.id, 'right')
      }
      return m
    })
  }

  if (documents.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 text-[hsl(var(--muted-foreground))]">
        <div className="glow-cyan flex h-16 w-16 items-center justify-center rounded-xl bg-[hsl(var(--primary)/0.08)]">
          <GitCompare size={40} strokeWidth={1} className="text-[hsl(var(--primary))]" />
        </div>
        <p className="text-sm">Open at least two documents in the editor to compare</p>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex shrink-0 flex-wrap items-center gap-3 border-b border-[hsl(var(--border))] bg-[hsl(var(--surface))] px-3 py-2">
        <div className="flex items-center gap-2">
          <label className="text-[11px] text-[hsl(var(--muted-foreground))]">Left file</label>
          <select
            className="h-7 max-w-[160px] rounded border border-[hsl(var(--border))] bg-[hsl(var(--input))] px-2 text-xs focus:ring-2 focus:ring-[hsl(var(--primary)/0.4)]"
            value={leftId}
            onChange={(e) => setLeftId(e.target.value)}
          >
            <option value="">— select —</option>
            {documents.map((d) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-[11px] text-[hsl(var(--muted-foreground))]">Right file</label>
          <select
            className="h-7 max-w-[160px] rounded border border-[hsl(var(--border))] bg-[hsl(var(--input))] px-2 text-xs focus:ring-2 focus:ring-[hsl(var(--primary)/0.4)]"
            value={rightId}
            onChange={(e) => setRightId(e.target.value)}
          >
            <option value="">— select —</option>
            {documents.map((d) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
        </div>

        <div className="h-4 w-px bg-[hsl(var(--border))]" />

        <div className="flex items-center gap-2">
          <span className="text-[11px] text-[hsl(var(--muted-foreground))]">Merge from</span>
          <select
            className="h-7 rounded border border-[hsl(var(--border))] bg-[hsl(var(--input))] px-2 text-xs"
            value={mergeBaseline}
            onChange={(e) => setMergeBaseline(e.target.value as MergeBaseline)}
            disabled={!leftId || !rightId}
          >
            <option value="right">Right file</option>
            <option value="left">Left file</option>
          </select>
        </div>

        <div className="flex items-center gap-1">
          <label className="text-[11px] text-[hsl(var(--muted-foreground))]">Array key</label>
          <Input
            className="h-7 w-16 text-xs"
            value={arrayKey}
            onChange={(e) => setArrayKey(e.target.value)}
            placeholder="id"
          />
        </div>

        {leftId && rightId && diffs.length > 0 && (
          <>
            <div className="flex items-center gap-1.5">
              <Badge variant="add">{diffCounts.adds} add</Badge>
              <Badge variant="remove">{diffCounts.removes} remove</Badge>
              <Badge variant="replace">{diffCounts.replaces} replace</Badge>
            </div>
            <Button size="sm" variant="ghost" onClick={selectAllDiffs}>
              Select all ({diffs.length})
            </Button>
            <Button size="sm" variant="ghost" onClick={() => { setSelected(new Set()); setRowSide(new Map()) }}>
              Clear
            </Button>
          </>
        )}
      </div>

      {leftId && rightId && leftDoc?.value && rightDoc?.value ? (
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <ResizablePanels
            className="h-full"
            defaultRatios={[1 / 3, 1 / 3, 1 / 3]}
            panels={[
              {
                id: 'left',
                minWidth: 160,
                content: (
                  <ComparePanel
                    title="Left file"
                    subtitle={`${leftDoc.name} · ${diffs.length} change${diffs.length !== 1 ? 's' : ''}`}
                    accentClass="border-l-2 border-l-[hsl(var(--diff-remove))]"
                  >
                    <JsonTree
                      value={leftDoc.value}
                      readonly
                      highlightPaths={highlightMap}
                      selectedPaths={selectedPointers}
                      onHighlightClick={(p) => toggleDiffAtPointer(p, 'left')}
                    />
                  </ComparePanel>
                )
              },
              {
                id: 'right',
                minWidth: 160,
                content: (
                  <ComparePanel
                    title="Right file"
                    subtitle={`${rightDoc.name} · click highlights to merge`}
                    accentClass="border-l-2 border-l-[hsl(var(--diff-add))]"
                  >
                    <JsonTree
                      value={rightDoc.value}
                      readonly
                      highlightPaths={highlightMap}
                      selectedPaths={selectedPointers}
                      onHighlightClick={(p) => toggleDiffAtPointer(p, 'right')}
                    />
                  </ComparePanel>
                )
              },
              {
                id: 'merge',
                minWidth: 160,
                content: (
                  <ComparePanel
                    title="Merge result"
                    subtitle={`${selected.size} of ${diffs.length} included`}
                    accentClass="border-l-2 border-l-[hsl(var(--primary))]"
                  >
                    {mergePreview !== null && (
                      <JsonTree
                        value={mergePreview}
                        readonly
                        highlightPaths={highlightMap}
                        selectedPaths={selectedPointers}
                      />
                    )}
                  </ComparePanel>
                )
              }
            ]}
          />
        </div>
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 text-[hsl(var(--muted-foreground))]">
          <GitCompare size={40} strokeWidth={1} className="text-[hsl(var(--primary)/0.5)]" />
          <p className="text-sm">Select left and right files above to compare</p>
        </div>
      )}
    </div>
  )
}
