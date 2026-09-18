import { ArrowRight, CalendarDays, Layers, Users } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { ApplicationStatus } from '../types/application'
import type { ProcessStatus } from '../types/process'

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
  })
}

const statusLabel: Record<ApplicationStatus, string> = {
  in_progress: 'Em andamento',
  approved: 'Aprovado',
  rejected: 'Não aprovado',
  discarded: 'Encerrada',
}

const statusClass: Record<ApplicationStatus, string> = {
  in_progress: 'border-brand/25 bg-brand/15 text-brand',
  approved: 'border-brand-green/25 bg-brand-green/12 text-brand-green',
  rejected: 'border-red-400/25 bg-red-500/10 text-red-600',
  discarded: 'border-ink/12 bg-ink/[0.06] text-ink/60',
}

const processStatusLabel: Record<ProcessStatus, string> = {
  draft: 'Rascunho',
  published: 'Publicado',
  closed: 'Encerrado',
}

const processStatusClass: Record<ProcessStatus, string> = {
  draft: 'border-amber-400/30 bg-amber-500/10 text-amber-700',
  published: 'border-brand-green/25 bg-brand-green/12 text-brand-green',
  closed: 'border-ink/12 bg-ink/[0.06] text-ink/60',
}

const actionClass =
  'mt-auto inline-flex items-center justify-center gap-2 rounded-2xl border border-ink/20 px-5 py-2.5 font-ui text-sm font-medium text-ink transition-colors hover:border-brand hover:bg-brand/5 hover:text-brand'

interface ProcessCardProps {
  name: string
  /** Ausentes na candidatura: o endpoint de "Meus processos" não os devolve. */
  registrationStart?: string
  registrationEnd?: string
  submittedAt?: string | null
  stageCount: number
  /** Presente só quando o candidato já está inscrito. */
  applicationStatus?: ApplicationStatus
  /** Visão do organizador: status do processo e nº de inscritos. */
  processStatus?: ProcessStatus
  applicationCount?: number
  currentStageName?: string | null
  registrationOpen?: boolean
  /** Navega (candidato) ou executa (organizador, quando abre um modal). */
  to?: string
  onAction?: () => void
  actionLabel: string
}

export function ProcessCard({
  name,
  registrationStart,
  registrationEnd,
  submittedAt,
  stageCount,
  applicationStatus,
  processStatus,
  applicationCount,
  currentStageName,
  registrationOpen,
  to,
  onAction,
  actionLabel,
}: ProcessCardProps) {
  return (
    <div className="dark-card flex h-full flex-col rounded-[21px] p-6 transition-all hover:-translate-y-0.5 hover:border-brand/40">
      <div className="mb-4 flex items-start justify-between gap-3">
        <h3 className="font-display text-lg font-semibold leading-tight text-ink">
          {name}
        </h3>
        {applicationStatus ? (
          <span
            className={`flex-shrink-0 rounded-full border px-2 py-0.5 text-xs font-medium ${statusClass[applicationStatus]}`}
          >
            {statusLabel[applicationStatus]}
          </span>
        ) : processStatus ? (
          <span
            className={`flex-shrink-0 rounded-full border px-2 py-0.5 text-xs font-medium ${processStatusClass[processStatus]}`}
          >
            {processStatusLabel[processStatus]}
          </span>
        ) : (
          <span
            className={`flex-shrink-0 rounded-full border px-2 py-0.5 text-xs font-medium ${
              registrationOpen
                ? 'border-brand-green/25 bg-brand-green/12 text-brand-green'
                : 'border-ink/12 bg-ink/[0.06] text-ink/60'
            }`}
          >
            {registrationOpen ? 'Inscrições abertas' : 'Inscrições encerradas'}
          </span>
        )}
      </div>

      {/* Só enquanto a candidatura corre: dizer "Etapa atual: Entrevista" ao lado
          do selo "Aprovado" faz o candidato achar que ainda falta alguma coisa. */}
      {currentStageName && applicationStatus === 'in_progress' && (
        <p className="mb-4 text-xs text-ink/68">
          Etapa atual: <span className="font-medium text-ink/82">{currentStageName}</span>
        </p>
      )}

      <div className="mb-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-ink/68">
        {registrationStart && registrationEnd && (
          <span className="inline-flex items-center gap-1.5">
            <CalendarDays className="h-3.5 w-3.5 text-brand" />
            {formatDate(registrationStart)} – {formatDate(registrationEnd)}
          </span>
        )}
        {submittedAt && (
          <span className="inline-flex items-center gap-1.5">
            <CalendarDays className="h-3.5 w-3.5 text-brand" />
            Inscrito em {formatDate(submittedAt)}
          </span>
        )}
        <span className="inline-flex items-center gap-1.5">
          <Layers className="h-3.5 w-3.5 text-brand" />
          {stageCount} etapa{stageCount === 1 ? '' : 's'}
        </span>
        {applicationCount !== undefined && (
          <span className="inline-flex items-center gap-1.5">
            <Users className="h-3.5 w-3.5 text-brand" />
            {applicationCount} inscrito{applicationCount === 1 ? '' : 's'}
          </span>
        )}
      </div>

      {onAction ? (
        <button type="button" onClick={onAction} className={actionClass}>
          {actionLabel}
          <ArrowRight className="h-4 w-4" />
        </button>
      ) : (
        <Link to={to as string} className={actionClass}>
          {actionLabel}
          <ArrowRight className="h-4 w-4" />
        </Link>
      )}
    </div>
  )
}
