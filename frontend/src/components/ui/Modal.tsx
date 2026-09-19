import { X } from 'lucide-react'
import { useEffect } from 'react'

type Size = 'md' | 'lg' | 'xl'

const sizeClass: Record<Size, string> = {
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
}

interface ModalProps {
  title: string
  subtitle?: string
  size?: Size
  onClose: () => void
  children: React.ReactNode
  /** Rodapé fixo, normalmente com os botões de ação. */
  footer?: React.ReactNode
}

/**
 * Invólucro de modal: fundo, painel, título, fechar e Esc.
 *
 * Mesmo visual que `CreateTeamModal` e companhia já usavam — eles não foram
 * migrados para não mexer em tela do hackathon em produção.
 */
export function Modal({
  title,
  subtitle,
  size = 'md',
  onClose,
  children,
  footer,
}: ModalProps) {
  useEffect(() => {
    function handleEsc(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleEsc)
    return () => document.removeEventListener('keydown', handleEsc)
  }, [onClose])

  return (
    <>
      <div
        className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="pointer-events-none fixed inset-0 z-[110] flex items-center justify-center p-4">
        <div
          role="dialog"
          aria-modal="true"
          aria-label={title}
          className={`glass-panel pointer-events-auto flex max-h-[90vh] w-full ${sizeClass[size]} flex-col rounded-2xl`}
        >
          <div className="flex items-start justify-between gap-4 border-b border-ink/10 p-6">
            <div className="min-w-0">
              <h2 className="font-display text-xl font-semibold text-ink">{title}</h2>
              {subtitle && <p className="mt-1 text-sm text-ink/70">{subtitle}</p>}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="flex-shrink-0 rounded-lg p-1.5 text-ink/45 transition-colors hover:bg-ink/10 hover:text-ink"
              aria-label="Fechar"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto p-6">{children}</div>

          {footer && (
            <div className="flex flex-wrap items-center justify-end gap-3 border-t border-ink/10 p-6">
              {footer}
            </div>
          )}
        </div>
      </div>
    </>
  )
}
