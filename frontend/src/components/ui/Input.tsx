import { forwardRef, InputHTMLAttributes } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string
  error?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className = '', ...props }, ref) => (
    <div className="flex flex-col gap-1">
      <label className="text-sm font-medium font-ui text-near-black">{label}</label>
      <input
        ref={ref}
        {...props}
        className={[
          'w-full px-3.5 py-2.5 rounded-xl border font-ui text-sm text-near-black',
          'placeholder:text-silver-blue bg-white',
          'focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand',
          'transition-colors',
          error ? 'border-red-400' : 'border-[#dedee5]',
          className,
        ].join(' ')}
      />
      {error && <p className="text-xs text-red-500 font-ui">{error}</p>}
    </div>
  ),
)

Input.displayName = 'Input'
