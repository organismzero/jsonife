import { useState, useMemo, useCallback, useRef } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { stringifyContent } from '../../lib/json/parse'
import { GitCompare, Copy, RotateCcw, Filter, Search } from 'lucide-react'
import { useDocumentStore } from '../../stores/documentStore'
import { computeDiff, LeafDiff, DiffKind } from '../../lib/diff/compute'
import { applyLeaves } from '../../lib/diff/applyLeaves'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Badge } from '../../components/ui/badge'
import { useToast } from '../../components/ui/toast'

type FilterKind = 'all' | DiffKind

export function CompareView() {
  const { documents, updateContent, pushUndo } = useDocumentStore()
  const { toast } = useToast()

  const [leftId, setLeftId] = useState<string>('')
  const [rightId, setRightId] = useState<string>('')
  const [arrayKey, setArrayKey] = useState('id')
  const [sourceRoot, setSourceRoot] = useState('/')
  const [targetRoot, setTargetRoot] = useState('/')
  const [filterKind, setFilterKind] = useState<FilterKind>('all')
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [undoSnapshot, setUndoSnapshot] = useState<string | null>(null)

  const leftDoc = documents.find((d) => d.id === leftId)
  const rightDoc = documents.find((d) => d.id === rightId)

  const diffs = useMemo<LeafDiff[]>(() => {
    if (!leftDoc?.value || !rightDoc?.value) return []
    return computeDiff(leftDoc.value, rightDoc.value, arrayKey || 'id')
  }, [leftDoc, rightDoc, arrayKey])

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
    estimateSize: () => 36
  })

  const allSelected = filtered.length > 0 && filtered.every((d) => selected.has(d.id))

  function toggleAll() {
    if (allSelected) {
      setSelected(new Set())
    } else {
      setSelected(new Set(filtered.map((d) => d.id)))
    }
  }

  function toggleRow(id: string) {
    setSelected((s) => {
      const next = new Set(s)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const handleApply = useCallback(
    (direction: 'leftToRight' | 'rightToLeft') => {
      const srcDoc = direction === 'leftToRight' ? leftDoc : rightDoc
      const tgtDoc = direction === 'leftToRight' ? rightDoc : leftDoc
      if (!srcDoc || !tgtDoc || !tgtDoc.value) return

      const toApply = filtered.filter((d) => selected.has(d.id))
      if (toApply.length === 0) { toast('No rows selected', 'warning'); return }

      // Snapshot for undo
      setUndoSnapshot(tgtDoc.content)
      pushUndo(tgtDoc.id)

      const result = applyLeaves(tgtDoc.value, toApply, sourceRoot, targetRoot)
      const newContent = stringifyContent(result.value, tgtDoc.format)
      updateContent(tgtDoc.id, newContent)

      if (result.applied.length > 0) {
        toast(`Applied ${result.applied.length} change${result.applied.length > 1 ? 's' : ''}`, 'success')
      }
      if (result.skipped.length > 0) {
        toast(`Skipped ${result.skipped.length}: ${result.skipped[0].reason}`, 'warning')
      }
      setSelected(new Set())
    },
    [filtered, selected, leftDoc, rightDoc, sourceRoot, targetRoot, pushUndo, updateContent, toast]
  )

  function handleUndo(direction: 'leftToRight' | 'rightToLeft') {
    const tgtDoc = direction === 'leftToRight' ? rightDoc : leftDoc
    if (!tgtDoc || !undoSnapshot) return
    const { popUndo } = useDocumentStore.getState()
    popUndo(tgtDoc.id)
    setUndoSnapshot(null)
    toast('Undone', 'info')
  }

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
          <label className="text-[11px] text-[hsl(var(--muted-foreground))]">Left</label>
          <select
            className="h-7 rounded border border-[hsl(var(--border))] bg-[hsl(var(--input))] px-2 text-xs text-[hsl(var(--foreground))]"
            value={leftId}
            onChange={(e) => setLeftId(e.target.value)}
          >
            <option value="">-- select --</option>
            {documents.map((d) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-[11px] text-[hsl(var(--muted-foreground))]">Right</label>
          <select
            className="h-7 rounded border border-[hsl(var(--border))] bg-[hsl(var(--input))] px-2 text-xs text-[hsl(var(--foreground))]"
            value={rightId}
            onChange={(e) => setRightId(e.target.value)}
          >
            <option value="">-- select --</option>
            {documents.map((d) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
        </div>

        <div className="h-4 w-px bg-[hsl(var(--border))]" />

        <div className="flex items-center gap-1">
          <label className="text-[11px] text-[hsl(var(--muted-foreground))]">Array key</label>
          <Input
            className="w-20 h-7 text-xs"
            value={arrayKey}
            onChange={(e) => setArrayKey(e.target.value)}
            placeholder="id"
          />
        </div>
        <div className="flex items-center gap-1">
          <label className="text-[11px] text-[hsl(var(--muted-foreground))]">Src root</label>
          <Input className="w-28 h-7 text-xs mono" value={sourceRoot} onChange={(e) => setSourceRoot(e.target.value)} placeholder="/" />
        </div>
        <div className="flex items-center gap-1">
          <label className="text-[11px] text-[hsl(var(--muted-foreground))]">Tgt root</label>
          <Input className="w-28 h-7 text-xs mono" value={targetRoot} onChange={(e) => setTargetRoot(e.target.value)} placeholder="/" />
        </div>
      </div>

      {/* Action bar */}
      {leftId && rightId && (
        <div className="flex flex-wrap items-center gap-2 border-b border-[hsl(var(--border))] bg-[hsl(var(--surface))] px-3 py-1.5">
          {/* Filter */}
          <div className="flex items-center gap-1 text-[11px] text-[hsl(var(--muted-foreground))]">
            <Filter size={11} />
          </div>
          {(['all', 'add', 'remove', 'replace'] as FilterKind[]).map((k) => (
            <button
              key={k}
              onClick={() => setFilterKind(k)}
              className={`rounded px-2 py-0.5 text-[11px] transition-colors ${filterKind === k ? 'bg-[hsl(var(--primary))] text-white' : 'text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]'}`}
            >
              {k === 'all' ? `All (${diffs.length})` : k === 'add' ? `Added` : k === 'remove' ? `Removed` : `Changed`}
            </button>
          ))}

          <div className="flex-1 flex items-center gap-1 min-w-[120px] max-w-[200px]">
            <Search size={11} className="text-[hsl(var(--muted-foreground))] shrink-0" />
            <Input
              className="h-6 text-xs"
              placeholder="Search path…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="ml-auto flex items-center gap-2">
            {selected.size > 0 && (
              <>
                <span className="text-[11px] text-[hsl(var(--muted-foreground))]">{selected.size} selected</span>
                <Button size="sm" variant="outline" onClick={() => handleApply('leftToRight')}>
                  <Copy size={11} /> L → R
                </Button>
                <Button size="sm" variant="outline" onClick={() => handleApply('rightToLeft')}>
                  <Copy size={11} /> R → L
                </Button>
                {undoSnapshot && (
                  <Button size="sm" variant="ghost" onClick={() => handleUndo('leftToRight')}>
                    <RotateCcw size={11} /> Undo
                  </Button>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* Table */}
      {leftId && rightId ? (
        <div ref={parentRef} className="flex-1 overflow-auto">
          {/* Header */}
          <div className="sticky top-0 z-10 grid grid-cols-[28px_1fr_1fr_1fr_80px] gap-0 border-b border-[hsl(var(--border))] bg-[hsl(var(--surface-raised))] text-[10px] uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
            <div className="flex items-center justify-center p-2">
              <input type="checkbox" checked={allSelected} onChange={toggleAll} className="accent-[hsl(var(--primary))]" />
            </div>
            <div className="p-2">Path</div>
            <div className="p-2">Left value</div>
            <div className="p-2">Right value</div>
            <div className="p-2">Kind</div>
          </div>

          <div style={{ height: virtualizer.getTotalSize(), position: 'relative' }}>
            {virtualizer.getVirtualItems().map((vi) => {
              const d = filtered[vi.index]
              return (
                <div
                  key={d.id}
                  style={{
                    position: 'absolute',
                    top: vi.start,
                    left: 0,
                    right: 0,
                    height: vi.size
                  }}
                  className={`grid grid-cols-[28px_1fr_1fr_1fr_80px] gap-0 border-b border-[hsl(var(--border)/0.5)] text-xs hover:bg-[hsl(var(--surface-raised))] ${selected.has(d.id) ? 'bg-[hsl(var(--primary)/0.06)]' : ''}`}
                >
                  <div className="flex items-center justify-center">
                    <input
                      type="checkbox"
                      checked={selected.has(d.id)}
                      onChange={() => toggleRow(d.id)}
                      className="accent-[hsl(var(--primary))]"
                    />
                  </div>
                  <div className="mono truncate p-2 text-[11px] text-[hsl(var(--foreground))]">{d.pathLabel}</div>
                  <div className={`mono truncate p-2 text-[11px] ${d.kind === 'remove' ? 'text-[hsl(var(--diff-remove))]' : 'text-[hsl(var(--muted-foreground))]'}`}>
                    {d.left !== undefined ? JSON.stringify(d.left) : '—'}
                  </div>
                  <div className={`mono truncate p-2 text-[11px] ${d.kind === 'add' ? 'text-[hsl(var(--diff-add))]' : d.kind === 'replace' ? 'text-[hsl(var(--diff-change))]' : 'text-[hsl(var(--muted-foreground))]'}`}>
                    {d.right !== undefined ? JSON.stringify(d.right) : '—'}
                  </div>
                  <div className="flex items-center p-2">
                    <Badge variant={d.kind}>{d.kind}</Badge>
                  </div>
                </div>
              )
            })}
          </div>

          {filtered.length === 0 && (
            <div className="flex flex-col items-center justify-center h-40 gap-2 text-[hsl(var(--muted-foreground))]">
              <GitCompare size={32} strokeWidth={1} />
              <p className="text-sm">{diffs.length === 0 ? 'No differences found' : 'No results match the filter'}</p>
            </div>
          )}
        </div>
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 text-[hsl(var(--muted-foreground))]">
          <GitCompare size={40} strokeWidth={1} />
          <p className="text-sm">Select two documents above to compare</p>
        </div>
      )}
    </div>
  )
}
