import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { User, Users, Mail, Clock, Inbox, ChevronRight } from 'lucide-react'
import { Button } from '../components/ui/Button'
import { CreateTeamModal } from '../components/CreateTeamModal'
import { InviteListItem } from '../components/InviteListItem'
import { StatusBanner } from '../components/StatusBanner'
import { useMyInvites } from '../hooks/useInvites'
import { useNotifications } from '../hooks/useNotifications'
import { useProfile } from '../hooks/useProfile'
import { useOpenTeams } from '../hooks/useTeams'
import type { Notification } from '../types/notification'

const WHATSAPP_LINK = (import.meta as unknown as { env: Record<string, string> }).env.VITE_WHATSAPP_LINK || '#'
const DEADLINE   = new Date('2026-05-30T23:59:59')
const EVENT_DATE = new Date('2026-06-13T10:00:00')

function daysUntil(date: Date) {
  return Math.max(0, Math.ceil((date.getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
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

  const firstName = me?.full_name.split(' ')[0] ?? '...'
  const daysLeft  = daysUntil(DEADLINE)
  const daysEvent = daysUntil(EVENT_DATE)

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
            <div className="bg-gradient-to-r from-[#7132f5]/5 to-transparent border border-[#7132f5]/20 rounded-2xl p-8">
              <Users className="w-12 h-12 text-[#7132f5]/40 mb-4" />
              <h2 className="font-display font-semibold text-xl text-[#101114]">
                Você ainda não está em uma equipe
              </h2>
              <p className="text-sm text-[#686b82] font-ui mt-2 max-w-md">
                Crie a sua equipe ou explore equipes abertas que estão procurando membros.
                O prazo para formação é {daysLeft > 0 ? `em ${daysLeft} dias` : 'hoje'}.
              </p>
              <div className="flex items-center gap-3 mt-6 flex-wrap">
                <Button variant="primary" onClick={() => setCreateModalOpen(true)}>
                  Criar equipe
                </Button>
                <Link to="/teams">
                  <Button variant="outlined">Explorar equipes abertas</Button>
                </Link>
              </div>
              <a
                href={WHATSAPP_LINK}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block mt-4 text-sm text-[#7132f5] hover:underline font-ui"
              >
                Não tem equipe? Entre no grupo do WhatsApp →
              </a>
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
          <h2 className="font-display font-semibold text-base text-[#101114]">Atividade recente</h2>
          <Link to="/dashboard#notificacoes" className="text-sm font-ui text-[#7132f5] hover:underline flex items-center gap-1">
            Ver todas <ChevronRight className="w-3.5 h-3.5" />
          </Link>
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
