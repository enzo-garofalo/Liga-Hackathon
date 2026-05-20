import { ButtonHTMLAttributes } from 'react'

type Variant = 'primary' | 'outlined' | 'subtle' | 'ghost'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  loading?: boolean
}

const variantClasses: Record<Variant, string> = {
  primary:  'bg-brand text-white hover:bg-[#5f28d4] disabled:opacity-60',
  outlined: 'border border-ink/20 text-ink hover:border-brand hover:text-brand hover:bg-brand/5 disabled:opacity-60',
  subtle:   'bg-ink/[0.06] text-ink border border-ink/10 hover:bg-brand/10 disabled:opacity-60',
  ghost:    'text-ink/70 hover:text-brand hover:bg-brand/5 disabled:opacity-60',
}

export function Button({
  variant = 'primary',
  loading = false,
  children,
  className = '',
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      {...props}
      disabled={disabled || loading}
      className={[
        'inline-flex items-center justify-center gap-2',
        'px-5 py-2.5 rounded-2xl font-ui text-sm font-medium',
        'transition-all duration-200 cursor-pointer disabled:cursor-not-allowed',
        variantClasses[variant],
        className,
      ].join(' ')}
    >
      {loading ? 'Aguarde...' : children}
    </button>
  )
}
