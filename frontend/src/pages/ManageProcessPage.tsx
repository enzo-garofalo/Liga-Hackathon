import { ArrowLeft, Lock, Pencil, Send } from 'lucide-react'
import { useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { CandidatesTab } from '../components/CandidatesTab'
import { CommunicationsTab } from '../components/CommunicationsTab'
import { Header } from '../components/Header'
import { OpenApplicationsModal } from '../components/OpenApplicationsModal'
import { ProcessFormModal } from '../components/ProcessFormModal'
import { ProcessStats } from '../components/ProcessStats'
import { QueryError } from '../components/QueryError'
import { StagesTab } from '../components/StagesTab'
import { Button } from '../components/ui/Button'
import { useAdminProcess } from '../hooks/useAdminProcess'
import { useCloseProcess } from '../hooks/useAdminProcesses'
import { isNotFound } from '../utils/errors'

const TABS = [
  { key: 'candidates', label: 'Candidatos' },
  { key: 'stages', label: 'Etapas' },
  { key: 'communications', label: 'Comunicações' },
] as const

type TabKey = (typeof TABS)[number]['key']

function formatDate(iso: string | null) {
  return iso
    ? new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
    : '—'
}

export function ManageProcessPage() {
  const { id } = useParams<{ id: string }>()
  const [searchParams, setSearchParams] = useSearchParams()
  const processQuery = useAdminProcess(id)
  const closeProcess = useCloseProcess()
  const [editing, setEditing] = useState(false)
  const [publishing, setPublishing] = useState(false)

  const process = processQuery.data
  const tab = (searchParams.get('tab') as TabKey) ?? 'candidates'
  const setTab = (key: TabKey) => setSearchParams({ tab: key }, { replace: true })

  if (processQuery.isLoading) {
    return (
      <div className="min-h-screen app-shell text-ink">
        <Header admin />
        <main className="mx-auto max-w-6xl px-4 py-10">
          <div className="dark-card h-64 animate-pulse rounded-[32px]" />
        </main>
      </div>
    )
  }

  if (processQuery.isError && !isNotFound(processQuery.error)) {
    return (
      <div className="min-h-screen app-shell text-ink">
        <Header admin />
        <main className="mx-auto max-w-6xl px-4 py-10">
          <QueryError
            title="Não foi possível carregar o processo"
            error={processQuery.error}
            onRetry={() => processQuery.refetch()}
            retrying={processQuery.isFetching}
          />
        </main>
      </div>
    )
  }

  if (!process) {
    return (
      <div className="min-h-screen app-shell text-ink">
        <Header admin />
        <main className="mx-auto max-w-6xl px-4 py-10">
          <div className="glass-panel rounded-[32px] p-8 text-center">
            <h1 className="font-display text-xl font-semibold">Processo não encontrado</h1>
            <Link to="/admin/dashboard">
              <Button className="mt-5">Voltar ao painel</Button>
            </Link>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen app-shell text-ink">
      <Header admin />

      <main className="mx-auto max-w-6xl px-4 py-10">
        <Link
          to="/admin/dashboard"
          className="mb-4 inline-flex items-center gap-1.5 font-ui text-sm font-medium text-ink/65 transition-colors hover:text-brand"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </Link>

        <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl font-semibold text-ink">{process.name}</h1>
            <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-sm text-ink/70">
              <span>
                Inscrições:{' '}
                <span className="font-medium text-ink/85">
                  {process.status === 'published'
                    ? 'abertas'
                    : process.status === 'draft'
                      ? 'rascunho'
                      : 'encerrado'}
                </span>
              </span>
              <span>Publicado em: {formatDate(process.published_at)}</span>
              <span>Inscrições até: {formatDate(process.registration_end)}</span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {process.status !== 'closed' && (
              <Button variant="outlined" onClick={() => setEditing(true)}>
                <Pencil className="h-4 w-4" />
                Editar processo
              </Button>
            )}

            {process.status === 'draft' && (
              <Button onClick={() => setPublishing(true)}>
                <Send className="h-4 w-4" />
                Abrir inscrições
              </Button>
            )}

            {process.status === 'published' && (
              <Button
                variant="outlined"
                onClick={() => closeProcess.mutate(process.id)}
                loading={closeProcess.isPending}
              >
                <Lock className="h-4 w-4" />
                Encerrar processo
              </Button>
            )}
          </div>
        </div>

        {process.status === 'closed' && (
          <p className="mb-6 rounded-xl border border-ink/10 bg-ink/[0.04] px-4 py-2.5 text-sm text-ink/70">
            Processo encerrado: não aceita inscrições nem novas avaliações.
          </p>
        )}

        <ProcessStats stats={process.stats} />

        <div className="mb-6 mt-8 flex gap-8 border-b border-ink/10">
          {TABS.map((item) => (
            <button
              key={item.key}
              onClick={() => setTab(item.key)}
              className={`border-b-2 pb-3 font-ui text-sm transition-colors ${
                tab === item.key
                  ? 'border-brand font-medium text-brand'
                  : 'border-transparent text-ink/55 hover:text-ink'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {process.status === 'draft' && process.stages.length === 0 && (
          <p className="mb-6 rounded-xl border border-amber-400/40 bg-amber-500/10 px-4 py-2.5 text-sm text-amber-800">
            Este processo é um rascunho sem etapas. Configure ao menos uma etapa na aba
            "Etapas" para poder abrir as inscrições.
          </p>
        )}

        {tab === 'candidates' && <CandidatesTab process={process} />}
        {tab === 'stages' && <StagesTab processId={process.id} />}
        {tab === 'communications' && (
          <CommunicationsTab processId={process.id} stages={process.stages} />
        )}
      </main>

      {editing && (
        <ProcessFormModal process={process} onClose={() => setEditing(false)} />
      )}

      {publishing && (
        <OpenApplicationsModal process={process} onClose={() => setPublishing(false)} />
      )}
    </div>
  )
}
