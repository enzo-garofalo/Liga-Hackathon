import { Eye, Star } from 'lucide-react'
import type { ApplicationRow } from '../types/adminApplication'
import type { ApplicationStatus } from '../types/application'

const statusLabel: Record<ApplicationStatus, string> = {
  in_progress: 'Em análise',
  approved: 'Aprovado',
  rejected: 'Reprovado',
  discarded: 'Descartado',
}

const statusClass: Record<ApplicationStatus, string> = {
  in_progress: 'bg-brand/10 text-brand',
  approved: 'bg-brand-green/12 text-brand-green',
  rejected: 'bg-red-500/10 text-red-600',
  discarded: 'bg-ink/[0.06] text-ink/60',
}

function formatUpdated(iso: string) {
  const date = new Date(iso)
  const today = new Date()
  const sameDay = date.toDateString() === today.toDateString()
  if (sameDay) return 'Hoje'

  const yesterday = new Date(today)
  yesterday.setDate(today.getDate() - 1)
  if (date.toDateString() === yesterday.toDateString()) return 'Ontem'

  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
}

interface Props {
  rows: ApplicationRow[]
  selected: string[]
  onToggle: (id: string) => void
  onToggleAll: () => void
  onOpenProfile: (row: ApplicationRow) => void
  onOpenEvaluation: (row: ApplicationRow) => void
  loading?: boolean
}

export function CandidatesTable({
  rows,
  selected,
  onToggle,
  onToggleAll,
  onOpenProfile,
  onOpenEvaluation,
  loading = false,
}: Props) {
  const allSelected = rows.length > 0 && selected.length === rows.length

  if (loading) {
    return <div className="dark-card h-64 animate-pulse rounded-[21px]" />
  }

  if (rows.length === 0) {
    return (
      <div className="dark-card rounded-[21px] p-8 text-center">
        <p className="font-display text-base font-semibold text-ink">
          Nenhum candidato neste filtro
        </p>
        <p className="mt-1 text-sm text-ink/68">
          Ajuste a busca ou os filtros para ver outros candidatos.
        </p>
      </div>
    )
  }

  return (
    <div className="dark-card overflow-x-auto rounded-[21px]">
      <table className="w-full min-w-[46rem] text-left">
        <thead>
          <tr className="border-b border-ink/10 text-xs uppercase tracking-wide text-ink/55">
            <th className="w-10 px-4 py-3">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={onToggleAll}
                className="accent-brand"
                aria-label="Selecionar todos"
              />
            </th>
            <th className="px-3 py-3 font-medium">Nome</th>
            <th className="px-3 py-3 font-medium">Curso</th>
            <th className="px-3 py-3 font-medium">Etapa</th>
            <th className="px-3 py-3 font-medium">Nota</th>
            <th className="px-3 py-3 font-medium">Status</th>
            <th className="px-3 py-3 font-medium">Atualizado</th>
            <th className="px-3 py-3 font-medium">Ações</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-ink/[0.08]">
          {rows.map((row) => (
            <tr key={row.id} className="text-sm transition-colors hover:bg-brand/[0.03]">
              <td className="px-4 py-3">
                <input
                  type="checkbox"
                  checked={selected.includes(row.id)}
                  onChange={() => onToggle(row.id)}
                  className="accent-brand"
                  aria-label={`Selecionar ${row.participant_name}`}
                />
              </td>
              <td className="px-3 py-3 font-medium text-ink">{row.participant_name}</td>
              <td className="px-3 py-3 text-ink/70">{row.course}</td>
              <td className="px-3 py-3 text-ink/70">{row.current_stage_name ?? '—'}</td>
              <td className="px-3 py-3">
                {row.final_score === null ? (
                  <span className="text-ink/45">—</span>
                ) : (
                  <button
                    type="button"
                    onClick={() => onOpenEvaluation(row)}
                    className="inline-flex items-center gap-1.5 font-medium text-ink transition-colors hover:text-brand"
                    title="Ver avaliação detalhada"
                  >
                    {row.final_score.toFixed(2).replace('.', ',')}
                    <Star className="h-3.5 w-3.5 text-brand" />
                  </button>
                )}
              </td>
              <td className="px-3 py-3">
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusClass[row.status]}`}
                >
                  {statusLabel[row.status]}
                </span>
              </td>
              <td className="px-3 py-3 text-ink/60">{formatUpdated(row.updated_at)}</td>
              <td className="px-3 py-3">
                <button
                  type="button"
                  onClick={() => onOpenProfile(row)}
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
  )
}
