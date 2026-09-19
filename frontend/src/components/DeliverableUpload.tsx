import { FileText, Paperclip, Send, X } from 'lucide-react'
import { useRef, useState } from 'react'
import { useDeliverables } from '../hooks/useDeliverables'
import type { Deliverable, TimelineStage } from '../types/application'
import { getApiError } from '../utils/errors'
import { DeliverableList } from './DeliverableList'
import { Button } from './ui/Button'

function formatSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

interface DeliverableUploadProps {
  applicationId: string
  stage: TimelineStage
}

export function DeliverableUpload({ applicationId, stage }: DeliverableUploadProps) {
  const { upload, remove } = useDeliverables(applicationId)
  const inputRef = useRef<HTMLInputElement>(null)
  const [selected, setSelected] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)

  const sent = stage.deliverables.length
  const limitReached = stage.max_files !== null && sent >= stage.max_files
  const accept = stage.allowed_file_types.map((ext) => `.${ext}`).join(',')

  const clearSelection = () => {
    setSelected(null)
    if (inputRef.current) inputRef.current.value = ''
  }

  const handleSend = () => {
    if (!selected) return
    setError(null)
    upload.mutate(selected, {
      onSuccess: clearSelection,
      onError: (e) => setError(getApiError(e)),
    })
  }

  const handleRemove = (deliverable: Deliverable) => {
    setError(null)
    remove.mutate(deliverable.id, { onError: (e) => setError(getApiError(e)) })
  }

  return (
    <div className="mt-4 rounded-[21px] border border-ink/10 bg-ink/[0.02] p-5">
      <p className="kicker">Sua entrega</p>
      <p className="mt-1 text-xs text-ink/70">
        {stage.allowed_file_types.length > 0
          ? `Formatos aceitos: ${stage.allowed_file_types.join(', ')}`
          : 'Qualquer formato'}
        {stage.max_files !== null &&
          ` · até ${stage.max_files} arquivo${stage.max_files > 1 ? 's' : ''}`}
      </p>

      {/* Arquivos já enviados */}
      <DeliverableList
        deliverables={stage.deliverables}
        onRemove={handleRemove}
        removing={remove.isPending}
      />

      {/* Seleção e envio */}
      {limitReached ? (
        <p className="mt-4 text-xs text-ink/60">
          Limite de arquivos atingido. Remova o arquivo enviado para trocar por outro.
        </p>
      ) : (
        <div className="mt-4">
          <input
            ref={inputRef}
            type="file"
            accept={accept || undefined}
            className="hidden"
            onChange={(event) => {
              setError(null)
              setSelected(event.target.files?.[0] ?? null)
            }}
          />

          {selected ? (
            <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-brand/25 bg-brand/[0.06] px-4 py-3">
              <span className="flex min-w-0 flex-1 items-center gap-2">
                <FileText className="h-4 w-4 flex-shrink-0 text-brand" />
                <span className="truncate font-ui text-sm font-medium text-ink">
                  {selected.name}
                </span>
                <span className="flex-shrink-0 text-xs text-ink/55">
                  {formatSize(selected.size)}
                </span>
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={clearSelection}
                  disabled={upload.isPending}
                  className="rounded-lg p-2 text-ink/60 transition-colors hover:bg-ink/[0.06] hover:text-ink disabled:opacity-50"
                  title="Trocar arquivo"
                >
                  <X className="h-4 w-4" />
                </button>
                <Button onClick={handleSend} loading={upload.isPending}>
                  <Send className="h-4 w-4" />
                  Enviar
                </Button>
              </div>
            </div>
          ) : (
            <Button variant="outlined" onClick={() => inputRef.current?.click()}>
              <Paperclip className="h-4 w-4" />
              Escolher arquivo
            </Button>
          )}
        </div>
      )}

      {error && (
        <p className="mt-3 rounded-xl border border-red-400/30 bg-red-500/10 px-3 py-2 text-xs font-medium text-red-600">
          {error}
        </p>
      )}
    </div>
  )
}
