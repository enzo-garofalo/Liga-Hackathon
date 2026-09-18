import { useId } from 'react'

interface ScoreInputProps {
  label: string
  value: string
  min: number
  max: number
  onChange: (value: string) => void
}

/** Converte "4,5" em 4.5. Devolve null quando não é número. */
export function parseScore(value: string): number | null {
  const normalized = value.trim().replace(',', '.')
  if (normalized === '') return null
  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? parsed : null
}

/**
 * Aceita nota quebrada e vírgula como separador — "4,5" e "4.5" são a mesma
 * nota, e é vírgula que a pessoa digita.
 *
 * O 0 é sempre válido: significa ausência de entrega, não faz parte da escala.
 */
export function isValidScore(value: string, min: number, max: number): boolean {
  const parsed = parseScore(value)
  if (parsed === null) return value.trim() === ''
  if (parsed === 0) return true
  return parsed >= min && parsed <= max
}

export function ScoreInput({ label, value, min, max, onChange }: ScoreInputProps) {
  const id = useId()
  const invalid = value.trim() !== '' && !isValidScore(value, min, max)

  return (
    <div className="flex flex-shrink-0 flex-col items-end gap-1">
      <input
        id={id}
        type="text"
        inputMode="decimal"
        value={value}
        aria-label={label}
        aria-invalid={invalid}
        placeholder={`${min}–${max}`}
        onChange={(event) => {
          // Só dígitos e um separador decimal: evita letras e sinal negativo.
          const next = event.target.value.replace(/[^0-9.,]/g, '')
          onChange(next)
        }}
        className={`w-20 rounded-xl border bg-transparent px-3 py-1.5 text-center font-ui text-sm text-ink focus:outline-none focus:ring-2 ${
          invalid
            ? 'border-red-400 focus:border-red-400 focus:ring-red-400/30'
            : 'border-ink/20 focus:border-brand focus:ring-brand/30'
        }`}
      />
      {invalid && (
        <span className="text-[11px] font-medium text-red-600">
          {min} a {max}
        </span>
      )}
    </div>
  )
}
