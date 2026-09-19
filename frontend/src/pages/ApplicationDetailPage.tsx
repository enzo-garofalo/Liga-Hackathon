import { ArrowLeft, Info } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import { DeliverableList } from '../components/DeliverableList'
import { DeliverableUpload } from '../components/DeliverableUpload'
import { QueryError } from '../components/QueryError'
import { StageTimeline } from '../components/StageTimeline'
import { Button } from '../components/ui/Button'
import { useApplication } from '../hooks/useApplication'
import type { ApplicationStatus } from '../types/application'
import { isNotFound } from '../utils/errors'

const statusCopy: Record<ApplicationStatus, { label: string; detail: string }> = {
  in_progress: {
    label: 'Em andamento',
    detail: 'Acompanhe por aqui. Avisamos por e-mail a cada mudança.',
  },
  approved: {
    label: 'Aprovado',
    detail: 'Parabéns! Você foi aprovado no processo seletivo.',
  },
  rejected: {
    label: 'Não aprovado',
    detail: 'Sua candidatura não seguiu adiante nesta edição. Obrigado por participar.',
  },
  discarded: {
    label: 'Encerrada',
    detail: 'Esta candidatura foi encerrada.',
  },
}

const statusClass: Record<ApplicationStatus, string> = {
  in_progress: 'border-white/20 bg-white/[0.12] text-white',
  approved: 'border-brand-green/40 bg-brand-green/20 text-white',
  rejected: 'border-red-400/40 bg-red-500/20 text-white',
  discarded: 'border-white/10 bg-white/[0.06] text-white/70',
}

export function ApplicationDetailPage() {
  const { id } = useParams<{ id: string }>()
  const applicationQuery = useApplication(id)
  const application = applicationQuery.data

  if (applicationQuery.isLoading) {
    return (
      <main className="px-4 py-6 md:px-8 md:py-8">
        <div className="dark-card h-64 animate-pulse rounded-[32px]" />
      </main>
    )
  }

  if (applicationQuery.isError && !isNotFound(applicationQuery.error)) {
    return (
      <main className="px-4 py-6 text-ink md:px-8 md:py-8">
        <QueryError
          title="Não foi possível carregar sua candidatura"
          error={applicationQuery.error}
          onRetry={() => applicationQuery.refetch()}
          retrying={applicationQuery.isFetching}
        />
      </main>
    )
  }

  if (!application) {
    return (
      <main className="px-4 py-6 text-ink md:px-8 md:py-8">
        <div className="glass-panel rounded-[32px] p-8 text-center">
          <h1 className="font-display text-xl font-semibold">Candidatura não encontrada</h1>
          <Link to="/dashboard">
            <Button className="mt-5">Voltar ao dashboard</Button>
          </Link>
        </div>
      </main>
    )
  }

  const status = statusCopy[application.status]

  return (
    <main className="px-4 py-6 text-ink md:px-8 md:py-8">
      <Link
        to="/dashboard"
        className="mb-4 inline-flex items-center gap-1.5 font-ui text-sm font-medium text-ink/65 transition-colors hover:text-brand"
      >
        <ArrowLeft className="h-4 w-4" />
        Voltar
      </Link>

      <div className="purple-cta relative overflow-hidden rounded-[32px] p-8 text-panel">
        <div className="relative">
          <p className="mb-2 text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-white/70">
            Minha candidatura
          </p>
          <h1 className="font-display text-3xl font-light leading-tight text-white">
            {application.process_name}
          </h1>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <span
              className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${statusClass[application.status]}`}
            >
              {status.label}
            </span>
            {application.current_stage_name && application.status === 'in_progress' && (
              <span className="text-sm text-white/80">
                Etapa atual: <span className="font-semibold text-white">{application.current_stage_name}</span>
              </span>
            )}
          </div>

          <p className="mt-3 max-w-lg text-sm font-medium leading-relaxed text-white/80">
            {status.detail}
          </p>

          {/* A página do processo só era alcançável antes de se inscrever, ou
              por link de comunicado. Depois da inscrição o candidato perdia de
              vista a descrição e o calendário do processo. */}
          <Link
            to={`/processes/${application.process_id}`}
            className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-white/20 bg-white/[0.06] px-5 py-2.5 font-ui text-sm font-medium text-white transition-colors hover:bg-white/10 sm:w-auto"
          >
            <Info className="h-4 w-4" />
            Sobre o processo
          </Link>
        </div>
      </div>

      <section className="glass-panel mt-6 rounded-[32px] p-8">
        <h2 className="mb-6 font-display text-xl font-semibold text-ink">
          Etapas do processo
        </h2>

        <StageTimeline
          stages={application.stages}
          renderStageExtra={(stage) => {
            const podeEnviar =
              stage.state === 'current' &&
              stage.allows_file_upload &&
              application.status === 'in_progress'

            if (podeEnviar) {
              return <DeliverableUpload applicationId={application.id} stage={stage} />
            }

            // Etapa já corrigida, ou candidatura encerrada: a entrega continua
            // à mão para reler, mas não dá mais para trocar o arquivo.
            if (stage.deliverables.length === 0) return null
            return (
              <div className="mt-4 rounded-[21px] border border-ink/10 bg-ink/[0.02] p-5">
                <p className="kicker">O que você entregou</p>
                <DeliverableList deliverables={stage.deliverables} />
              </div>
            )
          }}
        />
      </section>

      <div className="h-8" />
    </main>
  )
}
