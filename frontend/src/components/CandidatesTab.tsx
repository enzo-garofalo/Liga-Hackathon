import { Search } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useApplications } from '../hooks/useApplications'
import { useBulkActions } from '../hooks/useBulkActions'
import { useCommunications } from '../hooks/useCommunications'
import type { AdminProcessDetail } from '../types/adminProcess'
import type { ApplicationRow, BulkAction } from '../types/adminApplication'
import type { ApplicationStatus } from '../types/application'
import { getApiError } from '../utils/errors'
import { CandidateProfileModal } from './CandidateProfileModal'
import { CandidatesTable } from './CandidatesTable'
import { ConfirmDialog } from './ui/ConfirmDialog'
import { NewCommunicationModal } from './NewCommunicationModal'
import { EvaluationDetailModal } from './EvaluationDetailModal'
import { QueryError } from './QueryError'
import { Button } from './ui/Button'

const STATUSES: { value: ApplicationStatus | ''; label: string }[] = [
  { value: '', label: 'Todos os status' },
  { value: 'in_progress', label: 'Em análise' },
  { value: 'approved', label: 'Aprovados' },
  { value: 'rejected', label: 'Reprovados' },
  { value: 'discarded', label: 'Descartados' },
<<<<<<< HEAD
=======
  { value: 'withdrawn', label: 'Desistiram' },
>>>>>>> feature/v3-processo-seletivo
]

const ORDERINGS = [
  { value: 'name', label: 'Nome (A-Z)' },
  { value: '-score', label: 'Maior nota' },
  { value: 'score', label: 'Menor nota' },
  { value: '-updated_at', label: 'Atualização recente' },
]

<<<<<<< HEAD
export function CandidatesTab({ process }: { process: AdminProcessDetail }) {
=======
interface CandidatesTabProps {
  process: AdminProcessDetail
  /**
   * Coordenador. Sem isto a tela ofereceria aprovar, reprovar, mover e
   * comunicar para quem a API recusa, e o avaliador só descobriria o erro
   * depois de clicar (decisions.md §29).
   */
  canDecide: boolean
}

export function CandidatesTab({ process, canDecide }: CandidatesTabProps) {
>>>>>>> feature/v3-processo-seletivo
  const [search, setSearch] = useState('')
  const [debounced, setDebounced] = useState('')
  const [stage, setStage] = useState('')
  const [status, setStatus] = useState<ApplicationStatus | ''>('')
  const [course, setCourse] = useState('')
  const [ordering, setOrdering] = useState('name')
  const [selected, setSelected] = useState<string[]>([])
  const [action, setAction] = useState<BulkAction | 'communicate' | ''>('')
  const [composing, setComposing] = useState(false)
  const [targetStage, setTargetStage] = useState('')
  const [profileRow, setProfileRow] = useState<ApplicationRow | null>(null)
  const [confirming, setConfirming] = useState<
    | { kind: 'approve' | 'reject'; rows: ApplicationRow[]; nextStage?: { id: string; name: string } }
    | null
  >(null)
  const [evaluationRow, setEvaluationRow] = useState<ApplicationRow | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(search), 300)
    return () => clearTimeout(timer)
  }, [search])

  const query = useApplications(process.id, {
    search: debounced,
    stage,
    status,
    course,
    ordering,
  })
  const bulk = useBulkActions(process.id)
  const communications = useCommunications(process.id)

  const rows = query.data?.results ?? []
<<<<<<< HEAD
  const lastStage = process.stages[process.stages.length - 1]
  const courses = Array.from(new Set(rows.map((row) => row.course))).sort()
=======
  // Fila vazia tem dois motivos bem diferentes: filtro que não achou nada, e
  // coordenação que ainda não distribuiu. Só o segundo precisa de explicação.
  const filtrando = Boolean(debounced || stage || status || course)
  const semDistribuicao = !canDecide && !filtrando
  const lastStage = process.stages[process.stages.length - 1]
  // Curso vem nulo na correção anônima: quem enxerga o filtro é quem enxerga
  // os cursos, e para o avaliador ele simplesmente não aparece.
  const courses = Array.from(
    new Set(rows.map((row) => row.course).filter((item): item is string => Boolean(item))),
  ).sort()
