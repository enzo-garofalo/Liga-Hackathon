import { forwardRef, InputHTMLAttributes } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string
  error?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className = '', required, ...props }, ref) => (
    <div className="flex flex-col gap-1">
      <label className="text-sm font-medium font-ui text-ink/80">
        {label}
        {required && <span className="ml-1 text-red-500">*</span>}
      </label>
      <input
        ref={ref}
        required={required}
        aria-required={required}
        {...props}
        className={[
          'w-full px-0 py-2.5 rounded-none border-0 border-b font-ui text-sm text-ink',
          'placeholder:text-ink/40 bg-transparent',
          'focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand',
          'transition-colors',
          error ? 'border-red-400' : 'border-ink/20',
          className,
        ].join(' ')}
      />
      {error && <p className="text-xs text-red-500 font-ui">{error}</p>}
    </div>
  ),
)

Input.displayName = 'Input'
