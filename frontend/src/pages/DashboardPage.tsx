import { Clock, Inbox, Mail, User, Users } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { CreateTeamModal } from '../components/CreateTeamModal'
import { InviteListItem } from '../components/InviteListItem'
import { StatusBanner } from '../components/StatusBanner'
import { Button } from '../components/ui/Button'
import { getInfo } from '../api/info'
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
    day: 'numeric', month: 'long', year: 'numeric',
  })
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'agora'
  if (m < 60) return `há ${m}min`
  const h = Math.floor(m / 60)
  if (h < 24) return `há ${h}h`
  return `há ${Math.floor(h / 24)}d`
}

function notifDotColor(type: Notification['type']) {
  if (['team_invite', 'join_request'].includes(type)) return 'bg-[#7132f5]'
  if (['invite_accepted', 'join_accepted', 'team_approved'].includes(type)) return 'bg-green-500'
  if (['invite_declined', 'join_declined', 'team_rejected', 'team_disbanded'].includes(type)) return 'bg-red-400'
  return 'bg-[#dedee5]'
}

function StatCard({
  label, value, icon: Icon,
}: { label: string; value: React.ReactNode; icon: React.ElementType }) {
  return (
    <div className="relative bg-white border border-[#dedee5] rounded-xl p-4 hover:shadow-md transition-shadow overflow-hidden">
      <Icon className="absolute top-4 right-4 w-8 h-8 text-[#7132f5]/20" />
      <p className="text-xs text-[#9497a9] uppercase tracking-wider font-ui">{label}</p>
      <div className="font-display font-semibold text-lg mt-1 text-[#101114]">{value}</div>
    </div>
  )
}

