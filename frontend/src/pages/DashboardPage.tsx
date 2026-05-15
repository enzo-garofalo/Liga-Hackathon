import { Header } from '../components/Header'
import { StatusBanner } from '../components/StatusBanner'
import { useProfile } from '../hooks/useProfile'

export function DashboardPage() {
  const meQuery = useProfile()
  const me = meQuery.data

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
            <StatusBanner me={me} />
          </>
        )}
      </main>
    </div>
  )
}
