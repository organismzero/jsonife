import { FileJson, GitCompare, BarChart2 } from 'lucide-react'

export type View = 'editor' | 'compare' | 'charts'

interface SidebarProps {
  activeView: View
  onViewChange: (v: View) => void
}

interface NavItem {
  id: View
  icon: React.ReactNode
  label: string
  disabled?: boolean
}

const items: NavItem[] = [
  { id: 'editor', icon: <FileJson size={18} />, label: 'Editor' },
  { id: 'compare', icon: <GitCompare size={18} />, label: 'Compare' },
  { id: 'charts', icon: <BarChart2 size={18} />, label: 'Charts', disabled: true }
]

export function Sidebar({ activeView, onViewChange }: SidebarProps) {
  return (
    <aside className="flex flex-col items-center gap-1 w-12 bg-[hsl(var(--surface))] border-r border-[hsl(var(--border))] py-3">
      <div className="flex flex-col gap-1 flex-1">
        {items.map((item) => (
          <button
            key={item.id}
            title={item.label + (item.disabled ? ' (coming soon)' : '')}
            disabled={item.disabled}
            onClick={() => !item.disabled && onViewChange(item.id)}
            className={`
              relative flex h-10 w-10 items-center justify-center rounded transition-colors
              ${item.disabled ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer hover:bg-[hsl(var(--surface-raised))]'}
              ${activeView === item.id && !item.disabled
                ? 'bg-[hsl(var(--primary)/0.15)] text-[hsl(var(--primary))]'
                : 'text-[hsl(var(--muted-foreground))]'}
            `}
          >
            {item.icon}
            {activeView === item.id && !item.disabled && (
              <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-[hsl(var(--primary))] rounded-r" />
            )}
          </button>
        ))}
      </div>
    </aside>
  )
}