>>>>>>> feature/v3-processo-seletivo

  // Aprovar só vale para quem está na última etapa — o backend recusa o resto.
  const selectedRows = rows.filter((row) => selected.includes(row.id))
  const canApprove =
    selectedRows.length > 0 &&
    Boolean(lastStage) &&
    selectedRows.every((row) => row.current_stage === lastStage?.id)

  // Aprovar avança para a próxima etapa; na última, aprova de vez.
  const nextStageOf = (row: ApplicationRow) => {
    const index = process.stages.findIndex((item) => item.id === row.current_stage)
    return index >= 0 ? process.stages[index + 1] : undefined
  }

  const askDecision = (kind: 'approve' | 'reject', targets: ApplicationRow[]) => {
    setError(null)
    const nextStage = kind === 'approve' ? nextStageOf(targets[0]) : undefined
    setConfirming({ kind, rows: targets, nextStage })
  }

  const applyDecision = () => {
    if (!confirming) return
    const { kind, rows: targets, nextStage } = confirming
    const applications = targets.map((row) => row.id)

    bulk.mutate(
      kind === 'approve' && nextStage
        ? { applications, action: 'move_stage', target_stage: nextStage.id }
        : { applications, action: kind },
      {
        onSuccess: () => {
          setConfirming(null)
          setProfileRow(null)
          setSelected([])
          setAction('')
        },
        onError: (e) => {
          setConfirming(null)
          setError(getApiError(e))
        },
      },
    )
  }

  const toggle = (id: string) =>
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    )

  const toggleAll = () =>
    setSelected((prev) => (prev.length === rows.length ? [] : rows.map((row) => row.id)))

  const runAction = () => {
    if (!action || selected.length === 0) return
    if (action === 'communicate') {
      setComposing(true)
      return
    }
    if (action === 'approve' || action === 'reject') {
      askDecision(action, selectedRows)
      return
    }
    setError(null)
    bulk.mutate(
      {
        applications: selected,
        action: action as BulkAction,
        ...(action === 'move_stage' ? { target_stage: targetStage } : {}),
      },
      {
        onSuccess: () => {
          setSelected([])
          setAction('')
        },
        onError: (e) => setError(getApiError(e)),
      },
    )
  }

  if (query.isError) {
    return (
      <QueryError
        title="Não foi possível carregar os candidatos"
        error={query.error}
        onRetry={() => query.refetch()}
        retrying={query.isFetching}
      />
    )
  }

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <div className="relative lg:col-span-2">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink/40" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Pesquisar candidato..."
            className="w-full rounded-xl border border-ink/20 bg-transparent py-2 pl-9 pr-3 font-ui text-sm text-ink placeholder:text-ink/40 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
          />
        </div>

        <select
          value={stage}
          onChange={(event) => setStage(event.target.value)}
          className="rounded-xl border border-ink/20 bg-transparent px-3 py-2 font-ui text-sm text-ink focus:border-brand focus:outline-none"
        >
          <option value="">Todas as etapas</option>
          {process.stages.map((item) => (
            <option key={item.id} value={item.id}>
              {item.order}. {item.name}
            </option>
          ))}
        </select>

        <select
          value={status}
          onChange={(event) => setStatus(event.target.value as ApplicationStatus | '')}
          className="rounded-xl border border-ink/20 bg-transparent px-3 py-2 font-ui text-sm text-ink focus:border-brand focus:outline-none"
        >
          {STATUSES.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        <select
          value={ordering}
          onChange={(event) => setOrdering(event.target.value)}
          className="rounded-xl border border-ink/20 bg-transparent px-3 py-2 font-ui text-sm text-ink focus:border-brand focus:outline-none"
        >
          {ORDERINGS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {courses.length > 1 && (
        <select
          value={course}
          onChange={(event) => setCourse(event.target.value)}
          className="rounded-xl border border-ink/20 bg-transparent px-3 py-2 font-ui text-sm text-ink focus:border-brand focus:outline-none"
        >
          <option value="">Todos os cursos</option>
          {courses.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
      )}

      {/* Ações em massa */}
<<<<<<< HEAD
      {selected.length > 0 && (
=======
      {canDecide && selected.length > 0 && (
>>>>>>> feature/v3-processo-seletivo
        <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-brand/25 bg-brand/[0.06] px-4 py-3">
          <span className="font-ui text-sm font-medium text-ink">
            {selected.length} candidato{selected.length === 1 ? '' : 's'} selecionado
            {selected.length === 1 ? '' : 's'}
          </span>

          <select
            value={action}
            onChange={(event) =>
              setAction(event.target.value as BulkAction | 'communicate' | '')
            }
            className="rounded-xl border border-ink/20 bg-white/70 px-3 py-1.5 font-ui text-sm text-ink focus:border-brand focus:outline-none"
          >
            <option value="">Ações...</option>
            <option value="move_stage">Mover para etapa</option>
            <option value="reject">Reprovar</option>
            <option value="discard">Descartar</option>
            <option value="communicate">Enviar comunicado</option>
            <option value="approve" disabled={!canApprove}>
              Aprovar {canApprove ? '' : '(só na última etapa)'}
            </option>
          </select>

          {action === 'move_stage' && (
            <select
              value={targetStage}
              onChange={(event) => setTargetStage(event.target.value)}
              className="rounded-xl border border-ink/20 bg-white/70 px-3 py-1.5 font-ui text-sm text-ink focus:border-brand focus:outline-none"
            >
              <option value="">Etapa de destino...</option>
              {process.stages.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.order}. {item.name}
                </option>
              ))}
            </select>
          )}

          <Button
            onClick={runAction}
            loading={bulk.isPending}
            disabled={!action || (action === 'move_stage' && !targetStage)}
          >
            Aplicar
          </Button>
          <button
            type="button"
            onClick={() => setSelected([])}
            className="font-ui text-sm text-ink/60 underline-offset-2 hover:underline"
          >
            Limpar seleção
          </button>
        </div>
      )}

      {error && (
        <p className="rounded-xl border border-red-400/30 bg-red-500/10 px-3 py-2 text-sm font-medium text-red-600">
          {error}
        </p>
      )}

      <CandidatesTable
        rows={rows}
<<<<<<< HEAD
        selected={selected}
        onToggle={toggle}
        onToggleAll={toggleAll}
        onOpenProfile={(row) => setProfileRow(row)}
        onOpenEvaluation={(row) => setEvaluationRow(row)}
        loading={query.isLoading}
=======
        selected={canDecide ? selected : []}
        onToggle={canDecide ? toggle : undefined}
        onToggleAll={canDecide ? toggleAll : undefined}
        onOpenProfile={(row) => setProfileRow(row)}
        onOpenEvaluation={(row) => setEvaluationRow(row)}
        loading={query.isLoading}
        emptyTitle={
          semDistribuicao ? 'Nada distribuído para você ainda' : undefined
        }
        emptyHint={
          semDistribuicao
            ? 'A coordenação ainda não passou correções suas neste processo. Assim que passar, os candidatos aparecem aqui.'
            : undefined
        }
>>>>>>> feature/v3-processo-seletivo
      />

      {query.data && query.data.count > rows.length && (
        <p className="text-center text-xs text-ink/55">
          Mostrando {rows.length} de {query.data.count} candidatos.
        </p>
      )}

      {profileRow && (
        <CandidateProfileModal
          applicationId={profileRow.id}
          scaleMin={process.score_min}
          scaleMax={process.score_max}
          nextStageName={nextStageOf(profileRow)?.name ?? null}
          deciding={bulk.isPending}
<<<<<<< HEAD
          onApprove={() => askDecision('approve', [profileRow])}
          onReject={() => askDecision('reject', [profileRow])}
=======
          onApprove={canDecide ? () => askDecision('approve', [profileRow]) : undefined}
          onReject={canDecide ? () => askDecision('reject', [profileRow]) : undefined}
>>>>>>> feature/v3-processo-seletivo
          onClose={() => setProfileRow(null)}
        />
      )}

      {confirming && (
        <ConfirmDialog
          title={confirming.kind === 'approve' ? 'Aprovar candidato' : 'Reprovar candidato'}
          question={
            confirming.rows.length === 1
              ? confirming.kind === 'approve'
                ? 'Você tem certeza de aprovar o candidato?'
                : 'Você tem certeza de reprovar o candidato?'
              : confirming.kind === 'approve'
                ? 'Você tem certeza de aprovar os ' + confirming.rows.length + ' candidatos selecionados?'
                : 'Você tem certeza de reprovar os ' + confirming.rows.length + ' candidatos selecionados?'
          }
          detail={
            confirming.kind === 'approve'
              ? confirming.nextStage
                ? 'Quem for aprovado avança para a etapa ' + confirming.nextStage.name + ' e recebe um e-mail de convocação.'
                : 'Esta é a última etapa: o candidato será aprovado no processo e receberá o e-mail de resultado.'
              : 'A candidatura é encerrada e o candidato recebe o e-mail de resultado. A ação não pode ser desfeita pela interface.'
          }
          confirmLabel={confirming.kind === 'approve' ? 'Sim, aprovar' : 'Sim, reprovar'}
          tone={confirming.kind === 'approve' ? 'success' : 'danger'}
          loading={bulk.isPending}
          onConfirm={applyDecision}
          onCancel={() => setConfirming(null)}
        />
      )}

      {composing && (
        <NewCommunicationModal
          stages={process.stages}
          recipients={selectedRows.map((row) => ({
            id: row.participant,
            name: row.participant_name,
          }))}
          sending={communications.send.isPending}
          error={communications.send.error}
          onClose={() => setComposing(false)}
          onSend={(payload) =>
            communications.send.mutate(payload, {
              onSuccess: () => {
                setComposing(false)
                setSelected([])
                setAction('')
              },
            })
          }
        />
      )}

      {evaluationRow && (
        <EvaluationDetailModal
          applicationId={evaluationRow.id}
          candidateName={evaluationRow.participant_name}
          onClose={() => setEvaluationRow(null)}
        />
      )}
    </div>
  )
}
