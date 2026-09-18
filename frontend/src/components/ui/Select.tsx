import { forwardRef, SelectHTMLAttributes, useId } from 'react'

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string
  error?: string
  options: { value: string; label: string }[]
  placeholder?: string
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, options, placeholder, className = '', id, ...props }, ref) => {
    // Mesmo par rótulo/campo que `Input` e `PasswordInput` já faziam: sem ele o
    // leitor de tela não anuncia o rótulo e clicar nele não foca o campo.
    const generatedId = useId()
    const selectId = id ?? generatedId
    const errorId = `${selectId}-error`

    return (
      <div className="flex flex-col gap-1">
        <label htmlFor={selectId} className="text-sm font-medium font-ui text-ink/80">
          {label}
        </label>
        <div className="relative">
          <select
            ref={ref}
            id={selectId}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? errorId : undefined}
            {...props}
            className={[
              'w-full px-0 py-2.5 pr-9 rounded-none border-0 border-b font-ui text-sm text-ink bg-transparent',
              'focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand',
              'transition-colors appearance-none cursor-pointer',
              error ? 'border-red-400' : 'border-ink/20',
              className,
            ].join(' ')}
          >
            {placeholder && (
              <option value="" disabled>
                {placeholder}
              </option>
            )}
            {options.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <svg
            className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-silver-blue"
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            aria-hidden="true"
          >
            <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        {error && (
          <p id={errorId} className="text-xs text-red-500 font-ui">
            {error}
          </p>
        )}
      </div>
    )
  },
)

Select.displayName = 'Select'
