import { useState, type ReactNode } from 'react'
import { ChevronRight, ChevronDown, Plus, Trash2 } from 'lucide-react'
import type { JsonValue } from '../../lib/json/parse'
import type { DiffKind } from '../../lib/diff/compute'

interface JsonTreeProps {
  value: JsonValue
  onChange?: (value: JsonValue) => void
  readonly?: boolean
  depth?: number
  path?: string
  /** JSON Pointer → diff kind for path highlighting */
  highlightPaths?: Map<string, DiffKind>
}

const HIGHLIGHT_CLASS: Record<DiffKind, string> = {
  add: 'rounded px-0.5 bg-[hsl(var(--diff-add-bg))]',
  remove: 'rounded px-0.5 bg-[hsl(var(--diff-remove-bg))]',
  replace: 'rounded px-0.5 bg-[hsl(var(--diff-change-bg))]'
}

function wrapHighlight(
  path: string,
  highlightPaths: Map<string, DiffKind> | undefined,
  node: ReactNode
): ReactNode {
  const kind = highlightPaths?.get(path)
  if (!kind) return node
  return <span className={HIGHLIGHT_CLASS[kind]}>{node}</span>
}

function ValueEditor({
  value,
  onChange,
  path,
  highlightPaths
}: {
  value: JsonValue
  onChange?: (v: JsonValue) => void
  path?: string
  highlightPaths?: Map<string, DiffKind>
}) {
  const [editing, setEditing] = useState(false)
  const [raw, setRaw] = useState(String(value))

  if (!onChange) {
    return wrapHighlight(
      path ?? '/',
      highlightPaths,
      <span className="mono text-[11px] text-[hsl(var(--secondary))]">
        {JSON.stringify(value)}
      </span>
    )
  }

  if (editing) {
    return (
      <input
        autoFocus
        className="mono text-[11px] h-5 rounded border border-[hsl(var(--primary))] bg-[hsl(var(--input))] px-1 text-[hsl(var(--foreground))] w-48"
        value={raw}
        onChange={(e) => setRaw(e.target.value)}
        onBlur={() => {
          setEditing(false)
          try {
            onChange(JSON.parse(raw))
          } catch {
            onChange(raw)
          }
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') e.currentTarget.blur()
          if (e.key === 'Escape') { setEditing(false); setRaw(String(value)) }
        }}
      />
    )
  }

  return (
    <span
      className="mono text-[11px] text-[hsl(var(--secondary))] cursor-pointer hover:underline"
      onClick={() => { setRaw(JSON.stringify(value)); setEditing(true) }}
    >
      {JSON.stringify(value)}
    </span>
  )
}

export function JsonTree({
  value,
  onChange,
  readonly = false,
  depth = 0,
  path = '',
  highlightPaths
}: JsonTreeProps) {
  const [collapsed, setCollapsed] = useState(depth > 2)

  const indent = depth * 12

  if (value === null || typeof value !== 'object') {
    const leafPath = path || '/'
    return (
      <div className="flex items-center gap-1.5 py-0.5" style={{ paddingLeft: indent + 4 }}>
        <span className="w-3" />
        <ValueEditor
          value={value}
          onChange={readonly ? undefined : onChange}
          path={leafPath}
          highlightPaths={highlightPaths}
        />
      </div>
    )
  }

  if (Array.isArray(value)) {
    return (
      <div>
        <div
          className="flex items-center gap-1 py-0.5 cursor-pointer hover:bg-[hsl(var(--surface-raised))] rounded"
          style={{ paddingLeft: indent }}
          onClick={() => setCollapsed(!collapsed)}
        >
          {collapsed ? <ChevronRight size={12} className="text-[hsl(var(--muted-foreground))]" /> : <ChevronDown size={12} className="text-[hsl(var(--muted-foreground))]" />}
          <span className="text-[hsl(var(--muted-foreground))] text-[11px]">
            [{value.length}]
          </span>
        </div>
        {!collapsed && (
          <div>
            {value.map((item, i) => (
              <div key={i} className="flex items-start gap-1">
                <div className="shrink-0" style={{ paddingLeft: indent + 12 }}>
                  <span className="text-[hsl(var(--primary))] text-[11px] font-semibold mono">{i}</span>
                </div>
                <div className="flex-1">
                  <JsonTree
                    value={item}
                    onChange={onChange ? (v) => {
                      const arr = [...value]
                      arr[i] = v
                      onChange(arr)
                    } : undefined}
                    readonly={readonly}
                    depth={depth + 1}
                    path={`${path}/${i}`}
                    highlightPaths={highlightPaths}
                  />
                </div>
                {!readonly && onChange && (
                  <button
                    className="mt-0.5 p-0.5 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--destructive))]"
                    onClick={() => {
                      const arr = [...value]
                      arr.splice(i, 1)
                      onChange(arr)
                    }}
                  >
                    <Trash2 size={10} />
                  </button>
                )}
              </div>
            ))}
            {!readonly && onChange && (
              <button
                className="flex items-center gap-1 pl-2 py-0.5 text-[11px] text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--primary))]"
                style={{ paddingLeft: indent + 16 }}
                onClick={() => onChange([...value, null])}
              >
                <Plus size={10} /> Add item
              </button>
            )}
          </div>
        )}
      </div>
    )
  }

  const keys = Object.keys(value as object)
  return (
    <div>
      <div
        className="flex items-center gap-1 py-0.5 cursor-pointer hover:bg-[hsl(var(--surface-raised))] rounded"
        style={{ paddingLeft: indent }}
        onClick={() => setCollapsed(!collapsed)}
      >
        {collapsed ? <ChevronRight size={12} className="text-[hsl(var(--muted-foreground))]" /> : <ChevronDown size={12} className="text-[hsl(var(--muted-foreground))]" />}
        <span className="text-[hsl(var(--muted-foreground))] text-[11px]">{`{${keys.length}}`}</span>
      </div>
      {!collapsed && (
        <div>
          {keys.map((k) => (
            <div key={k} className="flex items-start gap-1">
              <div className="shrink-0 flex items-center gap-1" style={{ paddingLeft: indent + 12 }}>
                <span className="text-[hsl(var(--foreground))] text-[11px] font-medium mono">{k}</span>
                <span className="text-[hsl(var(--muted-foreground))] text-[11px]">:</span>
              </div>
              <div className="flex-1">
                <JsonTree
                  value={(value as Record<string, JsonValue>)[k]}
                  onChange={onChange ? (v) => onChange({ ...(value as Record<string, JsonValue>), [k]: v }) : undefined}
                  readonly={readonly}
                  depth={depth + 1}
                  path={`${path}/${k}`}
                  highlightPaths={highlightPaths}
                />
              </div>
              {!readonly && onChange && (
                <button
                  className="mt-0.5 p-0.5 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--destructive))]"
                  onClick={() => {
                    const { [k]: _, ...rest } = value as Record<string, JsonValue>
                    onChange(rest)
                  }}
                >
                  <Trash2 size={10} />
                </button>
              )}
            </div>
          ))}
          {!readonly && onChange && (
            <button
              className="flex items-center gap-1 py-0.5 text-[11px] text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--primary))]"
              style={{ paddingLeft: indent + 16 }}
              onClick={() => {
                const key = `key${keys.length}`
                onChange({ ...(value as Record<string, JsonValue>), [key]: null })
              }}
            >
              <Plus size={10} /> Add field
            </button>
          )}
        </div>
      )}
    </div>
  )
}
