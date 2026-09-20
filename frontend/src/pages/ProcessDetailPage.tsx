import { ArrowLeft, CalendarDays, CheckCircle2, Layers } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { QueryError } from '../components/QueryError'
import { Button } from '../components/ui/Button'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { useApplyToProcess, useProcess, useWithdrawFromProcess } from '../hooks/useProcess'
import { getApiError, isNotFound } from '../utils/errors'

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

export function ProcessDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const processQuery = useProcess(id)
  const apply = useApplyToProcess(id)
  const withdraw = useWithdrawFromProcess(id)
  const [confirmandoSaida, setConfirmandoSaida] = useState(false)

  const process = processQuery.data

  if (processQuery.isLoading) {
    return (
      <main className="px-4 py-6 md:px-8 md:py-8">
        <div className="dark-card h-64 animate-pulse rounded-[32px]" />
      </main>
    )
  }

  // Falha que nao e 404: servidor fora, rede caiu. Dizer "nao encontrado" aqui
  // faria o candidato achar que o processo acabou.
  if (processQuery.isError && !isNotFound(processQuery.error)) {
    return (
      <main className="px-4 py-6 text-ink md:px-8 md:py-8">
        <QueryError
          title="Não foi possível carregar o processo"
          error={processQuery.error}
          onRetry={() => processQuery.refetch()}
          retrying={processQuery.isFetching}
        />
      </main>
    )
  }

  if (!process) {
    return (
      <main className="px-4 py-6 text-ink md:px-8 md:py-8">
        <div className="glass-panel rounded-[32px] p-8 text-center">
          <h1 className="font-display text-xl font-semibold">Processo não encontrado</h1>
          <p className="mt-2 text-sm text-ink/70">
            Ele pode ter sido encerrado ou ainda não estar publicado.
          </p>
          <Button className="mt-5" onClick={() => navigate('/dashboard')}>
            Voltar ao dashboard
          </Button>
        </div>
      </main>
    )
  }

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
          <p className="mb-2 text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-white/72">
            Processo Seletivo
          </p>
          <h1 className="font-display text-4xl font-light leading-tight text-white">
            {process.name}
          </h1>

          <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-3 text-sm text-white/78">
            <span className="inline-flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-brand-soft" />
              {formatDate(process.registration_start)} a {formatDate(process.registration_end)}
            </span>
            <span className="inline-flex items-center gap-2">
              <Layers className="h-4 w-4 text-brand-soft" />
              {process.stage_count} etapa{process.stage_count === 1 ? '' : 's'}
            </span>
            <span
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${
                process.registration_open
                  ? 'border-white/20 bg-white/[0.12] text-white'
                  : 'border-white/10 bg-white/[0.06] text-white/60'
              }`}
            >
              {process.registration_open
                ? `Inscrições abertas até ${formatDate(process.registration_end)}`
                : 'Inscrições encerradas'}
            </span>
          </div>
        </div>
      </div>

      <section className="glass-panel mt-6 rounded-[32px] p-8">
        <h2 className="font-display text-xl font-semibold text-ink">Sobre o processo</h2>
        <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-ink/75">
          {process.description || 'Descrição em breve.'}
        </p>

        {process.stages.length > 0 && (
          <div className="mt-8">
            <p className="kicker">Etapas</p>
            <ol className="mt-3 grid gap-3 sm:grid-cols-2">
              {process.stages.map((stage) => (
                <li
                  key={stage.id}
                  className="rounded-[21px] border border-ink/10 bg-ink/[0.02] p-4"
                >
                  <div className="flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand/15 font-display text-xs font-semibold text-brand">
                      {stage.order}
                    </span>
                    <h3 className="font-display text-sm font-semibold text-ink">
                      {stage.name}
                    </h3>
                  </div>
                  {stage.description && (
                    <p className="mt-2 text-xs leading-relaxed text-ink/68">
                      {stage.description}
                    </p>
                  )}
                </li>
              ))}
            </ol>
          </div>
        )}
      </section>

      <div className="mt-6 flex flex-col items-center gap-3">
        {process.already_applied ? (
          <>
            <div className="inline-flex items-center gap-2 rounded-2xl border border-brand-green/25 bg-brand-green/10 px-5 py-3 font-ui text-sm font-medium text-brand-green">
              <CheckCircle2 className="h-4 w-4" />
              Você já está inscrito neste processo
            </div>
            {/* Só enquanto o prazo está aberto. Fechado, cancelar deixa de ser
                assunto da plataforma e a opção some em vez de aparecer
                desabilitada: botão morto na tela só gera tentativa e dúvida. */}
            {process.registration_open && (
              <button
                type="button"
                onClick={() => setConfirmandoSaida(true)}
                className="font-ui text-sm font-medium text-ink/60 underline underline-offset-4 transition-colors hover:text-red-600"
              >
                Cancelar minha inscrição
              </button>
            )}
          </>
        ) : (
          <Button
            onClick={() => apply.mutate()}
            loading={apply.isPending}
            disabled={!process.registration_open}
            // Grande de propósito: é a ação que a pessoa veio fazer nesta tela,
            // e antes ela se perdia no rodapé com o tamanho de um botão comum.
            className="h-16 w-full max-w-md rounded-full px-12 font-display text-lg font-semibold shadow-[0_18px_40px_rgba(113,50,245,0.28)]"
          >
            {process.registration_open ? 'Inscrever-se' : 'Inscrições encerradas'}
          </Button>
        )}

        {apply.isError && (
          <p className="rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-2 text-sm font-medium text-red-600">
            {getApiError(apply.error)}
          </p>
        )}

        {withdraw.isError && (
          <p className="rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-2 text-sm font-medium text-red-600">
            {getApiError(withdraw.error)}
          </p>
        )}
      </div>

      {confirmandoSaida && (
        <ConfirmDialog
          title="Cancelar inscrição"
          question={`Tem certeza que quer cancelar sua inscrição no ${process.name}?`}
          detail={`Você sai da lista de inscritos. Dá para se inscrever de novo até ${formatDate(process.registration_end)}, quando as inscrições encerram. Depois disso não é mais possível.`}
          confirmLabel="Cancelar inscrição"
          tone="danger"
          loading={withdraw.isPending}
          onConfirm={() =>
            withdraw.mutate(undefined, { onSuccess: () => setConfirmandoSaida(false) })
          }
          onCancel={() => setConfirmandoSaida(false)}
        />
      )}

      <div className="h-8" />
    </main>
  )
}
