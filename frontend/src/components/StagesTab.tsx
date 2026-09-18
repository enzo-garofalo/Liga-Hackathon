import { FileUp, Pencil, Plus, Trash2, Users } from 'lucide-react'
import { useState } from 'react'
import { useApplications } from '../hooks/useApplications'
import { useStages } from '../hooks/useStages'
import type { Stage } from '../types/stage'
import { getApiError } from '../utils/errors'
import { QueryError } from './QueryError'
import { StageConfigModal } from './StageConfigModal'
import { Button } from './ui/Button'

function formatDate(iso: string | null) {
  return iso
    ? new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
    : '—'
}

export function StagesTab({ processId }: { processId: string }) {
  const { query, create, update, remove } = useStages(processId)
  // Reaproveita a listagem de candidatos: ela já devolve o código no lugar do
  // nome quando a correção é anônima.
  const applicationsQuery = useApplications(processId, { page_size: 200 })
  const [editing, setEditing] = useState<Stage | null>(null)
  const [creating, setCreating] = useState(false)
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
      <div className="mb-4 flex justify-end">
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
              <div className="mb-3 flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand/15 font-display text-xs font-semibold text-brand">
                  {stage.order}
                </span>
                <h3 className="min-w-0 flex-1 truncate font-display text-base font-semibold text-ink">
                  {stage.name}
                </h3>
              </div>

              {stage.description && (
                <p className="mb-3 line-clamp-2 text-xs leading-relaxed text-ink/68">
                  {stage.description}
                </p>
              )}

              <div className="mb-4 space-y-1.5 text-xs text-ink/68">
                <p className="inline-flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5 text-brand" />
                  {stage.participant_count} candidato
                  {stage.participant_count === 1 ? '' : 's'}
                </p>
                {(namesByStage.get(stage.id) ?? []).length > 0 && (
                  <ul className="space-y-0.5 pl-5">
                    {(namesByStage.get(stage.id) ?? []).slice(0, 8).map((name) => (
                      <li key={name} className="truncate text-ink/75">
                        {name}
                      </li>
                    ))}
                    {(namesByStage.get(stage.id) ?? []).length > 8 && (
                      <li className="text-ink/55">
                        + {(namesByStage.get(stage.id) ?? []).length - 8} outros
                      </li>
                    )}
                  </ul>
                )}
                <p>
                  {formatDate(stage.start_at)} – {formatDate(stage.end_at)}
                </p>
                {stage.allows_file_upload && (
                  <p className="inline-flex items-center gap-1.5 text-brand">
                    <FileUp className="h-3.5 w-3.5" />
                    {stage.allowed_file_types.join(', ') || 'arquivo'}
                  </p>
                )}
                {Number(stage.weight) > 0 && <p>Peso na nota final: {Number(stage.weight)}%</p>}
                <p>
                  {stage.criteria.length} critério
                  {stage.criteria.length === 1 ? '' : 's'}
                </p>
              </div>

              <div className="mt-auto flex gap-2">
                <button
                  type="button"
                  onClick={() => setEditing(stage)}
                  className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-ink/15 px-2.5 py-1.5 font-ui text-xs font-medium text-ink/75 transition-colors hover:border-brand hover:text-brand"
                >
                  <Pencil className="h-3.5 w-3.5" />
                  Editar
                </button>
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
          onSave={(payload) =>
            update.mutate(
              { id: editing.id, payload },
              { onSuccess: () => setEditing(null) },
            )
          }
        />
      )}
    </div>
  )
}
