import { useQuery } from '@tanstack/react-query'
import { CalendarDays, Clock, Layers, ListChecks, Mail, MessageCircle, User, Users } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { getInfo } from '../api/info'
import { CreateTeamModal } from '../components/CreateTeamModal'
import { InviteListItem } from '../components/InviteListItem'
import { ProcessCard } from '../components/ProcessCard'
import { QueryError } from '../components/QueryError'
import { StatusBanner } from '../components/StatusBanner'
import { Button } from '../components/ui/Button'
import { SHOW_HACKATHON } from '../featureFlags'
import { useMyInvites } from '../hooks/useInvites'
import { useMyApplications } from '../hooks/useMyApplications'
import { useProcesses } from '../hooks/useProcesses'
import { useProfile } from '../hooks/useProfile'
import { useOpenTeams } from '../hooks/useTeams'
import type { ApplicationStatus } from '../types/application'

const WHATSAPP_LINK = (import.meta as unknown as { env: Record<string, string> }).env.VITE_WHATSAPP_LINK || '#'
const EVENT_DATE = new Date('2026-06-20T10:00:00')

function daysUntil(date: Date) {
  return Math.max(0, Math.ceil((date.getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
}

function formatDatePtBR(iso: string) {
  return new Date(iso + 'T12:00:00').toLocaleDateString('pt-BR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

function formatShortDate(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
}

const statusLabel: Record<ApplicationStatus, string> = {
  in_progress: 'Em andamento',
  approved: 'Aprovado',
  rejected: 'Não aprovado',
  discarded: 'Encerrada',
}

const statusClass: Record<ApplicationStatus, string> = {
  in_progress: 'bg-brand/10 text-brand',
  approved: 'bg-brand-green/12 text-brand-green',
  rejected: 'bg-red-500/10 text-red-600',
  discarded: 'bg-ink/[0.06] text-ink/60',
}

function StatCard({
  label,
  value,
  icon: Icon,
}: {
  label: string
  value: React.ReactNode
  icon: React.ElementType
}) {
  return (
    <div className="dark-card relative overflow-hidden rounded-[21px] p-5 transition-colors hover:border-brand/35">
      <Icon className="absolute right-4 top-4 h-8 w-8 text-brand/45" />
      <p className="kicker">{label}</p>
      <div className="mt-2 font-display text-lg font-semibold text-ink">{value}</div>
    </div>
  )
}

export function DashboardPage() {
  const profileQuery = useProfile()
  const applicationsQuery = useMyApplications()
  const processesQuery = useProcesses()

  // Hackathon — consultado apenas quando o bloco esta ativo.
  const invitesQuery = useMyInvites(SHOW_HACKATHON)
  const openTeamsQuery = useOpenTeams(SHOW_HACKATHON)
  const infoQuery = useQuery({
    queryKey: ['info'],
    queryFn: getInfo,
    enabled: SHOW_HACKATHON,
  })

  const me = profileQuery.data
  const [createModalOpen, setCreateModalOpen] = useState(false)

  const myApplications = applicationsQuery.data ?? []
  const allProcesses = processesQuery.data ?? []
  const availableProcesses = allProcesses.filter((p) => !p.already_applied)
  const openProcesses = availableProcesses.filter((p) => p.registration_open)

  // A candidatura em andamento e a que interessa no topo; se nao houver, a mais recente.
  const activeApplication =
    myApplications.find((a) => a.status === 'in_progress') ?? myApplications[0]

  const nextDeadline = openProcesses
    .map((p) => p.registration_end)
    .sort()[0]

  const firstName = me?.full_name.split(' ')[0] ?? '...'

  // Hackathon
  const invites = invitesQuery.data ?? []
  const openTeams = openTeamsQuery.data ?? []
  const deadlineIso = infoQuery.data?.team_deadline ?? '2026-05-30'
  const daysLeft = daysUntil(new Date(deadlineIso + 'T23:59:59'))
  const deadlineFmt = infoQuery.data ? formatDatePtBR(deadlineIso) : deadlineIso
  const daysEvent = daysUntil(EVENT_DATE)

  const loadingProcesses = applicationsQuery.isLoading || processesQuery.isLoading
  const processError = applicationsQuery.error ?? processesQuery.error
  const retryProcesses = () => {
    applicationsQuery.refetch()
    processesQuery.refetch()
  }
  const retryingProcesses = applicationsQuery.isFetching || processesQuery.isFetching
  // Com erro, as pilulas nao podem afirmar "Sem inscricao" ou "0 disponiveis".
  const statsUnknown = loadingProcesses || Boolean(processError)

  return (
    <main className="px-4 py-6 text-ink md:px-8 md:py-8">
      <div className="purple-cta relative overflow-hidden rounded-[32px] p-8 text-panel">
        <div className="relative">
          <p className="mb-2 text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-white/70">Dashboard</p>
          <h1 className="font-display leading-tight">
            <span className="text-5xl font-light text-white/80">Olá, </span>
            <span className="text-5xl font-light text-white">{firstName}.</span>
          </h1>
          {me && (
            <p className="mt-2 text-sm font-medium text-white/80">
              {me.course} - {me.semester} semestre
            </p>
          )}
        </div>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard
          label="Minha candidatura"
          icon={User}
          value={
            statsUnknown ? (
              '-'
            ) : activeApplication ? (
              <span
                className={`rounded-full px-2 py-0.5 font-ui text-base font-medium ${statusClass[activeApplication.status]}`}
              >
                {statusLabel[activeApplication.status]}
              </span>
            ) : (
              <span className="rounded-full bg-ink/[0.06] px-2 py-0.5 font-ui text-base font-medium text-ink/60">
                Sem inscrição
              </span>
            )
          }
        />
        <StatCard
          label="Etapa atual"
          icon={Layers}
          value={
            statsUnknown
              ? '-'
              : activeApplication?.current_stage_name ?? 'Nenhuma'
          }
        />
        <StatCard
          label="Processos abertos"
          icon={ListChecks}
          value={statsUnknown ? '-' : `${openProcesses.length} disponíve${openProcesses.length === 1 ? 'l' : 'is'}`}
        />
        <StatCard
          label="Inscrições até"
          icon={CalendarDays}
          value={nextDeadline ? formatShortDate(nextDeadline) : '-'}
        />
      </div>

      {myApplications.length > 0 && (
        <section className="mt-8">
          <h2 className="font-display text-2xl font-semibold text-ink">Meus processos</h2>
          <p className="mb-4 mt-1 text-sm text-ink/70">
            Acompanhe suas candidaturas ao processo seletivo da Liga.
          </p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {myApplications.map((application) => (
              <ProcessCard
                key={application.id}
                name={application.process_name}
                submittedAt={application.submitted_at}
                stageCount={application.stage_count}
                applicationStatus={application.status}
                currentStageName={application.current_stage_name}
                to={`/applications/${application.id}`}
                actionLabel="Ver candidatura"
              />
            ))}
          </div>
        </section>
      )}

      {availableProcesses.length > 0 && (
        <section className="mt-8">
          <h2 className="font-display text-2xl font-semibold text-ink">
            Processos disponíveis
          </h2>
          <p className="mb-4 mt-1 text-sm text-ink/70">
            Processos seletivos abertos para inscrição.
          </p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {availableProcesses.map((process) => (
              <ProcessCard
                key={process.id}
                name={process.name}
                registrationStart={process.registration_start}
                registrationEnd={process.registration_end}
                stageCount={process.stage_count}
                registrationOpen={process.registration_open}
                to={`/processes/${process.id}`}
                actionLabel="Ver detalhes"
              />
            ))}
          </div>
        </section>
      )}

      {/* Sem candidatura e sem processo aberto: a tela ficaria vazia. */}
      {!loadingProcesses && !processError && myApplications.length === 0 && availableProcesses.length === 0 && (
        <section className="purple-cta relative mt-8 overflow-hidden rounded-[32px] p-8 text-white">
          <div className="relative">
            <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-xl bg-white/10">
              <ListChecks className="h-5 w-5 text-white" />
            </div>
            <h2 className="font-display text-2xl font-semibold text-white">
              Nenhum processo aberto no momento
            </h2>
            <p className="mt-2 max-w-md text-sm font-medium leading-relaxed text-white/80">
              Quando a Liga abrir um novo processo seletivo, ele aparece aqui e você
              recebe um aviso por e-mail.
            </p>
            {WHATSAPP_LINK !== '#' && (
              <a
                href={WHATSAPP_LINK}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-6 inline-flex items-center justify-center gap-2 rounded-2xl bg-[#149e61] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_14px_32px_rgba(20,158,97,0.24)] transition-colors hover:bg-[#108150]"
              >
                <MessageCircle className="h-4 w-4" />
                Entrar no grupo da Liga
              </a>
            )}
          </div>
        </section>
      )}

      {Boolean(processError) && (
        <div className="mt-8">
          <QueryError
            title="Não foi possível carregar os processos seletivos"
            error={processError}
            onRetry={retryProcesses}
            retrying={retryingProcesses}
          />
        </div>
      )}

      {loadingProcesses && <div className="dark-card mt-8 h-40 animate-pulse rounded-[32px]" />}

      {/* ── Hackathon — desativado, ver SHOW_HACKATHON ───────────── */}
      {SHOW_HACKATHON && (
        <>
          <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-4">
            <StatCard
              label="Status"
              icon={User}
              value={
                me?.has_team ? (
                  <span className="rounded-full bg-green-500/10 px-2 py-0.5 font-ui text-base font-medium text-green-700">
                    Em equipe
                  </span>
                ) : (
                  <span className="rounded-full bg-amber-500/10 px-2 py-0.5 font-ui text-base font-medium text-amber-700">
                    Sem equipe
                  </span>
                )
              }
            />
            <StatCard
              label="Equipes abertas"
              icon={Users}
              value={openTeamsQuery.isLoading ? '-' : `${openTeams.length} disponíveis`}
            />
            <StatCard
              label="Convites"
              icon={Mail}
              value={invitesQuery.isLoading ? '-' : invites.length === 0 ? 'Nenhum' : `${invites.length} novo${invites.length > 1 ? 's' : ''}`}
            />
            <StatCard
              label="Prazo"
              icon={Clock}
              value={daysLeft === 0 ? 'Encerrado' : `${daysLeft} dias`}
            />
          </div>

          {invites.length > 0 && (
            <section className="glass-panel mt-6 rounded-[32px] p-6">
              <h2 className="font-display text-base font-semibold text-ink">Convites pendentes</h2>
              <p className="mb-4 mt-1 text-sm text-ink/70">
                Você tem {invites.length} convite{invites.length > 1 ? 's' : ''} aguardando resposta
              </p>
              <ul className="divide-y divide-ink/10">
                {invites.map((invite) => (
                  <InviteListItem key={invite.id} invite={invite} />
                ))}
              </ul>
            </section>
          )}

          <div className="mt-6">
            {profileQuery.isLoading ? (
              <div className="dark-card h-40 animate-pulse rounded-[32px]" />
            ) : me?.has_team ? (
              <StatusBanner me={me} />
            ) : (
              <section className="purple-cta relative overflow-hidden rounded-[32px] p-8 text-white">
                <div className="relative">
                  <div className="mb-5 flex items-start justify-between gap-4">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/10">
                      <Users className="h-5 w-5 text-white" />
                    </div>
                    <div className="inline-flex items-center gap-1.5 rounded-full border border-white/18 bg-white/[0.12] px-3 py-1 text-xs font-semibold text-white">
                      <Clock className="h-3.5 w-3.5" />
                      {daysLeft > 0 ? `${daysLeft} dias restantes` : 'Prazo encerrado'}
                    </div>
                  </div>

                  <h2 className="font-display text-2xl font-semibold text-white">Você ainda não está em uma equipe</h2>
                  <p className="mt-2 max-w-md text-sm font-medium leading-relaxed text-white/80">
                    Monte sua equipe, convide membros e submeta antes do prazo.
                  </p>
                  <p className="mt-1 max-w-md text-sm font-semibold leading-relaxed text-white">
                    Equipes sem 4 membros ou não submetidas até {deadlineFmt} serão descartadas.
                  </p>

                  <div className="mt-6 grid gap-3 sm:flex sm:flex-wrap sm:items-center">
                    <Button className="w-full bg-black text-white hover:bg-brand sm:w-auto" onClick={() => setCreateModalOpen(true)}>
                      Criar equipe
                    </Button>
                    <Link
                      to="/teams"
                      className="inline-flex w-full items-center justify-center rounded-2xl border border-white/18 bg-white/[0.06] px-5 py-2.5 font-ui text-sm font-medium text-white transition-colors hover:bg-white/10 sm:w-auto"
                    >
                      Explorar equipes abertas
                    </Link>
                    {WHATSAPP_LINK !== '#' && (
                      <a
                        href={WHATSAPP_LINK}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#149e61] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_14px_32px_rgba(20,158,97,0.24)] transition-colors hover:bg-[#108150] sm:w-auto"
                      >
                        <MessageCircle className="h-4 w-4" />
                        Grupo WhatsApp
                      </a>
                    )}
                  </div>
                </div>
              </section>
            )}
          </div>

          {daysEvent > 0 && (
            <div className="dark-card mt-6 flex items-center gap-4 rounded-[21px] px-6 py-5">
              <Clock className="h-6 w-6 flex-shrink-0 text-brand-soft" />
              <div>
                <p className="kicker">Evento em</p>
                <p className="font-display text-lg font-semibold text-ink">{daysEvent} dias - 20 de junho de 2026</p>
              </div>
            </div>
          )}

          {createModalOpen && <CreateTeamModal onClose={() => setCreateModalOpen(false)} />}
        </>
      )}

      <div className="h-8" />
    </main>
  )
}
