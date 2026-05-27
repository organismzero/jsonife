import { FileJson, GitCompare, BarChart2, Settings } from 'lucide-react'
import { useUiStore } from '../../stores/uiStore'

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
  { id: 'editor', icon: <FileJson size={20} strokeWidth={1.5} />, label: 'Editor' },
  { id: 'compare', icon: <GitCompare size={20} strokeWidth={1.5} />, label: 'Compare' },
  { id: 'charts', icon: <BarChart2 size={20} strokeWidth={1.5} />, label: 'Charts', disabled: true }
]

export function Sidebar({ activeView, onViewChange }: SidebarProps) {
  const setAboutOpen = useUiStore((s) => s.setAboutOpen)

  return (
    <aside className="flex w-14 shrink-0 flex-col items-center border-r border-[hsl(var(--border))] bg-[hsl(220_30%_4%)] py-3">
      <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg glow-cyan bg-[hsl(var(--primary)/0.12)] text-[hsl(var(--primary))]">
        <FileJson size={22} strokeWidth={1.5} />
      </div>

      <div className="flex flex-1 flex-col gap-1">
        {items.map((item) => (
          <button
            key={item.id}
            title={item.label + (item.disabled ? ' (coming soon)' : '')}
            disabled={item.disabled}
            onClick={() => !item.disabled && onViewChange(item.id)}
            className={`
              relative flex h-11 w-11 items-center justify-center rounded-md transition-all
              ${item.disabled ? 'cursor-not-allowed opacity-30' : 'cursor-pointer hover:bg-[hsl(var(--surface-raised))]'}
              ${activeView === item.id && !item.disabled
                ? 'glow-cyan bg-[hsl(var(--primary)/0.12)] text-[hsl(var(--primary))]'
                : 'text-[hsl(var(--muted-foreground))]'}
            `}
          >
            {item.icon}
            {activeView === item.id && !item.disabled && (
              <span className="absolute left-0 top-1/2 h-6 w-0.5 -translate-y-1/2 rounded-r bg-[hsl(var(--primary))]" />
            )}
          </button>
        ))}
      </div>

      <div className="mt-auto flex flex-col items-center gap-2">
        <button
          title="Settings"
          onClick={() => setAboutOpen(true)}
          className="flex h-10 w-10 items-center justify-center rounded-md text-[hsl(var(--muted-foreground))] transition-colors hover:bg-[hsl(var(--surface-raised))] hover:text-[hsl(var(--foreground))]"
        >
          <Settings size={18} strokeWidth={1.5} />
        </button>
        <span className="text-[9px] font-medium uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
          v1
        </span>
      </div>
    </aside>
  )
}
