import { useQuery } from '@tanstack/react-query'
import { getInfo } from '../api/info'
import { Header } from '../components/Header'
import { useMe } from '../hooks/useAuth'

export function InfoPage() {
  const meQuery = useMe()
  const infoQuery = useQuery({ queryKey: ['info'], queryFn: getInfo })

  return (
    <div className="min-h-screen bg-gray-50">
      <Header me={meQuery.data} />
      <main className="max-w-3xl mx-auto px-4 py-12">
        <h1 className="font-display text-3xl font-semibold text-near-black mb-6">
          Sobre o Hackathon
        </h1>
        {infoQuery.isLoading && <p className="font-ui text-silver-blue">Carregando...</p>}
        {infoQuery.isError && (
          <p className="font-ui text-red-500">Não foi possível carregar as informações.</p>
        )}
        {infoQuery.data && (
          <article className="bg-white rounded-2xl border border-[#dedee5] shadow-whisper p-8">
            <p className="font-ui text-near-black whitespace-pre-wrap">
              {infoQuery.data.content || 'Conteúdo em breve.'}
            </p>
            <p className="mt-6 text-xs text-silver-blue font-ui">
              Inscrições encerram em{' '}
              <strong>
                {new Date(infoQuery.data.team_deadline).toLocaleDateString('pt-BR')}
              </strong>
              .
            </p>
          </article>
        )}
      </main>
    </div>
  )
}
