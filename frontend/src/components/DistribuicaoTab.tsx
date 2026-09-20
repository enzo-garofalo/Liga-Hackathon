import { UserCog, Wand2 } from 'lucide-react'
import { useState } from 'react'
import {
  useAssignmentBoard,
  useAutoDistribute,
  useSetEvaluators,
} from '../hooks/useProcessOrganizers'
import type { AdminProcessDetail } from '../types/adminProcess'
import type { BoardCandidate, BoardStage, ProcessOrganizer } from '../types/organizer'
import { getApiError } from '../utils/errors'
import { QueryError } from './QueryError'
import { Button } from './ui/Button'
import { Modal } from './ui/Modal'

/**
 * Distribuir correções.
 *
 * A tela começa mostrando gente: quem está em cada fase e quem corrige cada um.
 * A versão anterior pedia etapa e número antes de mostrar um candidato, o que
 * obrigava o coordenador a distribuir no escuro.
 *
 * Dois caminhos, porque são duas perguntas diferentes: repartir uma fase
 * inteira entre a comissão (automático), e decidir quem pega uma pessoa
 * específica (manual, candidato a candidato).
 */
export function DistribuicaoTab({
  process,
  membros,
}: {
  process: AdminProcessDetail
  membros: ProcessOrganizer[]
}) {
  const quadro = useAssignmentBoard(process.id)
  const [manual, setManual] = useState<
    { stage: BoardStage; candidato: BoardCandidate } | null
  >(null)
  const [automatico, setAutomatico] = useState<BoardStage | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)

  if (quadro.isError) {
    return (
      <QueryError
        title="Não foi possível carregar a distribuição"
        error={quadro.error}
        onRetry={() => quadro.refetch()}
        retrying={quadro.isFetching}
      />
    )
  }

  const nomeDe = (userId: number) => {
    const membro = membros.find((item) => item.user_id === userId)
    return membro?.full_name || membro?.email || 'Organizador'
  }

  return (
    <section className="space-y-4 border-t border-ink/10 pt-8">
      <div>
        <h2 className="font-display text-lg font-semibold text-ink">
          Distribuir correções
        </h2>
        <p className="mt-1 font-ui text-sm text-ink/60">
          Cada avaliador vê apenas os candidatos que couberam a ele. Você pode
          repartir uma fase inteira de uma vez, ou escolher pessoa por pessoa.
        </p>
      </div>

      {erro && (
        <p className="rounded-xl border border-red-400/30 bg-red-500/10 px-3 py-2 font-ui text-sm font-medium text-red-600">
          {erro}
        </p>
      )}
      {aviso && (
        <p className="rounded-xl border border-brand/30 bg-brand/[0.06] px-3 py-2 font-ui text-sm font-medium text-brand">
          {aviso}
        </p>
      )}

      {quadro.isLoading ? (
        <div className="h-64 animate-pulse rounded-2xl bg-ink/5" />
      ) : (
        <div className="space-y-6">
          {quadro.data?.stages.map((stage) => (
            <div
              key={stage.id}
              className="overflow-hidden rounded-2xl border border-ink/10"
            >
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ink/10 bg-ink/[0.03] px-4 py-3">
                <div>
                  <p className="font-ui text-sm font-semibold text-ink">
                    {stage.order}. {stage.name}
                  </p>
                  <p className="font-ui text-xs text-ink/55">
                    {stage.candidates.length} candidato
                    {stage.candidates.length === 1 ? '' : 's'} nesta fase
                    {stage.anonymous_evaluation ? ' · correção anônima' : ''}
                  </p>
                </div>

                {stage.candidates.length > 0 && (
                  <Button
                    variant="outlined"
                    onClick={() => {
                      setErro(null)
                      setAviso(null)
                      setAutomatico(stage)
                    }}
                  >
                    <Wand2 className="h-4 w-4" />
                    Distribuir automaticamente
                  </Button>
                )}
              </div>

              {stage.candidates.length === 0 ? (
                <p className="px-4 py-6 text-center font-ui text-sm text-ink/55">
                  Ninguém nesta fase agora.
                </p>
              ) : (
                <ul className="divide-y divide-ink/10">
                  {stage.candidates.map((candidato) => (
                    <li
                      key={candidato.application}
                      className="flex flex-wrap items-center gap-3 px-4 py-3"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-ui text-sm font-medium text-ink">
                          {candidato.name}
                        </p>
                        <p className="truncate font-ui text-xs text-ink/55">
                          {candidato.code}
                          {candidato.status !== 'in_progress'
                            ? ` · ${rotuloDoStatus(candidato.status)}`
                            : ''}
                        </p>
                      </div>

                      <p className="font-ui text-xs text-ink/60">
                        {candidato.evaluators.length === 0
                          ? 'Sem avaliador'
                          : candidato.evaluators.map(nomeDe).join(', ')}
                      </p>

                      <button
                        type="button"
                        onClick={() => {
                          setErro(null)
                          setAviso(null)
                          setManual({ stage, candidato })
                        }}
                        className="font-ui text-xs text-ink/60 underline underline-offset-4 transition-colors hover:text-brand"
                      >
                        <UserCog className="mr-1 inline h-3.5 w-3.5" />
                        Escolher avaliadores
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      )}

      {manual && (
        <EscolherAvaliadores
          process={process}
          membros={membros}
          stage={manual.stage}
          candidato={manual.candidato}
          onClose={() => setManual(null)}
          onErro={setErro}
          onAviso={setAviso}
        />
      )}

      {automatico && (
        <DistribuirFase
          stage={automatico}
          membros={membros}
          onClose={() => setAutomatico(null)}
          onErro={setErro}
          onAviso={setAviso}
        />
      )}
    </section>
  )
}

function rotuloDoStatus(status: string) {
  if (status === 'approved') return 'aprovado'
  if (status === 'rejected') return 'reprovado'
  if (status === 'discarded') return 'descartado'
  return status
}

// ── Escolher avaliadores de um candidato ──────────────────────────

function EscolherAvaliadores({
  process,
  membros,
  stage,
  candidato,
  onClose,
  onErro,
  onAviso,
}: {
  process: AdminProcessDetail
  membros: ProcessOrganizer[]
  stage: BoardStage
  candidato: BoardCandidate
  onClose: () => void
  onErro: (mensagem: string | null) => void
  onAviso: (mensagem: string | null) => void
}) {
  // Já vem marcado quem corrige este candidato nesta fase: o modal mostra o
  // estado atual e o coordenador ajusta, em vez de montar tudo de novo.
  const [escolhidos, setEscolhidos] = useState<number[]>(candidato.evaluators)
  const [etapas, setEtapas] = useState<string[]>([stage.id])
  const salvar = useSetEvaluators(process.id)

  const todasAsEtapas = process.stages.map((item) => item.id)
  const todas = etapas.length === todasAsEtapas.length

  const alternarAvaliador = (userId: number) =>
    setEscolhidos((atual) =>
      atual.includes(userId)
        ? atual.filter((item) => item !== userId)
        : [...atual, userId],
    )

  const alternarEtapa = (stageId: string) =>
    setEtapas((atual) =>
      atual.includes(stageId)
        ? atual.filter((item) => item !== stageId)
        : [...atual, stageId],
    )

  const aplicar = () => {
    onErro(null)
    salvar.mutate(
      {
        application: candidato.application,
        evaluators: escolhidos,
        stages: etapas,
      },
      {
        onSuccess: () => {
          onAviso(
            escolhidos.length === 0
              ? `${candidato.name} ficou sem avaliador em ${etapas.length} etapa${etapas.length === 1 ? '' : 's'}.`
              : `${candidato.name}: ${escolhidos.length} avaliador${escolhidos.length === 1 ? '' : 'es'} em ${etapas.length} etapa${etapas.length === 1 ? '' : 's'}.`,
          )
          onClose()
        },
        onError: (e) => {
          onErro(getApiError(e))
          onClose()
        },
      },
    )
  }

  return (
    <Modal
      title={`Avaliadores de ${candidato.name}`}
      subtitle={candidato.code}
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={aplicar} loading={salvar.isPending} disabled={etapas.length === 0}>
            Salvar
          </Button>
        </>
      }
    >
      <div className="space-y-6">
        <fieldset>
          <legend className="mb-2 font-ui text-sm font-medium text-ink/80">
            Quem corrige
          </legend>
          {membros.length === 0 ? (
            <p className="font-ui text-sm text-ink/60">
              Ninguém no processo ainda. Chame alguém na lista acima.
            </p>
          ) : (
            <div className="space-y-2">
              {membros.map((membro) => (
                <label
                  key={membro.id}
                  className="flex items-center gap-2 font-ui text-sm text-ink"
                >
                  <input
                    type="checkbox"
                    checked={escolhidos.includes(membro.user_id)}
                    onChange={() => alternarAvaliador(membro.user_id)}
                    className="h-4 w-4 accent-brand"
                  />
                  {membro.full_name || membro.email}
                  {membro.is_coordinator && (
                    <span className="font-ui text-xs text-ink/50">(coordenação)</span>
                  )}
                </label>
              ))}
            </div>
          )}
        </fieldset>

        <fieldset className="border-t border-ink/10 pt-4">
          <legend className="mb-2 font-ui text-sm font-medium text-ink/80">
            Em quais etapas
          </legend>
          <p className="mb-2 font-ui text-xs text-ink/55">
            Marcar uma etapa futura é adiantar trabalho: a designação já fica
            pronta para quando o candidato chegar lá.
          </p>

          <label className="flex items-center gap-2 font-ui text-sm font-medium text-ink">
            <input
              type="checkbox"
              checked={todas}
              onChange={() => setEtapas(todas ? [stage.id] : todasAsEtapas)}
              className="h-4 w-4 accent-brand"
            />
            Todas as etapas
          </label>

          <div className="mt-2 space-y-2 border-l border-ink/10 pl-4">
            {process.stages.map((item) => (
              <label
                key={item.id}
                className="flex items-center gap-2 font-ui text-sm text-ink"
              >
                <input
                  type="checkbox"
                  checked={etapas.includes(item.id)}
                  onChange={() => alternarEtapa(item.id)}
                  className="h-4 w-4 accent-brand"
                />
                {item.order}. {item.name}
              </label>
            ))}
          </div>

          {etapas.length === 0 && (
            <p className="mt-2 font-ui text-sm text-ink/60">
              Marque ao menos uma etapa.
            </p>
          )}
        </fieldset>

        <p className="rounded-xl border border-ink/10 bg-ink/[0.03] px-3 py-2 font-ui text-xs text-ink/60">
          Salvar substitui quem estava nas etapas marcadas. As notas já dadas
          ficam guardadas e voltam a valer se a pessoa for designada de novo.
        </p>
      </div>
    </Modal>
  )
}

// ── Repartir uma fase inteira ─────────────────────────────────────

function DistribuirFase({
  stage,
  membros,
  onClose,
  onErro,
  onAviso,
}: {
  stage: BoardStage
  membros: ProcessOrganizer[]
  onClose: () => void
  onErro: (mensagem: string | null) => void
  onAviso: (mensagem: string | null) => void
}) {
  // A coordenação entra desmarcada: ela aparece na lista porque coordena todo
  // processo, e marcar por padrão poria conta de superusuário no rodízio.
  const [escolhidos, setEscolhidos] = useState<number[]>(
    membros.filter((membro) => !membro.is_coordinator).map((m) => m.user_id),
  )
  const [porCandidato, setPorCandidato] = useState(2)
  const distribuir = useAutoDistribute(stage.id)

  const emAndamento = stage.candidates.filter((c) => c.status === 'in_progress')
  const jaTem = stage.candidates.some((c) => c.evaluators.length > 0)

  const alternar = (userId: number) =>
    setEscolhidos((atual) =>
      atual.includes(userId)
        ? atual.filter((item) => item !== userId)
        : [...atual, userId],
    )

  const aplicar = () => {
    onErro(null)
    distribuir.mutate(
      {
        // Na ordem da lista, e não na ordem em que foram clicados: o rodízio
        // depende da ordem, então distribuir duas vezes dá o mesmo resultado.
        evaluators: membros
          .map((membro) => membro.user_id)
          .filter((id) => escolhidos.includes(id)),
        per_application: porCandidato,
      },
      {
        onSuccess: (resultado) => {
          onAviso(
            `${stage.name}: ${resultado.created} correç${resultado.created === 1 ? 'ão' : 'ões'} distribuída${resultado.created === 1 ? '' : 's'}.`,
          )
          onClose()
        },
        onError: (e) => {
          onErro(getApiError(e))
          onClose()
        },
      },
    )
  }

  return (
    <Modal
      title={`Distribuir ${stage.name}`}
      subtitle={`${emAndamento.length} candidato${emAndamento.length === 1 ? '' : 's'} em andamento nesta fase`}
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            onClick={aplicar}
            loading={distribuir.isPending}
            disabled={escolhidos.length < porCandidato}
          >
            Distribuir
          </Button>
        </>
      }
    >
      <div className="space-y-6">
        <label className="flex flex-col gap-1">
          <span className="font-ui text-sm font-medium text-ink/80">
            Avaliadores por candidato
          </span>
          <input
            type="number"
            min={1}
            max={Math.max(escolhidos.length, 1)}
            value={porCandidato}
            onChange={(event) => setPorCandidato(Number(event.target.value) || 1)}
            className="w-24 rounded-xl border border-ink/20 bg-transparent px-3 py-2 font-ui text-sm text-ink focus:border-brand focus:outline-none"
          />
        </label>

        <fieldset>
          <legend className="mb-2 font-ui text-sm font-medium text-ink/80">
            Quem entra no rodízio
          </legend>
          <div className="space-y-2">
            {membros.map((membro) => (
              <label
                key={membro.id}
                className="flex items-center gap-2 font-ui text-sm text-ink"
              >
                <input
                  type="checkbox"
                  checked={escolhidos.includes(membro.user_id)}
                  onChange={() => alternar(membro.user_id)}
                  className="h-4 w-4 accent-brand"
                />
                {membro.full_name || membro.email}
                {membro.is_coordinator && (
                  <span className="font-ui text-xs text-ink/50">(coordenação)</span>
                )}
              </label>
            ))}
          </div>
        </fieldset>

        {escolhidos.length < porCandidato && (
          <p className="font-ui text-sm text-ink/60">
            Marque ao menos {porCandidato} organizador
            {porCandidato === 1 ? '' : 'es'} para dar {porCandidato} correç
            {porCandidato === 1 ? 'ão' : 'ões'} por candidato.
          </p>
        )}

        <p className="rounded-xl border border-ink/10 bg-ink/[0.03] px-3 py-2 font-ui text-xs text-ink/60">
          Entram só os candidatos em andamento nesta fase, cada um com
          avaliadores diferentes e a carga equilibrada entre eles.
          {jaTem
            ? ' Isto substitui a distribuição atual desta fase, sem apagar nota nenhuma.'
            : ''}
        </p>
      </div>
    </Modal>
  )
}
