import { forwardRef, InputHTMLAttributes, useState } from 'react'

interface PasswordInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label: string
  error?: string
}

export const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(
  ({ label, error, className = '', ...props }, ref) => {
    const [visible, setVisible] = useState(false)

    return (
      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium font-ui text-ink/80">{label}</label>
        <div className="relative">
          <input
            ref={ref}
            type={visible ? 'text' : 'password'}
            {...props}
            className={[
              'w-full px-0 py-2.5 pr-10 rounded-none border-0 border-b font-ui text-sm text-ink',
              'placeholder:text-ink/40 bg-transparent',
              'focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand',
              'transition-colors',
              error ? 'border-red-400' : 'border-ink/20',
              className,
            ].join(' ')}
          />
          <button
            type="button"
            onClick={() => setVisible((v) => !v)}
            className="absolute right-0 top-1/2 -translate-y-1/2 text-ink/42 hover:text-ink transition-colors"
            aria-label={visible ? 'Ocultar senha' : 'Revelar senha'}
          >
            {visible ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <line x1="1" y1="1" x2="23" y2="23" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2" />
              </svg>
            )}
          </button>
        </div>
        {error && <p className="text-xs text-red-500 font-ui">{error}</p>}
      </div>
    )
  },
)

PasswordInput.displayName = 'PasswordInput'
