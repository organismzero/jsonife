import { HTMLAttributes } from 'react'

type BadgeVariant = 'add' | 'remove' | 'replace' | 'default'

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant
}

const variants: Record<BadgeVariant, string> = {
  add: 'bg-[hsl(var(--diff-add-bg))] text-[hsl(var(--diff-add))] border-[hsl(var(--diff-add)/0.4)]',
  remove:
    'bg-[hsl(var(--diff-remove-bg))] text-[hsl(var(--diff-remove))] border-[hsl(var(--diff-remove)/0.4)]',
  replace:
    'bg-[hsl(var(--diff-change-bg))] text-[hsl(var(--diff-change))] border-[hsl(var(--diff-change)/0.4)]',
  default:
    'bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))] border-[hsl(var(--border))]'
}

export function Badge({ variant = 'default', className = '', ...props }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded border px-1.5 py-0.5 text-[11px] font-medium uppercase tracking-wide mono ${variants[variant]} ${className}`}
      {...props}
    />
  )
}
