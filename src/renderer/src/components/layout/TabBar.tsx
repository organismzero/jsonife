import { X } from 'lucide-react'
import type { Document } from '../../stores/documentStore'

interface TabBarProps {
  documents: Document[]
  activeId: string | null
  onSelect: (id: string) => void
  onClose: (id: string) => void
}

export function TabBar({ documents, activeId, onSelect, onClose }: TabBarProps) {
  if (documents.length === 0) return null

  return (
    <div className="flex h-9 items-end overflow-x-auto border-b border-[hsl(var(--border))] bg-[hsl(var(--surface))] px-2 gap-0.5">
      {documents.map((doc) => {
        const isActive = doc.id === activeId
        return (
          <button
            key={doc.id}
            onClick={() => onSelect(doc.id)}
            className={`
              group flex h-8 items-center gap-1.5 rounded-t px-3 text-xs transition-colors whitespace-nowrap
              ${isActive
                ? 'bg-[hsl(var(--background))] text-[hsl(var(--foreground))] border border-b-0 border-[hsl(var(--border))]'
                : 'text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] hover:bg-[hsl(var(--surface-raised))]'}
            `}
          >
            {doc.isDirty && <span className="text-[hsl(var(--warning))]">•</span>}
            <span className="max-w-[120px] overflow-hidden text-ellipsis">{doc.name}</span>
            <span
              role="button"
              onClick={(e) => { e.stopPropagation(); onClose(doc.id) }}
              className="ml-0.5 hidden rounded p-0.5 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] group-hover:flex"
            >
              <X size={10} />
            </span>
          </button>
        )
      })}
    </div>
  )
}
