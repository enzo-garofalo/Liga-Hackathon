type Variant = 'success' | 'neutral' | 'pending'

interface BadgeProps {
  variant: Variant
  children: React.ReactNode
}

const variantClasses: Record<Variant, string> = {
  success: 'bg-brand-green/12 text-brand-green border border-brand-green/20',
  neutral: 'bg-ink/10 text-ink/75 border border-ink/12',
  pending: 'bg-brand/15 text-brand border border-brand/30',
}

export function Badge({ variant, children }: BadgeProps) {
  return (
    <span
      className={[
        'inline-flex items-center px-2.5 py-0.5',
        'rounded-full text-xs font-semibold font-ui',
        variantClasses[variant],
      ].join(' ')}
    >
      {children}
    </span>
  )
}
