import { ButtonHTMLAttributes } from 'react'

type Variant = 'primary' | 'outlined' | 'subtle' | 'ghost'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  loading?: boolean
}

const variantClasses: Record<Variant, string> = {
  primary:  'bg-brand text-white hover:bg-[#5f28d4] disabled:opacity-60',
  outlined: 'border border-brand text-brand hover:bg-brand/5 disabled:opacity-60',
  subtle:   'bg-brand/10 text-brand hover:bg-brand/[0.15] disabled:opacity-60',
  ghost:    'text-brand hover:bg-brand/5 disabled:opacity-60',
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
        'px-5 py-2.5 rounded-xl font-ui text-sm font-medium',
        'transition-colors cursor-pointer disabled:cursor-not-allowed',
        variantClasses[variant],
        className,
      ].join(' ')}
    >
      {loading ? 'Aguarde...' : children}
    </button>
  )
}
