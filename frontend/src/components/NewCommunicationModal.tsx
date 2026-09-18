import { useState } from 'react'
import type { CommunicationAudience } from '../types/communication'
import type { Stage } from '../types/stage'
import { getApiError } from '../utils/errors'
import { Button } from './ui/Button'
import { Input } from './ui/Input'
import { Modal } from './ui/Modal'

const AUDIENCES: { value: CommunicationAudience; label: string }[] = [
  { value: 'all', label: 'Todos os candidatos' },
  { value: 'stage', label: 'Todos de uma etapa' },
  { value: 'approved', label: 'Apenas aprovados' },
  { value: 'rejected', label: 'Apenas reprovados' },
]

interface Props {
  stages: Stage[]
  /** Quando vem preenchido, o comunicado vai só para estes participantes. */
  recipients?: { id: string; name: string }[]
  onClose: () => void
  onSend: (payload: {
    audience: CommunicationAudience
    audience_stage?: string | null
    recipients?: string[]
    subject: string
    message: string
  }) => void
  sending: boolean
  error: unknown
}

export function NewCommunicationModal({
  stages,
  recipients,
  onClose,
  onSend,
  sending,
  error,
}: Props) {
  const targeted = Boolean(recipients?.length)
  const [audience, setAudience] = useState<CommunicationAudience>(
    targeted ? 'specific' : 'all',
  )
  const [stageId, setStageId] = useState(stages[0]?.id ?? '')
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')

  const submit = () => {
    onSend({
      audience,
      audience_stage: audience === 'stage' ? stageId : null,
      recipients: targeted ? recipients?.map((item) => item.id) : undefined,
      subject,
      message,
    })
  }

  return (
    <Modal
      title="Nova comunicação"
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            onClick={submit}
            loading={sending}
            disabled={!subject.trim() || !message.trim()}
          >
            Enviar
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        {targeted ? (
          <div className="rounded-xl border border-brand/25 bg-brand/[0.06] px-4 py-3">
            <p className="kicker">Destinatários</p>
            <p className="mt-1 font-ui text-sm text-ink/82">
              {recipients?.length} candidato{recipients?.length === 1 ? '' : 's'} selecionado
              {recipients?.length === 1 ? '' : 's'}: {recipients?.map((r) => r.name).join(', ')}
            </p>
          </div>
        ) : (
        <fieldset className="space-y-2">
          <legend className="font-ui text-sm font-medium text-ink/80">Destinatários</legend>
          {AUDIENCES.map((option) => (
            <label
              key={option.value}
              className="flex items-center gap-2 font-ui text-sm text-ink/80"
            >
              <input
                type="radio"
                checked={audience === option.value}
                onChange={() => setAudience(option.value)}
                className="accent-brand"
              />
              {option.label}
            </label>
          ))}
        </fieldset>
        )}

        {!targeted && audience === 'stage' && (
          <div className="flex flex-col gap-1">
            <label className="font-ui text-sm font-medium text-ink/80">Etapa</label>
            <select
              value={stageId}
              onChange={(event) => setStageId(event.target.value)}
              className="w-full rounded-xl border border-ink/20 bg-transparent px-3 py-2.5 font-ui text-sm text-ink focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
            >
              {stages.map((stage) => (
                <option key={stage.id} value={stage.id}>
                  {stage.order}. {stage.name}
                </option>
              ))}
            </select>
          </div>
        )}

        <Input
          label="Assunto"
          required
          value={subject}
          onChange={(event) => setSubject(event.target.value)}
        />

        <div className="flex flex-col gap-1">
          <label htmlFor="communication-message" className="font-ui text-sm font-medium text-ink/80">
            Mensagem
          </label>
          <textarea
            id="communication-message"
            rows={6}
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            placeholder="Olá {nome}, ..."
            className="w-full rounded-xl border border-ink/20 bg-transparent px-3 py-2.5 font-ui text-sm text-ink placeholder:text-ink/40 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
          />
          <p className="text-xs text-ink/55">
            Use <code className="font-code">{'{nome}'}</code> para inserir o nome do
            candidato. Cada pessoa recebe um e-mail separado.
          </p>
        </div>

        {Boolean(error) && (
          <p className="rounded-xl border border-red-400/30 bg-red-500/10 px-3 py-2 text-sm font-medium text-red-600">
            {getApiError(error)}
          </p>
        )}
      </div>
    </Modal>
  )
}
