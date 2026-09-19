import { Check } from 'lucide-react'
import { useState } from 'react'
import { usePublishProcess } from '../hooks/useAdminProcesses'
import type { AdminProcess } from '../types/adminProcess'
import { getApiError } from '../utils/errors'
import { Button } from './ui/Button'
import { Input } from './ui/Input'
import { Modal } from './ui/Modal'

/** ISO -> valor aceito pelo input datetime-local, no fuso do navegador. */
function toLocalInput(iso: string) {
  const date = new Date(iso)
  const offset = date.getTimezoneOffset() * 60_000
  return new Date(date.getTime() - offset).toISOString().slice(0, 16)
}

interface Props {
  process: AdminProcess
  onClose: () => void
}

export function OpenApplicationsModal({ process, onClose }: Props) {
  const publish = usePublishProcess()
  const [start, setStart] = useState(toLocalInput(process.registration_start))
  const [end, setEnd] = useState(toLocalInput(process.registration_end))
  const [message, setMessage] = useState(process.highlight_message)

  const noStages = process.stage_count === 0

  const submit = () => {
    publish.mutate(
      {
        id: process.id,
        payload: {
          registration_start: new Date(start).toISOString(),
          registration_end: new Date(end).toISOString(),
          highlight_message: message,
        },
      },
      { onSuccess: onClose },
    )
  }

  return (
    <Modal
      title="Abrir inscrições"
      subtitle={process.name}
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={submit} loading={publish.isPending} disabled={noStages}>
            Abrir inscrições
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        <div className="rounded-xl border border-ink/10 bg-ink/[0.02] p-4">
          <p className="font-ui text-sm font-medium text-ink">
            Você está prestes a publicar este processo. Após publicar:
          </p>
          <ul className="mt-3 space-y-1.5">
            {[
              'O processo fica visível para os candidatos',
              'As inscrições ficam abertas no período abaixo',
              'Candidatos podem se inscrever imediatamente',
            ].map((line) => (
              <li key={line} className="flex items-start gap-2 text-sm text-ink/75">
                <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-brand-green" />
                {line}
              </li>
            ))}
          </ul>
        </div>

        {noStages && (
          <p className="rounded-xl border border-amber-400/40 bg-amber-500/10 px-3 py-2 text-sm font-medium text-amber-700">
            Configure ao menos uma etapa antes de abrir as inscrições.
          </p>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Início das inscrições"
            type="datetime-local"
            value={start}
            onChange={(event) => setStart(event.target.value)}
          />
          <Input
            label="Fim das inscrições"
            type="datetime-local"
            value={end}
            onChange={(event) => setEnd(event.target.value)}
          />
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="publish-message" className="font-ui text-sm font-medium text-ink/80">
            Mensagem exibida aos candidatos (opcional)
          </label>
          <textarea
            id="publish-message"
            rows={2}
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            placeholder="As inscrições para o Processo Seletivo da Liga de TI estão abertas!"
            className="w-full rounded-xl border border-ink/20 bg-transparent px-3 py-2.5 font-ui text-sm text-ink placeholder:text-ink/40 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
          />
        </div>

        {publish.isError && (
          <p className="rounded-xl border border-red-400/30 bg-red-500/10 px-3 py-2 text-sm font-medium text-red-600">
            {getApiError(publish.error)}
          </p>
        )}
      </div>
    </Modal>
  )
}
