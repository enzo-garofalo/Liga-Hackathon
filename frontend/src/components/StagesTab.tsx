import { FileUp, Pencil, Plus, Trash2, Users } from 'lucide-react'
import { useState } from 'react'
import { useApplications } from '../hooks/useApplications'
import { useStages } from '../hooks/useStages'
import type { ProcessStatus } from '../types/process'
import type { Stage } from '../types/stage'
import { getApiError } from '../utils/errors'
import { QueryError } from './QueryError'
import { StageConfigModal } from './StageConfigModal'
import { Button } from './ui/Button'
import { Modal } from './ui/Modal'

function formatDate(iso: string | null) {
  return iso
    ? new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
    : '—'
}

/**
 * Contagem de quem está na etapa, com a lista atrás de um botão.
 *
 * Os nomes ficavam soltos dentro do card: com trinta inscritos a etapa esticava
 * e desalinhava a grade toda. No modal a lista cresce sem mexer no card.
 */
function CandidateCount({
  total,
  temNomes,
  onOpen,
}: {
  total: number
  temNomes: boolean
  onOpen: () => void
}) {
  return (
    <div className="mb-4 flex items-center justify-between gap-2 border-t border-ink/10 pt-3">
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-ink/75">
        <Users className="h-3.5 w-3.5 text-brand" />
        {total} candidato{total === 1 ? '' : 's'}
      </span>

      {temNomes && (
        <button
          type="button"
          onClick={onOpen}
          className="flex-shrink-0 rounded-full border border-brand/25 bg-brand/[0.06] px-2.5 py-1 font-ui text-xs font-medium text-brand transition-colors hover:bg-brand/10"
        >
          Ver lista
        </button>
      )}
    </div>
  )
}

