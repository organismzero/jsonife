import { useState, useMemo, useCallback, useRef, useEffect, ReactNode } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { stringifyContent } from '../../lib/json/parse'
import { jsonPathToPointer } from '../../lib/json/paths'
import { GitCompare, Save, Filter, Search } from 'lucide-react'
import { useDocumentStore } from '../../stores/documentStore'
import { computeDiff, LeafDiff, DiffKind } from '../../lib/diff/compute'
import { computeMergePreview } from '../../lib/diff/mergePreview'
import { ResizablePanels } from '../../components/ui/resizable-panels'
import { JsonTree } from '../editor/JsonTree'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Badge } from '../../components/ui/badge'
import { useToast } from '../../components/ui/toast'
import type { JsonValue } from '../../lib/json/parse'

type FilterKind = 'all' | DiffKind
type MergeBaseline = 'left' | 'right'

const KIND_LABEL: Record<DiffKind, string> = {
  add: 'Only in Right',
  remove: 'Only in Left',
  replace: 'Changed'
}

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
    <div className="flex h-full flex-col bg-[hsl(var(--surface))]">
      <div className={`shrink-0 border-b border-[hsl(var(--border))] px-2 py-1.5 ${accentClass}`}>
        <div className="text-[11px] font-semibold truncate">{title}</div>
        {subtitle && (
          <div className="text-[10px] text-[hsl(var(--muted-foreground))] truncate">{subtitle}</div>
        )}
      </div>
      <div className="flex-1 overflow-y-auto p-2 min-h-0">{children}</div>
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