export function DashboardPage() {
  const profileQuery   = useProfile()
  const notifQuery     = useNotifications()
  const invitesQuery   = useMyInvites()
  const openTeamsQuery = useOpenTeams()
  const infoQuery      = useQuery({ queryKey: ['info'], queryFn: getInfo })

  const me        = profileQuery.data
  const notifs    = notifQuery.data ?? []
  const invites   = invitesQuery.data ?? []
  const openTeams = openTeamsQuery.data ?? []

  const recent = useMemo(() =>
    [...notifs]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 5),
    [notifs],
  )

  const firstName    = me?.full_name.split(' ')[0] ?? '...'
  const deadlineIso  = infoQuery.data?.team_deadline ?? '2026-05-30'
  const deadlineDate = new Date(deadlineIso + 'T23:59:59')
  const daysLeft     = daysUntil(deadlineDate)
  const deadlineFmt  = infoQuery.data ? formatDatePtBR(deadlineIso) : deadlineIso
  const daysEvent    = daysUntil(EVENT_DATE)

  const [createModalOpen, setCreateModalOpen] = useState(false)

  return (
    <main className="px-4 py-6 md:px-8 md:py-8">
      {/* Greeting */}
      <div>
        <p className="text-xs text-[#9497a9] font-ui uppercase tracking-widest mb-1">Dashboard</p>
        <h1 className="font-display leading-tight">
          <span className="text-3xl font-light text-[#9497a9]">Olá, </span>
          <span className="text-3xl font-semibold text-[#101114]">{firstName}.</span>
        </h1>
        {me && (
          <p className="text-sm text-[#9497a9] font-ui mt-1">
            {me.course} · {me.semester}º semestre
          </p>
        )}
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
        <StatCard
          label="Status"
          icon={User}
          value={
            me?.has_team
              ? <span className="text-base bg-green-50 text-green-600 px-2 py-0.5 rounded-full font-ui font-medium">Em equipe</span>
              : <span className="text-base bg-amber-50 text-amber-600 px-2 py-0.5 rounded-full font-ui font-medium">Sem equipe</span>
          }
        />
        <StatCard
          label="Equipes abertas"
          icon={Users}
          value={openTeamsQuery.isLoading ? '—' : `${openTeams.length} disponíveis`}
        />
        <StatCard
          label="Convites pendentes"
          icon={Mail}
          value={
            invitesQuery.isLoading ? '—'
              : invites.length === 0 ? 'Nenhum'
              : `${invites.length} novo${invites.length > 1 ? 's' : ''}`
          }
        />
        <StatCard
          label="Prazo para equipes"
          icon={Clock}
          value={daysLeft === 0 ? 'Encerrado' : `${daysLeft} dias`}
        />
      </div>

      {/* Pending invites */}
      {invites.length > 0 && (
        <section className="mt-6 bg-white border border-[#dedee5] rounded-2xl p-6">
          <h2 className="font-display font-semibold text-base text-[#101114] mb-1">Convites pendentes</h2>
          <p className="text-xs text-[#9497a9] font-ui mb-4">
            Você tem {invites.length} convite{invites.length > 1 ? 's' : ''} aguardando resposta
          </p>
          <ul className="divide-y divide-[#dedee5]">
            {invites.map(inv => (
              <InviteListItem key={inv.id} invite={inv} />
            ))}
          </ul>
        </section>
      )}

      {/* Team status */}
      <div className="mt-6">
        {profileQuery.isLoading ? (
          <div className="h-40 bg-white border border-[#dedee5] rounded-2xl animate-pulse" />
        ) : me ? (
          me.has_team ? (
            <StatusBanner me={me} />
          ) : (
            <div className="relative overflow-hidden bg-white border border-[#dedee5] rounded-2xl p-8">
              {/* Decorative background accent */}
              <div className="absolute inset-0 bg-gradient-to-br from-[#7132f5]/[0.04] via-transparent to-amber-50/40 pointer-events-none" />
              <div className="absolute -top-8 -right-8 w-40 h-40 rounded-full bg-[#7132f5]/[0.06] blur-2xl pointer-events-none" />

              <div className="relative">
                {/* Icon + urgency badge row */}
                <div className="flex items-start justify-between mb-5">
                  <div className="w-11 h-11 rounded-xl bg-[#7132f5]/10 flex items-center justify-center">
                    <Users className="w-5 h-5 text-[#7132f5]" />
                  </div>
                  <div className="w-fit inline-flex items-center gap-1.5 bg-amber-50 border border-amber-200 text-amber-700 rounded-full px-3 py-1 text-xs font-ui font-medium">
                    <Clock className="w-3.5 h-3.5 flex-shrink-0" />
                    {daysLeft > 0 ? `${daysLeft} dias restantes` : 'Prazo encerrado'}
                  </div>
                </div>

                <h2 className="font-display font-bold text-xl text-[#101114]">
                  Você ainda não está em uma equipe
                </h2>
                <p className="text-sm font-ui text-gray-600 mt-2 max-w-md leading-relaxed">
                  Monte sua equipe, convide membros e submeta antes do prazo.
                </p>
                <p className="text-sm font-ui text-amber-600 font-medium mt-1 max-w-md leading-relaxed">
                  Equipes sem 4 membros ou não submetidas até {deadlineFmt} serão descartadas.
                </p>

                <div className="flex items-center justify-between gap-3 mt-6 flex-wrap">
                  <div className="flex items-center gap-3 flex-wrap">
                    <Button variant="primary" onClick={() => setCreateModalOpen(true)}>
                      Criar equipe
                    </Button>
                    <Link to="/teams">
                      <Button variant="outlined">Explorar equipes abertas</Button>
                    </Link>
                  </div>
                  {WHATSAPP_LINK && WHATSAPP_LINK !== '#' && (
                    <a
                      href={WHATSAPP_LINK}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 border border-green-300 text-green-700 hover:bg-green-50 rounded-xl px-4 py-2.5 text-sm font-medium font-ui transition-colors"
                    >
                      <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current flex-shrink-0" xmlns="http://www.w3.org/2000/svg">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                        <path d="M12 0C5.373 0 0 5.373 0 12c0 2.126.554 4.122 1.523 5.854L.057 23.629a.75.75 0 0 0 .921.921l5.777-1.466A11.943 11.943 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.907 0-3.693-.504-5.23-1.387l-.374-.214-3.88.984.999-3.768-.232-.382A10 10 0 0 1 2 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/>
                      </svg>
                      Não tem equipe? Entre no grupo
                    </a>
                  )}
                </div>

              </div>
            </div>
          )
        ) : null}
      </div>

      {/* Event countdown */}
      {daysEvent > 0 && (
        <div className="mt-6 bg-[#101114] rounded-2xl px-6 py-5 flex items-center gap-4">
          <Clock className="w-6 h-6 text-[#7132f5] flex-shrink-0" />
          <div>
            <p className="text-xs text-white/40 font-ui uppercase tracking-wider">Evento em</p>
            <p className="font-display font-semibold text-white text-lg">{daysEvent} dias — 13 de junho de 2026</p>
          </div>
        </div>
      )}

      {/* Recent activity */}
      <section id="notificacoes" className="mt-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display font-semibold text-base text-[#101114]">Notificações recentes</h2>
        </div>
        <div className="bg-white border border-[#dedee5] rounded-2xl overflow-hidden">
          {notifQuery.isLoading ? (
            <div className="p-6 space-y-3">
              {[1, 2, 3].map(i => <div key={i} className="h-10 bg-gray-50 rounded-lg animate-pulse" />)}
            </div>
          ) : recent.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center px-6">
              <Inbox className="w-10 h-10 text-[#dedee5] mb-3" />
              <p className="font-ui text-sm text-[#9497a9]">Nenhuma atividade recente</p>
            </div>
          ) : (
            <ul className="divide-y divide-[#dedee5]">
              {recent.map(n => (
                <li key={n.id} className={`flex items-center gap-3 px-5 py-3.5 ${!n.read ? 'bg-[#7132f5]/[0.02]' : ''}`}>
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${notifDotColor(n.type)}`} />
                  <p className="font-ui text-sm text-[#101114] flex-1">{n.message}</p>
                  <span className="text-xs text-[#9497a9] font-ui flex-shrink-0">{timeAgo(n.created_at)}</span>
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