export function StagesTab({
  processId,
  processStatus,
}: {
  processId: string
  processStatus: ProcessStatus
}) {
  // Publicado, a etapa não some mais: o candidato já leu o desenho do
  // processo quando se inscreveu (decisions.md §26).
  const podeExcluir = processStatus === 'draft'
  const { query, create, update, remove } = useStages(processId)
  // Reaproveita a listagem de candidatos: ela já devolve o código no lugar do
  // nome quando a correção é anônima.
  const applicationsQuery = useApplications(processId, { page_size: 200 })
  const [editing, setEditing] = useState<Stage | null>(null)
  const [creating, setCreating] = useState(false)
  // Etapa cuja lista de candidatos está aberta no modal.
  const [vendoLista, setVendoLista] = useState<Stage | null>(null)
  const [removeError, setRemoveError] = useState<string | null>(null)

  const stages = query.data ?? []
  const applications = applicationsQuery.data?.results ?? []
  const namesByStage = new Map<string, string[]>()
  for (const application of applications) {
    if (!application.current_stage) continue
    const names = namesByStage.get(application.current_stage) ?? []
    names.push(application.participant_name)
    namesByStage.set(application.current_stage, names)
  }

  if (query.isError) {
    return (
      <QueryError
        title="Não foi possível carregar as etapas"
        error={query.error}
        onRetry={() => query.refetch()}
        retrying={query.isFetching}
      />
    )
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        {podeExcluir ? (
          <span />
        ) : (
          <p className="font-ui text-xs text-ink/60">
            Processo publicado: as etapas podem ser editadas, mas não excluídas.
          </p>
        )}
        <Button onClick={() => setCreating(true)}>
          <Plus className="h-4 w-4" />
          Nova etapa
        </Button>
      </div>

      {removeError && (
        <p className="mb-4 rounded-xl border border-red-400/30 bg-red-500/10 px-3 py-2 text-sm font-medium text-red-600">
          {removeError}
        </p>
      )}

      {query.isLoading ? (
        <div className="dark-card h-40 animate-pulse rounded-[21px]" />
      ) : stages.length === 0 ? (
        <div className="dark-card rounded-[21px] p-8 text-center">
          <p className="font-display text-base font-semibold text-ink">
            Nenhuma etapa configurada
          </p>
          <p className="mt-1 text-sm text-ink/68">
            O processo só pode ser publicado com ao menos uma etapa.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {stages.map((stage) => (
            <div key={stage.id} className="dark-card flex flex-col rounded-[21px] p-5">
              <div className="mb-3 flex items-start gap-2">
                <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-brand/15 font-display text-xs font-semibold text-brand">
                  {stage.order}
                </span>
                <h3 className="min-h-[2.75rem] min-w-0 flex-1 font-display text-base font-semibold leading-snug text-ink">
                  {stage.name}
                </h3>
                {Number(stage.weight) > 0 && (
                  <span
                    className="flex-shrink-0 rounded-full bg-brand/10 px-2 py-0.5 font-display text-xs font-semibold tabular-nums text-brand"
                    title="Peso na nota final"
                  >
                    {Number(stage.weight)}%
                  </span>
                )}
              </div>

              {stage.description && (
                <p className="mb-4 text-xs leading-relaxed text-ink/68">
                  {stage.description}
                </p>
              )}

              {/* Tudo daqui para baixo cola no rodapé: a descrição tem tamanho
                  livre, e sem isto cada card alinharia numa altura diferente. */}
              <div className="mt-auto">
                <div className="mb-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-ink/60">
                  <span className="tabular-nums">
                    {formatDate(stage.start_at)} – {formatDate(stage.end_at)}
                  </span>
                  <span aria-hidden="true" className="text-ink/25">
                    ·
                  </span>
                  <span>
                    {stage.criteria.length} critério{stage.criteria.length === 1 ? '' : 's'}
                  </span>
                  {stage.allows_file_upload && (
                    <>
                      <span aria-hidden="true" className="text-ink/25">
                        ·
                      </span>
                      <span className="inline-flex items-center gap-1 text-brand">
                        <FileUp className="h-3 w-3" />
                        {stage.allowed_file_types.join(', ') || 'arquivo'}
                      </span>
                    </>
                  )}
                </div>

                <CandidateCount
                  total={stage.participant_count}
                  temNomes={(namesByStage.get(stage.id) ?? []).length > 0}
                  onOpen={() => setVendoLista(stage)}
                />

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setEditing(stage)}
                    className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-ink/15 px-2.5 py-1.5 font-ui text-xs font-medium text-ink/75 transition-colors hover:border-brand hover:text-brand"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    Editar
                  </button>
                  {podeExcluir && (
                    <button
                      type="button"
                      onClick={() => {
                        setRemoveError(null)
                        remove.mutate(stage.id, {
                          onError: (e) => setRemoveError(getApiError(e)),
                        })
                      }}
                      className="rounded-xl border border-ink/15 p-1.5 text-ink/60 transition-colors hover:border-red-400 hover:bg-red-500/10 hover:text-red-600"
                      aria-label={`Excluir ${stage.name}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {creating && (
        <StageConfigModal
          onClose={() => setCreating(false)}
          saving={create.isPending}
          error={create.error}
          onSave={(payload) =>
            create.mutate(payload, { onSuccess: () => setCreating(false) })
          }
        />
      )}

      {editing && (
        <StageConfigModal
          stage={editing}
          onClose={() => setEditing(null)}
          saving={update.isPending}
          error={update.error}
          // O PDF sobe por endpoint próprio: sem recarregar, o card continuaria
          // mostrando o estado anterior do anexo.
          onFileChange={() => query.refetch()}
          onSave={(payload) =>
            update.mutate(
              { id: editing.id, payload },
              { onSuccess: () => setEditing(null) },
            )
          }
        />
      )}

      {vendoLista && (
        <Modal
          title={vendoLista.name}
          subtitle={`${vendoLista.participant_count} candidato${
            vendoLista.participant_count === 1 ? '' : 's'
          } nesta etapa`}
          onClose={() => setVendoLista(null)}
        >
          <ol className="divide-y divide-ink/10 rounded-xl border border-ink/10">
            {(namesByStage.get(vendoLista.id) ?? []).map((name, index) => (
              <li
                key={`${name}-${index}`}
                className="flex items-center gap-3 px-4 py-2.5 font-ui text-sm text-ink/82"
              >
                <span className="w-6 flex-shrink-0 text-right text-xs tabular-nums text-ink/40">
                  {index + 1}
                </span>
                {name}
              </li>
            ))}
          </ol>
        </Modal>
      )}
    </div>
  )
}
