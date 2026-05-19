import { useQuery } from '@tanstack/react-query'
import { Clock, Inbox, Mail, User, Users } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { getInfo } from '../api/info'
import { CreateTeamModal } from '../components/CreateTeamModal'
import { InviteListItem } from '../components/InviteListItem'
import { StatusBanner } from '../components/StatusBanner'
import { Button } from '../components/ui/Button'
import { useMyInvites } from '../hooks/useInvites'
import { useNotifications } from '../hooks/useNotifications'
import { useProfile } from '../hooks/useProfile'
import { useOpenTeams } from '../hooks/useTeams'
import type { Notification } from '../types/notification'

const WHATSAPP_LINK = (import.meta as unknown as { env: Record<string, string> }).env.VITE_WHATSAPP_LINK || '#'
const EVENT_DATE = new Date('2026-06-13T10:00:00')

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

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'agora'
  if (m < 60) return `${m}min`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h`
  return `${Math.floor(h / 24)}d`
}

function notifDotColor(type: Notification['type']) {
  if (['team_invite', 'join_request'].includes(type)) return 'bg-brand'
  if (['invite_accepted', 'join_accepted', 'team_approved'].includes(type)) return 'bg-green-400'
  if (['invite_declined', 'join_declined', 'team_rejected', 'team_disbanded'].includes(type)) return 'bg-red-400'
  return 'bg-ink/25'
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
      <Icon className="absolute right-4 top-4 h-8 w-8 text-brand/30" />
      <p className="kicker">{label}</p>
      <div className="mt-2 font-display text-lg font-semibold text-ink">{value}</div>
    </div>
  )
}

export function DashboardPage() {
  const profileQuery = useProfile()
  const notifQuery = useNotifications()
  const invitesQuery = useMyInvites()
  const openTeamsQuery = useOpenTeams()
  const infoQuery = useQuery({ queryKey: ['info'], queryFn: getInfo })

  const me = profileQuery.data
  const notifs = notifQuery.data ?? []
  const invites = invitesQuery.data ?? []
  const openTeams = openTeamsQuery.data ?? []
  const [createModalOpen, setCreateModalOpen] = useState(false)

  const recent = useMemo(
    () =>
      [...notifs]
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 5),
    [notifs],
  )

  const firstName = me?.full_name.split(' ')[0] ?? '...'
  const deadlineIso = infoQuery.data?.team_deadline ?? '2026-05-30'
  const deadlineDate = new Date(deadlineIso + 'T23:59:59')
  const daysLeft = daysUntil(deadlineDate)
  const deadlineFmt = infoQuery.data ? formatDatePtBR(deadlineIso) : deadlineIso
  const daysEvent = daysUntil(EVENT_DATE)

  return (
    <main className="px-4 py-6 text-ink md:px-8 md:py-8">
      <div className="purple-cta relative overflow-hidden rounded-[32px] p-8 text-panel">
        <div className="relative">
          <p className="mb-2 text-[0.68rem] uppercase tracking-[0.2em] text-white/42">Dashboard</p>
          <h1 className="font-display leading-tight">
            <span className="text-5xl font-light text-white/52">Olá, </span>
            <span className="text-5xl font-light text-white">{firstName}.</span>
          </h1>
          {me && (
            <p className="mt-2 text-sm text-white/46">
              {me.course} - {me.semester} semestre
            </p>
          )}
        </div>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4">
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
          <p className="mb-4 mt-1 text-xs text-ink/46">
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
                  <Users className="h-5 w-5 text-brand-soft" />
                </div>
                <div className="inline-flex items-center gap-1.5 rounded-full border border-white/12 bg-white/[0.07] px-3 py-1 text-xs font-medium text-white/72">
                  <Clock className="h-3.5 w-3.5" />
                  {daysLeft > 0 ? `${daysLeft} dias restantes` : 'Prazo encerrado'}
                </div>
              </div>

              <h2 className="font-display text-2xl font-semibold text-white">Você ainda não está em uma equipe</h2>
              <p className="mt-2 max-w-md text-sm leading-relaxed text-white/58">
                Monte sua equipe, convide membros e submeta antes do prazo.
              </p>
              <p className="mt-1 max-w-md text-sm font-medium leading-relaxed text-brand-soft">
                Equipes sem 4 membros ou não submetidas até {deadlineFmt} serão descartadas.
              </p>

              <div className="mt-6 flex flex-wrap items-center gap-3">
                <Button className="bg-black text-white hover:bg-brand" onClick={() => setCreateModalOpen(true)}>Criar equipe</Button>
                <Link to="/teams">
                  <Button variant="outlined" className="border-white/18 bg-white/[0.06] text-white hover:bg-white/10 hover:text-white">Explorar equipes abertas</Button>
                </Link>
                {WHATSAPP_LINK !== '#' && (
                  <a
                    href={WHATSAPP_LINK}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center rounded-2xl border border-green-700/20 px-4 py-2.5 text-sm font-medium text-green-700 transition-colors hover:bg-green-500/10"
                  >
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
            <p className="font-display text-lg font-semibold text-ink">{daysEvent} dias - 13 de junho de 2026</p>
          </div>
        </div>
      )}

      <section id="notificacoes" className="mt-8">
        <h2 className="mb-4 font-display text-base font-semibold text-ink">Notificações recentes</h2>
        <div className="glass-panel overflow-hidden rounded-[32px]">
          {notifQuery.isLoading ? (
            <div className="space-y-3 p-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-10 animate-pulse rounded-lg bg-ink/[0.06]" />
              ))}
            </div>
          ) : recent.length === 0 ? (
            <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
              <Inbox className="mb-3 h-10 w-10 text-ink/20" />
              <p className="text-sm text-ink/46">Nenhuma atividade recente</p>
            </div>
          ) : (
            <ul className="divide-y divide-ink/10">
              {recent.map((notification) => (
                <li
                  key={notification.id}
                  className={`flex items-center gap-3 px-5 py-3.5 ${!notification.read ? 'bg-brand/[0.08]' : ''}`}
                >
                  <div className={`h-2 w-2 flex-shrink-0 rounded-full ${notifDotColor(notification.type)}`} />
                  <p className="flex-1 text-sm text-ink/78">{notification.message}</p>
                  <span className="flex-shrink-0 text-xs text-ink/42">{timeAgo(notification.created_at)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <div className="h-8" />

      {createModalOpen && <CreateTeamModal onClose={() => setCreateModalOpen(false)} />}
    </main>
  )
}
