import { Header } from '../components/Header'
import { InviteListItem } from '../components/InviteListItem'
import { StatusBanner } from '../components/StatusBanner'
import { useMyInvites } from '../hooks/useInvites'
import { useProfile } from '../hooks/useProfile'

export function DashboardPage() {
  const meQuery = useProfile()
  const invitesQuery = useMyInvites()
  const me = meQuery.data
  const invites = invitesQuery.data ?? []

  return (
    <div className="min-h-screen bg-gray-50">
      <Header me={me} />
      <main className="max-w-5xl mx-auto px-4 py-10 space-y-6">
        {meQuery.isLoading && (
          <p className="font-ui text-silver-blue">Carregando perfil...</p>
        )}
        {me && (
          <>
            <div>
              <h1 className="font-display text-3xl font-semibold text-near-black">
                Olá, {me.full_name.split(' ')[0]}.
              </h1>
              <p className="text-sm text-silver-blue font-ui">
                {me.course} · {me.semester}º semestre
              </p>
            </div>
            {invites.length > 0 && (
              <section className="bg-white rounded-2xl border border-[#dedee5] shadow-whisper p-6">
                <h2 className="font-display text-lg font-semibold text-near-black mb-2">
                  Convites pendentes
                </h2>
                <ul className="divide-y divide-[#dedee5]">
                  {invites.map((inv) => (
                    <InviteListItem key={inv.id} invite={inv} />
                  ))}
                </ul>
              </section>
            )}
            <StatusBanner me={me} />
          </>
        )}
      </main>
    </div>
  )
}