export function CompareView() {
  const { documents, updateContent, pushUndo } = useDocumentStore()
  const { toast } = useToast()

  const [leftId, setLeftId] = useState('')
  const [rightId, setRightId] = useState('')
  const [arrayKey, setArrayKey] = useState('id')
  const [mergeBaseline, setMergeBaseline] = useState<MergeBaseline>('right')
  const [filterKind, setFilterKind] = useState<FilterKind>('all')
  const [search, setSearch] = useState('')
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

  const mergePreview = useMemo<JsonValue | null>(() => {
    if (!leftDoc?.value || !rightDoc?.value) return null
    const baseline = mergeBaseline === 'left' ? leftDoc.value : rightDoc.value
    return computeMergePreview(baseline, diffs, selected, rowSide)
  }, [leftDoc?.value, rightDoc?.value, mergeBaseline, diffs, selected, rowSide])

  const filtered = useMemo(() => {
    let result = diffs
    if (filterKind !== 'all') result = result.filter((d) => d.kind === filterKind)
    if (search) {
      const q = search.toLowerCase()
      result = result.filter((d) => d.pathLabel.toLowerCase().includes(q))
    }
    return result
  }, [diffs, filterKind, search])

  const parentRef = useRef<HTMLDivElement>(null)
  const virtualizer = useVirtualizer({
    count: filtered.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 40
  })

  const allSelected = filtered.length > 0 && filtered.every((d) => selected.has(d.id))

  function toggleAll() {
    if (allSelected) {
      setSelected(new Set())
    } else {
      const next = new Set(filtered.map((d) => d.id))
      setSelected(next)
      setRowSide((prev) => {
        const m = new Map(prev)
        for (const d of filtered) {
          if (d.kind === 'replace' && !m.has(d.id)) m.set(d.id, 'left')
        }
        return m
      })
    }
  }

  function toggleRow(id: string, kind: DiffKind) {
    setSelected((s) => {
      const next = new Set(s)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
        if (kind === 'replace') {
          setRowSide((prev) => {
            const m = new Map(prev)
            if (!m.has(id)) m.set(id, 'left')
            return m
          })
        }
      }
      return next
    })
  }

  function setRowPick(id: string, side: 'left' | 'right') {
    setRowSide((prev) => new Map(prev).set(id, side))
    setSelected((s) => new Set(s).add(id))
  }

  const applyMergeTo = useCallback(
    (target: 'left' | 'right') => {
      const tgtDoc = target === 'left' ? leftDoc : rightDoc
      if (!tgtDoc || mergePreview === null) return
      pushUndo(tgtDoc.id)
      const content = stringifyContent(mergePreview, tgtDoc.format)
      updateContent(tgtDoc.id, content)
      toast(`Applied merge result to ${tgtDoc.name}`, 'success')
    },
    [leftDoc, rightDoc, mergePreview, pushUndo, updateContent, toast]
  )

  if (documents.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 text-[hsl(var(--muted-foreground))]">
        <GitCompare size={48} strokeWidth={1} />
        <p className="text-sm">Open at least two documents in the editor to compare</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Config bar */}
      <div className="flex flex-wrap items-center gap-3 border-b border-[hsl(var(--border))] bg-[hsl(var(--surface))] px-3 py-2">
        <div className="flex items-center gap-2">
          <label className="text-[11px] text-[hsl(var(--muted-foreground))]">Left file</label>
          <select
            className="h-7 rounded border border-[hsl(var(--border))] bg-[hsl(var(--input))] px-2 text-xs max-w-[160px]"
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
            className="h-7 rounded border border-[hsl(var(--border))] bg-[hsl(var(--input))] px-2 text-xs max-w-[160px]"
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
          <span className="text-[11px] text-[hsl(var(--muted-foreground))]">Merge starts from</span>
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
            className="w-16 h-7 text-xs"
            value={arrayKey}
            onChange={(e) => setArrayKey(e.target.value)}
            placeholder="id"
          />
        </div>

        {leftId && rightId && mergePreview !== null && (
          <div className="ml-auto flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={() => applyMergeTo('left')} disabled={!leftDoc}>
              <Save size={11} /> Apply to Left
            </Button>
            <Button size="sm" onClick={() => applyMergeTo('right')} disabled={!rightDoc}>
              <Save size={11} /> Apply to Right
            </Button>
          </div>
        )}
      </div>

      {leftId && rightId && leftDoc?.value && rightDoc?.value ? (
        <>
          {/* 3-way preview */}
          <div className="flex-[1.2] min-h-0 border-b border-[hsl(var(--border))]">
            <ResizablePanels
              defaultRatios={[1 / 3, 1 / 3, 1 / 3]}
              panels={[
                {
                  id: 'left',
                  minWidth: 140,
                  content: (
                    <ComparePanel
                      title="Left file"
                      subtitle={leftDoc.name}
                      accentClass="border-l-2 border-l-[hsl(var(--diff-remove))]"
                    >
                      <JsonTree value={leftDoc.value} readonly highlightPaths={highlightMap} />
                    </ComparePanel>
                  )
                },
                {
                  id: 'right',
                  minWidth: 140,
                  content: (
                    <ComparePanel
                      title="Right file"
                      subtitle={rightDoc.name}
                      accentClass="border-l-2 border-l-[hsl(var(--diff-add))]"
                    >
                      <JsonTree value={rightDoc.value} readonly highlightPaths={highlightMap} />
                    </ComparePanel>
                  )
                },
                {
                  id: 'merge',
                  minWidth: 140,
                  content: (
                    <ComparePanel
                      title="Merge result"
                      subtitle={`${selected.size} change${selected.size !== 1 ? 's' : ''} applied`}
                      accentClass="border-l-2 border-l-[hsl(var(--primary))]"
                    >
                      {mergePreview !== null ? (
                        <JsonTree value={mergePreview} readonly highlightPaths={highlightMap} />
                      ) : (
                        <p className="text-[11px] text-[hsl(var(--muted-foreground))]">—</p>
                      )}
                    </ComparePanel>
                  )
                }
              ]}
            />
          </div>

          {/* Diff picker table */}
          <div className="flex-1 min-h-0 flex flex-col">
            <div className="flex flex-wrap items-center gap-2 border-b border-[hsl(var(--border))] bg-[hsl(var(--surface))] px-3 py-1.5">
              <Filter size={11} className="text-[hsl(var(--muted-foreground))]" />
              {(['all', 'add', 'remove', 'replace'] as FilterKind[]).map((k) => (
                <button
                  key={k}
                  onClick={() => setFilterKind(k)}
                  className={`rounded px-2 py-0.5 text-[11px] transition-colors ${filterKind === k ? 'bg-[hsl(var(--primary))] text-white' : 'text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]'}`}
                >
                  {k === 'all' ? `All (${diffs.length})` : KIND_LABEL[k as DiffKind]}
                </button>
              ))}
              <div className="flex flex-1 items-center gap-1 min-w-[100px] max-w-[180px]">
                <Search size={11} className="text-[hsl(var(--muted-foreground))] shrink-0" />
                <Input
                  className="h-6 text-xs"
                  placeholder="Search path…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <span className="text-[10px] text-[hsl(var(--muted-foreground))]">
                Check rows to include in merge · pick Left or Right value for changes
              </span>
            </div>

            <div ref={parentRef} className="flex-1 overflow-auto">
              <div className="sticky top-0 z-10 grid grid-cols-[28px_1fr_minmax(80px,0.6fr)_minmax(80px,0.6fr)_100px_88px] gap-0 border-b border-[hsl(var(--border))] bg-[hsl(var(--surface-raised))] text-[10px] uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
                <div className="flex items-center justify-center p-2">
                  <input type="checkbox" checked={allSelected} onChange={toggleAll} className="accent-[hsl(var(--primary))]" />
                </div>
                <div className="p-2">Path</div>
                <div className="p-2 truncate text-[hsl(var(--diff-remove))]">{leftDoc.name}</div>
                <div className="p-2 truncate text-[hsl(var(--diff-add))]">{rightDoc.name}</div>
                <div className="p-2">Kind</div>
                <div className="p-2">Use</div>
              </div>

              <div style={{ height: virtualizer.getTotalSize(), position: 'relative' }}>
                {virtualizer.getVirtualItems().map((vi) => {
                  const d = filtered[vi.index]
                  const side = rowSide.get(d.id) ?? 'left'
                  const isSel = selected.has(d.id)
                  return (
                    <div
                      key={d.id}
                      style={{ position: 'absolute', top: vi.start, left: 0, right: 0, height: vi.size }}
                      className={`grid grid-cols-[28px_1fr_minmax(80px,0.6fr)_minmax(80px,0.6fr)_100px_88px] gap-0 border-b border-[hsl(var(--border)/0.5)] text-xs hover:bg-[hsl(var(--surface-raised))] ${isSel ? 'bg-[hsl(var(--primary)/0.08)]' : ''}`}
                    >
                      <div className="flex items-center justify-center">
                        <input
                          type="checkbox"
                          checked={isSel}
                          onChange={() => toggleRow(d.id, d.kind)}
                          className="accent-[hsl(var(--primary))]"
                        />
                      </div>
                      <div className="mono truncate p-2 text-[11px]">{d.pathLabel}</div>
                      <div className={`mono truncate p-2 text-[11px] ${d.kind === 'remove' || (isSel && side === 'left') ? 'text-[hsl(var(--diff-remove))] font-medium' : 'text-[hsl(var(--muted-foreground))]'}`}>
                        {d.left !== undefined ? JSON.stringify(d.left) : '—'}
                      </div>
                      <div className={`mono truncate p-2 text-[11px] ${d.kind === 'add' || (isSel && side === 'right') ? 'text-[hsl(var(--diff-add))] font-medium' : d.kind === 'replace' ? 'text-[hsl(var(--diff-change))]' : 'text-[hsl(var(--muted-foreground))]'}`}>
                        {d.right !== undefined ? JSON.stringify(d.right) : '—'}
                      </div>
                      <div className="flex items-center p-1">
                        <Badge variant={d.kind}>{KIND_LABEL[d.kind]}</Badge>
                      </div>
                      <div className="flex items-center gap-0.5 p-1">
                        {d.kind === 'replace' ? (
                          <>
                            <button
                              type="button"
                              onClick={() => setRowPick(d.id, 'left')}
                              className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${isSel && side === 'left' ? 'bg-[hsl(var(--diff-remove))] text-white' : 'bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]'}`}
                            >
                              L
                            </button>
                            <button
                              type="button"
                              onClick={() => setRowPick(d.id, 'right')}
                              className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${isSel && side === 'right' ? 'bg-[hsl(var(--diff-add))] text-white' : 'bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]'}`}
                            >
                              R
                            </button>
                          </>
                        ) : d.kind === 'remove' ? (
                          <span className="text-[10px] text-[hsl(var(--diff-remove))]">← Left</span>
                        ) : (
                          <span className="text-[10px] text-[hsl(var(--diff-add))]">Right →</span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>

              {filtered.length === 0 && (
                <div className="flex flex-col items-center justify-center h-24 gap-2 text-[hsl(var(--muted-foreground))]">
                  <p className="text-sm">{diffs.length === 0 ? 'No differences found' : 'No results match the filter'}</p>
                </div>
              )}
            </div>
          </div>
        </>
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 text-[hsl(var(--muted-foreground))]">
          <GitCompare size={40} strokeWidth={1} />
          <p className="text-sm">Select left and right files above to compare</p>
        </div>
      )}
    </div>
  )
}
