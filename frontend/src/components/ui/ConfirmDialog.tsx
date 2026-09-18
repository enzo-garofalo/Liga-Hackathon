import { AlertTriangle } from 'lucide-react'
import { Button } from './Button'
import { Modal } from './Modal'

type Tone = 'default' | 'danger' | 'success'

const toneClass: Record<Tone, string> = {
  default: 'bg-brand/12 text-brand',
  danger: 'bg-red-500/10 text-red-600',
  success: 'bg-brand-green/12 text-brand-green',
}

interface ConfirmDialogProps {
  title: string
  question: string
  detail?: string
  confirmLabel: string
  tone?: Tone
  loading?: boolean
  onConfirm: () => void
  onCancel: () => void
}

/** Confirmação para ação que mexe na vida do candidato e dispara e-mail. */
export function ConfirmDialog({
  title,
  question,
  detail,
  confirmLabel,
  tone = 'default',
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <Modal
      title={title}
      onClose={onCancel}
      footer={
        <>
          <Button variant="ghost" onClick={onCancel}>
            Cancelar
          </Button>
          <Button
            onClick={onConfirm}
            loading={loading}
            className={
              tone === 'danger' ? 'bg-red-600 text-white hover:bg-red-700' : undefined
            }
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div className="flex items-start gap-3">
        <div
          className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full ${toneClass[tone]}`}
        >
          <AlertTriangle className="h-5 w-5" />
        </div>
        <div>
          <p className="font-ui text-base font-medium text-ink">{question}</p>
          {detail && <p className="mt-1.5 text-sm text-ink/70">{detail}</p>}
        </div>
      </div>
    </Modal>
  )
}
