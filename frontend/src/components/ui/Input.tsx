import { forwardRef, InputHTMLAttributes, useId } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string
  error?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className = '', required, id, ...props }, ref) => {
    // Associa rótulo e campo: sem isto o leitor de tela não anuncia o rótulo e
    // clicar nele não foca o campo.
    const generatedId = useId()
    const inputId = id ?? generatedId
    const errorId = `${inputId}-error`

    return (
      <div className="flex flex-col gap-1">
        <label htmlFor={inputId} className="text-sm font-medium font-ui text-ink/80">
          {label}
          {required && <span className="ml-1 text-red-500">*</span>}
        </label>
        <input
          ref={ref}
          id={inputId}
          required={required}
          aria-required={required}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
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
        {error && (
          <p id={errorId} className="text-xs text-red-500 font-ui">
            {error}
          </p>
        )}
      </div>
    )
  },
)

Input.displayName = 'Input'
