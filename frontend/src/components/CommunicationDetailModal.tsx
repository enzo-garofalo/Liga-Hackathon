import { CheckCircle2 } from 'lucide-react'
import { useCommunication } from '../hooks/useCommunications'
import { Modal } from './ui/Modal'

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function CommunicationDetailModal({
  communicationId,
  onClose,
}: {
  communicationId: string
  onClose: () => void
}) {
  const query = useCommunication(communicationId)
  const communication = query.data

  return (
    <Modal title="Comunicação" onClose={onClose}>
      {query.isLoading || !communication ? (
        <div className="h-48 animate-pulse rounded-xl bg-ink/[0.06]" />
      ) : (
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="kicker">Tipo</p>
              <p className="font-ui text-sm text-ink/82">
                {communication.type === 'auto' ? 'Automática' : 'Manual'}
              </p>
            </div>
            <div>
              <p className="kicker">Data</p>
              <p className="font-ui text-sm text-ink/82">
                {formatDateTime(communication.sent_at)}
              </p>
            </div>
            <div>
              <p className="kicker">Destinatários</p>
              <p className="font-ui text-sm text-ink/82">
                {communication.recipient_count} candidato
                {communication.recipient_count === 1 ? '' : 's'}
              </p>
            </div>
            <div>
              <p className="kicker">Status</p>
              <p className="inline-flex items-center gap-1.5 font-ui text-sm text-brand-green">
                <CheckCircle2 className="h-4 w-4" />
                {communication.status === 'sent' ? 'Enviada' : 'Falhou'}
              </p>
            </div>
          </div>

          <div>
            <p className="kicker">Assunto</p>
            <p className="font-display text-base font-semibold text-ink">
              {communication.subject}
            </p>
          </div>

          <div>
            <p className="kicker mb-1">Mensagem</p>
            <p className="whitespace-pre-line rounded-xl border border-ink/10 bg-ink/[0.02] p-4 text-sm leading-relaxed text-ink/80">
              {communication.message}
            </p>
          </div>

          {communication.recipients.length > 0 && (
            <div>
              <p className="kicker mb-1">Quem recebeu</p>
              <p className="text-sm text-ink/70">
                {communication.recipients.map((r) => r.full_name).join(', ')}
              </p>
            </div>
          )}
        </div>
      )}
    </Modal>
  )
}
