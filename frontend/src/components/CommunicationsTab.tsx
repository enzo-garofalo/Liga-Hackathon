import { CheckCircle2, Eye, Send, XCircle } from 'lucide-react'
import { useState } from 'react'
import { useCommunications } from '../hooks/useCommunications'
import type { Stage } from '../types/stage'
import { CommunicationDetailModal } from './CommunicationDetailModal'
import { NewCommunicationModal } from './NewCommunicationModal'
import { QueryError } from './QueryError'
import { Button } from './ui/Button'

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
}

export function CommunicationsTab({
  processId,
  stages,
}: {
  processId: string
  stages: Stage[]
}) {
  const [typeFilter, setTypeFilter] = useState('')
  const { query, send } = useCommunications(processId, { type: typeFilter })
  const [composing, setComposing] = useState(false)
  const [viewing, setViewing] = useState<string | null>(null)

  const communications = query.data ?? []

  if (query.isError) {
    return (
      <QueryError
        title="Não foi possível carregar as comunicações"
        error={query.error}
        onRetry={() => query.refetch()}
        retrying={query.isFetching}
      />
    )
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <select
          value={typeFilter}
          onChange={(event) => setTypeFilter(event.target.value)}
          className="rounded-xl border border-ink/20 bg-transparent px-3 py-2 font-ui text-sm text-ink focus:border-brand focus:outline-none"
        >
          <option value="">Todos os tipos</option>
          <option value="auto">Automáticas</option>
          <option value="manual">Manuais</option>
        </select>

        <Button onClick={() => setComposing(true)}>
          <Send className="h-4 w-4" />
          Enviar comunicado
        </Button>
      </div>

      {query.isLoading ? (
        <div className="dark-card h-48 animate-pulse rounded-[21px]" />
      ) : communications.length === 0 ? (
        <div className="dark-card rounded-[21px] p-8 text-center">
          <p className="font-display text-base font-semibold text-ink">
            Nenhum comunicado enviado
          </p>
          <p className="mt-1 text-sm text-ink/70">
            As mensagens automáticas de cada mudança de etapa também aparecem aqui.
          </p>
        </div>
      ) : (
        <div className="dark-card overflow-x-auto rounded-[21px]">
          <table className="w-full min-w-[40rem] text-left text-sm">
            <thead>
              <tr className="border-b border-ink/10 text-xs uppercase tracking-wide text-ink/55">
                <th className="px-4 py-3 font-medium">Data</th>
                <th className="px-3 py-3 font-medium">Tipo</th>
                <th className="px-3 py-3 font-medium">Assunto</th>
                <th className="px-3 py-3 font-medium">Destinatários</th>
                <th className="px-3 py-3 font-medium">Status</th>
                <th className="px-3 py-3 font-medium">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink/[0.08]">
              {communications.map((communication) => (
                <tr key={communication.id} className="transition-colors hover:bg-brand/[0.03]">
                  <td className="px-4 py-3 text-ink/70">
                    {formatDate(communication.sent_at)}
                  </td>
                  <td className="px-3 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        communication.type === 'auto'
                          ? 'bg-ink/[0.06] text-ink/70'
                          : 'bg-brand/10 text-brand'
                      }`}
                    >
                      {communication.type === 'auto' ? 'Auto' : 'Manual'}
                    </span>
                  </td>
                  <td className="px-3 py-3 font-medium text-ink">{communication.subject}</td>
                  <td className="px-3 py-3 text-ink/70">{communication.recipient_count}</td>
                  <td className="px-3 py-3">
                    {communication.status === 'sent' ? (
                      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-brand-green">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Enviada
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-red-600">
                        <XCircle className="h-3.5 w-3.5" />
                        Falhou
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-3">
                    <button
                      type="button"
                      onClick={() => setViewing(communication.id)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-ink/15 px-2.5 py-1 text-xs font-medium text-ink/75 transition-colors hover:border-brand hover:text-brand"
                    >
                      <Eye className="h-3.5 w-3.5" />
                      Ver
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {composing && (
        <NewCommunicationModal
          stages={stages}
          sending={send.isPending}
          error={send.error}
          onClose={() => setComposing(false)}
          onSend={(payload) =>
            send.mutate(payload, { onSuccess: () => setComposing(false) })
          }
        />
      )}

      {viewing && (
        <CommunicationDetailModal
          communicationId={viewing}
          onClose={() => setViewing(null)}
        />
      )}
    </div>
  )
}
