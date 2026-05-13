type Variant = 'success' | 'neutral' | 'pending'

interface BadgeProps {
  variant: Variant
  children: React.ReactNode
}

const variantClasses: Record<Variant, string> = {
  success: 'bg-brand-green/10 text-brand-green',
  neutral: 'bg-silver-blue/10 text-silver-blue',
  pending: 'bg-brand/10 text-brand',
}

export function Badge({ variant, children }: BadgeProps) {
  return (
    <span
      className={[
        'inline-flex items-center px-2.5 py-0.5',
        'rounded-full text-xs font-medium font-ui',
        variantClasses[variant],
      ].join(' ')}
    >
      {children}
    </span>
  )
}
