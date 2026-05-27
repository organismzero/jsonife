import { forwardRef, ButtonHTMLAttributes } from 'react'

type Variant = 'default' | 'outline' | 'ghost' | 'destructive' | 'secondary' | 'cta'
type Size = 'sm' | 'md' | 'lg' | 'icon'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
}

const base =
  'inline-flex items-center justify-center gap-1.5 rounded font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))] disabled:pointer-events-none disabled:opacity-50 cursor-pointer'

const variants: Record<Variant, string> = {
  default:
    'bg-[hsl(var(--cta))] text-[hsl(var(--cta-foreground))] hover:bg-[hsl(var(--cta)/0.88)] glow-lime',
  cta:
    'border border-[hsl(var(--cta))] bg-transparent text-[hsl(var(--cta))] hover:bg-[hsl(var(--cta)/0.1)] glow-lime',
  outline:
    'border border-[hsl(var(--border))] bg-transparent text-[hsl(var(--foreground))] hover:bg-[hsl(var(--surface-raised))] hover:border-[hsl(var(--primary)/0.4)]',
  ghost: 'bg-transparent text-[hsl(var(--foreground))] hover:bg-[hsl(var(--surface-raised))]',
  destructive:
    'bg-[hsl(var(--destructive))] text-[hsl(var(--destructive-foreground))] hover:bg-[hsl(var(--destructive)/0.85)]',
  secondary:
    'bg-[hsl(var(--primary)/0.15)] text-[hsl(var(--primary))] border border-[hsl(var(--primary)/0.35)] hover:bg-[hsl(var(--primary)/0.22)]'
}

const sizes: Record<Size, string> = {
  sm: 'h-7 px-2.5 text-xs',
  md: 'h-8 px-3 text-sm',
  lg: 'h-10 px-4 text-sm',
  icon: 'h-8 w-8'
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'default', size = 'md', className = '', ...props }, ref) => (
    <button
      ref={ref}
      className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    />
  )
)
Button.displayName = 'Button'
