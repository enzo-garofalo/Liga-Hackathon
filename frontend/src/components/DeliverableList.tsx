import { Download, FileText, Loader2, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { downloadDeliverable } from '../api/applications'
import type { Deliverable } from '../types/application'
import { saveBlob } from '../utils/download'
import { getApiError } from '../utils/errors'

interface DeliverableListProps {
  deliverables: Deliverable[]
  /**
   * Sem esta função a lista é só leitura: dá para baixar, não para apagar.
   *
   * É o caso de etapa já passada — o candidato continua podendo reler o que
   * entregou, mas não mexer numa entrega que já foi corrigida.
   */
  onRemove?: (deliverable: Deliverable) => void
  removing?: boolean
}

/** Arquivos que o candidato enviou numa etapa, com download. */
export function DeliverableList({
  deliverables,
  onRemove,
  removing = false,
}: DeliverableListProps) {
  const [downloadingId, setDownloadingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  if (deliverables.length === 0) return null

  const handleDownload = async (deliverable: Deliverable) => {
    setError(null)
    setDownloadingId(deliverable.id)
    try {
      const blob = await downloadDeliverable(deliverable.id)
      saveBlob(blob, deliverable.filename)
    } catch (e) {
      setError(getApiError(e))
    } finally {
      setDownloadingId(null)
    }
  }

  return (
    <>
      <ul className="mt-4 divide-y divide-ink/10 rounded-2xl border border-ink/10 bg-white/60 px-4">
        {deliverables.map((deliverable) => (
          <li key={deliverable.id} className="flex items-center justify-between gap-3 py-3">
            <span className="flex min-w-0 items-center gap-2">
              <FileText className="h-4 w-4 flex-shrink-0 text-brand" />
              <span className="truncate font-ui text-sm font-medium text-ink/80">
                {deliverable.filename}
              </span>
              <span className="flex-shrink-0 rounded-full border border-brand-green/25 bg-brand-green/10 px-2 py-0.5 text-xs font-medium text-brand-green">
                Enviado
              </span>
            </span>
            <div className="flex flex-shrink-0 items-center gap-1">
              <button
                type="button"
                onClick={() => handleDownload(deliverable)}
                disabled={downloadingId === deliverable.id}
                className="rounded-lg p-2 text-ink/60 transition-colors hover:bg-brand/10 hover:text-brand disabled:opacity-50"
                title="Baixar"
                aria-label={`Baixar ${deliverable.filename}`}
              >
                {downloadingId === deliverable.id ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
              </button>
              {onRemove && (
                <button
                  type="button"
                  onClick={() => onRemove(deliverable)}
                  disabled={removing}
                  className="rounded-lg p-2 text-ink/60 transition-colors hover:bg-red-500/10 hover:text-red-600 disabled:opacity-50"
                  title="Remover"
                  aria-label={`Remover ${deliverable.filename}`}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>

      {error && (
        <p className="mt-3 rounded-xl border border-red-400/30 bg-red-500/10 px-3 py-2 text-xs font-medium text-red-600">
          {error}
        </p>
      )}
    </>
  )
}
